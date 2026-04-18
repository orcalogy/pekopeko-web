# Restaurant Identity Design

Status: accepted

## Summary

The app needs a stable restaurant identity that works across arbitrary restaurant data sources, survives partial-provider outages, and can be shared by the web and Flutter clients.

The current `restaurantKey` is not suitable for that role. It is an opaque sealed payload with a random IV, so it is intentionally tamper-resistant but not deterministic.

This design introduces a server-side restaurant registry:

- an internal database primary key
- a stable public restaurant id for clients
- per-provider alias rows
- lifecycle handling for closures, rebrands, and tenant changes

This does not require storing user preference data on the server. It only stores normalized place identity and lifecycle data.

## Goals

- Provide one stable cross-platform restaurant identity.
- Avoid depending on any single provider's ids.
- Support merged restaurants from any number of providers.
- Preserve history when a restaurant closes.
- Avoid incorrectly reusing identity when a new restaurant replaces an old one at the same location.
- Let the API use a stable `restaurant_id` instead of `restaurantKey` for long-lived client state.

## Non-Goals

- Server-side user profiles, visits, or recommendation history
- Collaborative filtering
- Perfect automated entity resolution in every ambiguous case
- Full historical warehousing of every provider response

## Core Decision

The canonical restaurant identity is a server-managed establishment record, not a provider id and not a stateless encrypted token.

The model is:

- internal database PK: `id`
- stable public id: `public_id`
- provider aliases: `provider_key + provider_id`

Clients use `public_id` as the canonical restaurant identity.

## Identity Principles

### 1. Identity represents the establishment, not the coordinates

The same restaurant can change hours, menu, rating, photos, or minor name formatting and still keep the same identity.

If one restaurant closes permanently and a different tenant later opens at the same location, the new tenant gets a new identity.

### 2. Provider ids are aliases, not primary keys

Provider ids are evidence that points to the establishment record. None of them own the identity.

### 3. Matching is probabilistic, lifecycle is explicit

Cross-provider equality is inferred from evidence. Once accepted, it becomes an explicit alias relationship in the registry.

## Public API Identity

The API should expose:

- `restaurant_id`: stable public id, for example `rid_01J...`
- `provider_refs`: provider alias list

The API should stop treating `restaurantKey` as the client's canonical identity.

Recommended direction:

- keep `restaurantKey` only as a short-lived compatibility token if needed during migration
- move detail and photo routes to `restaurant_id`

## Data Model

### `provider_sources`

One row per configured provider integration.

```sql
create table provider_sources (
  provider_key text primary key,
  display_name text not null,
  status text not null check (status in ('active', 'disabled', 'deprecated')),
  capability_flags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Notes:

- `provider_key` is open-ended and registry-driven, not a hard-coded enum.
- examples today might include `google_places`, `hotpepper`, `amap`, or future sources.
- `capability_flags` can describe whether the provider supports search, details, photos, closure signals, menus, booking links, and so on.

### `restaurants`

One row per establishment identity.

Suggested columns:

```sql
create table restaurants (
  id bigint generated always as identity primary key,
  public_id text not null unique,
  status text not null check (status in ('active', 'closed', 'superseded')),
  canonical_name text not null,
  canonical_address text,
  lat double precision,
  lng double precision,
  phone text,
  website_url text,
  provider_coverage_keys text[] not null default '{}',
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  closed_at timestamptz,
  superseded_by_restaurant_id bigint references restaurants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Notes:

- `public_id` is the stable id sent to clients.
- `status` models lifecycle.
- `canonical_*` fields are normalized best-known values for search/detail output.
- `provider_coverage_keys` records which providers currently support this restaurant.

### `restaurant_aliases`

One row per provider identity attached to a restaurant.

```sql
create table restaurant_aliases (
  id bigint generated always as identity primary key,
  restaurant_id bigint not null references restaurants(id),
  provider_key text not null references provider_sources(provider_key),
  provider_id text not null,
  status text not null check (status in ('active', 'retired', 'suspect')),
  confidence numeric(5,4) not null,
  valid_from timestamptz not null,
  valid_to timestamptz,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  raw_name text,
  raw_address text,
  raw_phone text,
  raw_website_url text,
  raw_lat double precision,
  raw_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_key, provider_id, valid_to)
);
```

Notes:

- provider ids are subkeys
- alias rows are versioned over time through `valid_to`
- an alias can be retired if the provider id later clearly points to a different tenant

### `restaurant_merge_events`

Optional but strongly recommended for debugging.

```sql
create table restaurant_merge_events (
  id bigint generated always as identity primary key,
  restaurant_id bigint not null references restaurants(id),
  event_type text not null,
  provider_key text,
  provider_id text,
  confidence numeric(5,4),
  reason jsonb,
  created_at timestamptz not null default now()
);
```

Use this for:

- alias attached
- alias retired
- restaurant closed
- restaurant superseded
- ambiguous match rejected

## Matching Strategy

### Exact Alias Hit

If `provider_key + provider_id` already exists as an active alias, use that restaurant immediately.

This is the normal steady-state path.

### Candidate Matching

If no exact alias exists, search for candidate restaurants nearby and score them.

Use a confidence ladder:

1. phone exact match
2. official website exact or normalized-host match
3. normalized name similarity
4. normalized address similarity
5. geographic distance
6. provider-specific hints such as branch names, mall/floor markers, merchant urls, or closure metadata

Suggested matching behavior:

- high confidence: attach alias to existing restaurant
- low confidence: create a new restaurant
- ambiguous middle band: prefer creating a new restaurant unless later evidence resolves it

Conservative false negatives are better than false positive merges.

### Provider-Specific Heuristics

The current code has one concrete example of cross-source merge logic: Google and HotPepper are merged by coordinate proximity under 80m in [src/lib/map/merge.ts](/home/x17/code_repo/pekopeko/src/lib/map/merge.ts:13).

That is acceptable as one provider-specific heuristic, but the design should not assume a fixed provider set or a single pairwise merge rule. Each provider adapter may contribute its own evidence into the same registry-level matching pipeline.

## Provider Adapter Contract

Every source integration should normalize into the same alias-observation shape:

```ts
type ProviderAliasObservation = {
  providerKey: string;
  providerId: string;
  rawName?: string;
  rawAddress?: string;
  rawPhone?: string;
  rawWebsiteUrl?: string;
  rawLat?: number;
  rawLng?: number;
  closureSignal?: 'active' | 'temporarily_closed' | 'permanently_closed' | 'unknown';
  metadata?: Record<string, unknown>;
};
```

The registry only relies on this normalized shape plus provider capability metadata. It must not special-case today's providers in the core schema.

## Lifecycle Rules

### Minor Change

Keep the same restaurant identity when the establishment is clearly the same and only these changed:

- hours
- menu
- photos
- rating
- minor rename
- small address normalization

### Rebrand With Strong Continuity

Usually keep the same identity if continuity is strong, for example:

- same provider alias continuity
- same phone
- same official website
- same operator signals

Record the rename in canonical fields and emit a merge event.

### Permanently Closed

If a provider indicates permanent closure or repeated absence confirms closure:

- mark `restaurants.status = 'closed'`
- set `closed_at`
- retire or mark aliases as inactive if appropriate

Closed restaurants remain in the registry so old client history still points to something meaningful.

### New Tenant Replacing Old Restaurant

If a different establishment appears at the same coordinates:

- create a new restaurant row
- do not reuse the old `public_id`
- mark the old restaurant `closed` or `superseded`
- attach the new provider aliases to the new restaurant

This is the key rule that prevents preference history from transferring to the wrong business.

### Provider Alias Drift

If a provider alias starts pointing to what appears to be a new tenant:

- retire the old alias row with `valid_to`
- create or attach a new alias row to the new restaurant
- log a merge event explaining the split

## Public ID Format

Use an opaque stable public id for clients.

Recommended:

- internal PK: numeric identity column
- public id: `rid_<ulid>` or another opaque stable text id

Do not expose the raw integer PK as the public API identity.

## API Contract

### Search Response

Each restaurant result should include:

```json
{
  "restaurant_id": "rid_01J...",
  "name": "...",
  "provider_refs": [
    { "provider_key": "provider_a", "provider_id": "..." },
    { "provider_key": "provider_b", "provider_id": "..." }
  ]
}
```

### Detail Route

Preferred final shape:

- `GET /api/v1/restaurants/:restaurantId`

### Photo Route

Preferred final shape:

- `GET /api/v1/restaurants/:restaurantId/photo`

The server resolves the current best photo source from registry state and provider aliases.

## Client Contract

Web and Flutter should store:

- `restaurant_id` as the canonical recommendation identity
- provider ids only as optional debugging or migration metadata

They should not use:

- provider-local `id`
- encrypted `restaurantKey`

## Migration Plan

### Phase 1: Add Registry

- create `restaurants`
- create `restaurant_aliases`
- backfill from current search results and detail fetches

### Phase 2: Resolve Search Results Through Registry

During search normalization:

1. build provider alias observations
2. resolve or create restaurant registry row
3. emit `restaurant_id` with every result

### Phase 3: Dual-Read API

Temporarily expose both:

- `restaurant_id`
- existing `restaurantKey`

Clients begin switching local state to `restaurant_id`.

### Phase 4: Move Detail And Photo To `restaurant_id`

Stop using stateless encrypted tokens as the canonical lookup mechanism.

### Phase 5: Deprecate `restaurantKey`

Keep only if needed for temporary compatibility. It should no longer be treated as stable identity anywhere in product logic.

## Recommendation Impact

This design supersedes the earlier idea of using `restaurantKey` as the canonical recommendation identity.

Once `restaurant_id` exists:

- web recommendation stores should migrate to `restaurant_id`
- Flutter should use the same `restaurant_id`
- explicit feedback and visit history remain client-local

This preserves the no-user-data-on-server rule while fixing identity stability.

## Operational Notes

- identity merges need logging and observability
- ambiguous matches should prefer creating a new restaurant over merging
- closure and supersession events must be queryable for debugging
- manual repair tooling will eventually be useful for bad merges or splits

## Final Decision

Use a server-side restaurant registry with:

- internal PK as the true primary key
- opaque stable `restaurant_id` as the public identity
- provider ids as alias subkeys
- open-ended provider registration instead of a hard-coded provider enum
- explicit lifecycle handling for closure, supersession, and tenant replacement

Do not use any single provider's id as the canonical app identity.
Do not use `restaurantKey` as the canonical app identity.
