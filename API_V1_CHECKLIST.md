# PekoPeko API V1 Freeze Checklist

Status: working checklist for freezing `/api/v1`

This checklist is for deciding when the current API and restaurant-registry schema are ready to freeze as `v1`.

`v1` does not need to be perfect. It does need to be explicit, reproducible, and something we can support without surprising client teams later.

## Status Snapshot

As of 2026-04-23, the runtime is ahead of the freeze documentation.

- The strongest remaining freeze risks are contract decisions and documentation alignment, not the core API architecture.
- The highest-risk unresolved items are:
  cursor design,
  the remaining supersession-integrity decision,
  and documenting the final client-facing capabilities/usage story.
- The moved/closed restaurant contract, freshness metadata, and the live DB-backed registry test are now in good shape.

## Must Finish Before V1 Freeze

### Contract Decisions

- [ ] Decide whether the current cursor model is acceptable for `v1`.
  Current state:
  `src/lib/api/search-cursor.ts` stores the full ordered result set in the opaque cursor.
  The cursor is base64url JSON, client-readable, client-modifiable, unsigned, and currently has no explicit size bound.
  Freeze decision:
  either accept this as the official `v1` pagination model and document its tradeoffs, or replace it with a server-backed/pointer cursor before freeze.

- [x] Freeze the runtime semantics of moved and closed restaurants.
  Current state:
  `404 not_found` can include `restaurantKey`, `movedToRestaurantKey`, and `state: "closed"`.
  Runtime status:
  implemented.
  Freeze decision:
  confirm that `404` is the permanent contract for both moved and closed records, and document exact client behavior for each case.

- [x] Add explicit OpenAPI examples for moved and closed restaurant lookups.
  Current state:
  the schema types `movedToRestaurantKey` and `state: "closed"`, but there are no concrete response examples in `openapi/pekopeko-api.yaml`.

- [x] Decide whether `provider` override is a supported public feature or a debug lever.
  Current state:
  `RestaurantSearchRequest.provider` accepts `auto`, `google`, `hotpepper`, and `amap`.
  Runtime status:
  overrides are distinguished with `resolved.strategy: "manual_override"`, but the contract/docs do not label them as unstable or debug-only.
  Freeze decision:
  either keep it as public contract, narrow it, or clearly mark non-`auto` modes as unstable/debug-only before freezing the schema.
  Resolution:
  all four modes remain supported in `v1`, with `auto` as the recommended default.

- [ ] Freeze the capabilities surface as the source of client truth.
  Current state:
  `/api/v1/capabilities` publishes enums, category metadata, and pagination mode.
  Runtime status:
  largely implemented.
  Freeze decision:
  confirm that clients should rely on capabilities for runtime behavior instead of hardcoding provider/search assumptions.

- [x] Decide whether detail freshness states belong in `/api/v1/capabilities`.
  Current state:
  `live`, `partial_live`, and `snapshot` are defined in the OpenAPI schema and returned by details, but capabilities do not publish them.
  Freeze decision:
  either keep freshness states as a route-local response contract, or expose/document them as part of the client capability surface.
  Resolution:
  capabilities now publish `details.freshnessStates`.

### Error Surface

- [x] Add concrete examples for every non-trivial error case in `openapi/pekopeko-api.yaml`.
  Include at least:
  invalid field,
  invalid cursor,
  restaurant moved,
  restaurant closed,
  rate limited,
  upstream provider unavailable.
  Status:
  implemented for the required invalid field, invalid cursor, moved, closed, rate limited, and upstream provider unavailable cases.

- [x] Decide whether `429` is a server-enforced contract or only an upstream passthrough surface.
  Current state:
  the schema exposes `429`, `rate_limited`, `quota_exhausted`, and `Retry-After`.
  Runtime status:
  `Retry-After` is emitted if an error carries `retryAfterSeconds`, but there is no general local rate-limiting middleware today.
  Freeze decision:
  if `v1` promises local rate limiting, the implementation and tests should cover it; otherwise document or trim the contract so `429` is clearly only for upstream quota/rate-limit passthrough.
  Resolution:
  `429` remains part of `v1`, documented primarily as upstream quota/rate-limit passthrough unless local rate limiting is added later.

- [x] Align `API_DESIGN.md` and any rate-limit docs with the chosen `429` story.
  Current state:
  the design doc still talks about stronger rate-limiting behavior than the runtime currently provides.

### Database Invariants

- [x] Enforce alias confidence range at the database level.
  Current state:
  `RestaurantAlias.confidence` is documented as `[0, 1]` in `prisma/schema.prisma`, but the migration does not enforce it.
  Freeze decision:
  add a DB check constraint or explicitly downgrade this to an application-only invariant.

- [x] Enforce at least no self-supersession at the database level.
  Current state:
  `supersededById` has a foreign key, but nothing stops `A -> A`.
  Freeze decision:
  add a DB check constraint or explicitly document that the DB allows it and the app is responsible for prevention.

- [ ] Decide how much supersession integrity `v1` guarantees.
  Current state:
  the app resolves chains to the terminal key, but cycles are only handled defensively at read time.
  Freeze decision:
  either keep application-level cycle avoidance as the design, or add stronger write-time protection before freeze.
  Likely resolution:
  application-level cycle defense is acceptable for `v1` if that decision is written down clearly.

- [ ] Decide whether the current `lat/lng` indexing is enough for `v1`.
  Current state:
  there is a composite `(lat, lng)` index, but no true spatial type/index.
  Freeze decision:
  if the registry is cache/identity only for `v1`, this is fine; if local nearby search from the DB is part of `v1`, this is not enough.

### Snapshot Policy

- [x] Freeze the role of `lastSnapshotJson` and `lastPhotoPayloadJson`.
  Current state:
  they are validated on read by app-side runtime guards.
  Runtime status:
  when all live detail refreshes fail, the API can fall back to the latest stored snapshot.
  Freeze decision:
  confirm that `v1` intentionally stores only the latest snapshot, not history, and define when stale snapshots may be served.

- [x] Define the detail freshness contract in client terms.
  Current state:
  detail responses expose `live`, `partial_live`, and `snapshot`.
  Freeze decision:
  document what each state means for UI trust, refresh actions, and caching.
  Minimum definitions to write down:
  `live` = all detail refreshes needed for the returned payload succeeded,
  `partial_live` = at least one live refresh succeeded but some upstream detail data is missing/stale,
  `snapshot` = no live detail refresh succeeded and the response is served from stored snapshot data.

- [x] Add concrete detail-response examples for `live`, `partial_live`, and `snapshot`.
  Current state:
  the contract types freshness states, but there are no examples showing `live`, `partial_live`, and `snapshot` detail responses.

## Strongly Recommended Before V1 Freeze

### Testing and Verification

- [ ] Add golden API examples for search, details, moved, closed, and photo proxy responses.
- [x] Keep one live DB-backed integration test for registry identity resolution and supersession traversal.
- [ ] Add one end-to-end smoke test per provider plan:
  Google-only,
  Japan hybrid,
  Amap-only.
  Current state:
  README has manual `curl` verification steps, but there are no automated smoke tests.
- [ ] Add contract tests that generated TypeScript client types still round-trip against the live route serializers.

### Documentation

- [ ] Update `API_DESIGN.md` so it no longer describes already-rejected or ambiguous shapes.
  Review focus:
  remove or rewrite the public `id` example, old `page_token` pagination language, outdated rate-limit promises, and any other shapes that contradict the current OpenAPI contract.
- [ ] Add a short client guide describing:
  when to call search vs details,
  how to continue pagination,
  how to handle `404` moved/closed cases,
  how to use capabilities.
- [ ] Add operational notes for resetting and re-seeding the restaurant registry in dev.

### Runtime Hardening

- [ ] Decide whether cursors should be signed.
  Current state:
  cursors are opaque but client-readable and client-modifiable.
  This may be acceptable for `v1`, but it should be a conscious decision.
  Low-effort hardening path:
  HMAC-sign the serialized cursor payload if snapshot-in-cursor is kept.

- [ ] Define maximum acceptable cursor size and search result size.
  Current state:
  larger result sets create larger cursor payloads.
  Freeze decision:
  set a practical upper bound and test it.

- [ ] Confirm photo caching behavior end to end.
  The contract now exposes `Cache-Control` and actual `Content-Type`; verify the runtime behavior matches the documented intent.
  Current state:
  caching headers are set, but there is no integration test proving the end-to-end response shape.

## Safe To Defer Until After V1 Freeze

- [ ] PostGIS or true geospatial indexing.
- [ ] Historical snapshot/version tables.
- [ ] Admin workflows for alias review, suspect resolution, or manual merge/supersession repair.
- [ ] Provider-agnostic merge/audit event history.
- [ ] Cursor redesign for very large result sets, if current usage stays small.

## Suggested Freeze Gate

Treat `v1` as ready to freeze when all of these are true:

- [ ] OpenAPI contract is validated and generated clients are up to date.
- [ ] All "Must Finish Before V1 Freeze" items are resolved or consciously downgraded with written rationale.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm check` passes.
- [ ] The live DB registry test passes.
- [ ] At least one real search smoke test has been run for each provider plan that `v1` claims to support.

## Recommended Call Right Now

If we wanted to freeze soon, these are the highest-value remaining blockers:

- [ ] Decide whether snapshot-in-cursor pagination is the real `v1` design, and if yes, document its unsigned/size-bounded behavior.
- [ ] Decide how much supersession-integrity protection `v1` needs beyond read-time cycle defense.
- [ ] Freeze the capabilities/client-truth story and write the short client guide.
- [ ] Decide whether to add cursor signing and a practical cursor-size bound before freeze.
- [ ] Update the older design docs so they stop contradicting the current `v1`.
