# PekoPeko API V1 Freeze Checklist

Status: working checklist for freezing `/api/v1`

This checklist is for deciding when the current API and restaurant-registry schema are ready to freeze as `v1`.

`v1` does not need to be perfect. It does need to be explicit, reproducible, and something we can support without surprising client teams later.

## Status Snapshot

As of 2026-04-23, the runtime is ahead of the freeze documentation.

- The strongest remaining freeze risks are verification and documentation alignment, not the core
  API architecture.
- The highest-value unresolved items are:
  golden response examples,
  provider-plan smoke tests,
  contract round-trip coverage,
  and photo caching verification.
- The moved/closed restaurant contract, freshness metadata, and the live DB-backed registry test are now in good shape.

## Must Finish Before V1 Freeze

### Contract Decisions

- [x] Decide whether the current cursor model is acceptable for `v1`.
  Current state:
  `src/lib/api/search-cursor.ts` now signs short-lived continuation tokens that point to a stored
  `SearchSession` snapshot in Postgres.
  Freeze decision:
  replace the old fat cursor with a server-backed pointer cursor before freeze.
  Resolution:
  `v1` uses signed server-backed cursors with a 30-minute TTL, parser-enforced cursor-only
  follow-up requests, and a 512 KB `resultsJson` bound.

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

- [x] Freeze the capabilities surface as the source of client truth.
  Current state:
  `/api/v1/capabilities` publishes enums, category metadata, and pagination mode.
  Runtime status:
  largely implemented.
  Freeze decision:
  confirm that clients should rely on capabilities for runtime behavior instead of hardcoding provider/search assumptions.
  Resolution:
  `GET /api/v1/capabilities` is the runtime source of truth for provider modes, pagination mode,
  required feature enums, and detail freshness states.

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

- [x] Align the active API docs and any rate-limit notes with the chosen `429` story.
  Current state:
  the remaining contract-facing docs now describe `429` primarily as upstream quota/rate-limit passthrough unless local rate limiting is added later.

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

- [x] Decide how much supersession integrity `v1` guarantees.
  Current state:
  the app resolves chains to the terminal key, but cycles are only handled defensively at read time.
  Freeze decision:
  either keep application-level cycle avoidance as the design, or add stronger write-time protection before freeze.
  Resolution:
  `v1` guarantees no self-supersession at the DB layer and application-level cycle defense at read
  time. Stronger transactional graph-cycle prevention is deferred.

- [x] Decide whether the current `lat/lng` indexing is enough for `v1`.
  Current state:
  there is a composite `(lat, lng)` index, but no true spatial type/index.
  Freeze decision:
  if the registry is cache/identity only for `v1`, this is fine; if local nearby search from the DB is part of `v1`, this is not enough.
  Resolution:
  the registry remains cache/identity focused for `v1`, so the current composite `(lat, lng)` index
  is sufficient and PostGIS stays post-`v1`.

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

- [x] Remove obsolete companion design notes that contradicted the current OpenAPI contract.
  Review focus:
  keep `README.md`, `API_CLIENT_GUIDE.md`, and `openapi/pekopeko-api.yaml` as the active contract-facing references.
- [x] Add a short client guide describing:
  when to call search vs details,
  how to continue pagination,
  how to handle `404` moved/closed cases,
  how to use capabilities.
- [ ] Add operational notes for resetting and re-seeding the restaurant registry in dev.

### Runtime Hardening

- [x] Decide whether cursors should be signed.
  Current state:
  cursors are now HMAC-SHA256-signed server-backed continuation tokens.

- [x] Define maximum acceptable cursor size and search result size.
  Current state:
  the cursor token is now short and session-backed, while the stored `resultsJson` snapshot has a
  hard size bound.
  Freeze decision:
  set a practical upper bound and test it.
  Resolution:
  `resultsJson` is capped at 512 KB and oversized snapshots fail fast rather than silently
  truncating pagination data.

- [ ] Confirm photo caching behavior end to end.
  The contract now exposes `Cache-Control` and actual `Content-Type`; verify the runtime behavior matches the documented intent.
  Current state:
  caching headers are set, but there is no integration test proving the end-to-end response shape.

## Safe To Defer Until After V1 Freeze

- [ ] PostGIS or true geospatial indexing.
- [ ] Historical snapshot/version tables.
- [ ] Admin workflows for alias review, suspect resolution, or manual merge/supersession repair.
- [ ] Provider-agnostic merge/audit event history.
- [ ] Further pagination redesign for very large result sets, if the current session-backed model
  ever becomes too large or too expensive.

## Suggested Freeze Gate

Treat `v1` as ready to freeze when all of these are true:

- [ ] OpenAPI contract is validated and generated clients are up to date.
- [ ] All "Must Finish Before V1 Freeze" items are resolved or consciously downgraded with written rationale.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm check` passes.
- [ ] The live DB registry and search-session tests pass.
- [ ] At least one real search smoke test has been run for each provider plan that `v1` claims to support.

## Recommended Call Right Now

If we wanted to freeze soon, these are the highest-value remaining blockers:

- [ ] Add golden response examples for the core success paths.
- [ ] Add one real smoke test run for each supported provider plan.
- [ ] Add contract round-trip coverage between generated client types and live serializers.
- [ ] Add dedicated operational notes for dev registry reset/reseed flows.
- [ ] Confirm photo caching behavior end to end.
