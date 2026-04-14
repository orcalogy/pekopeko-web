# PekoPeko Restaurant Backend API Design

## Status

- Audience: the agent implementing the backend in `~/code_repo/pekopeko`
- Scope: restaurant search, region detection, media proxying, and backend capability discovery
- Goal: provide one stable API for the Next.js web app and the Flutter mobile app while keeping provider keys server-side
- Phase 1 implementation target in this repo:
  - `GET /api/v1/health`
  - `GET /api/v1/capabilities`
  - `POST /api/v1/geo/reverse`
  - `POST /api/v1/restaurants/search`
  - `GET /api/v1/restaurants/:restaurantKey`
  - `GET /api/v1/restaurants/:restaurantKey/photo`
  - compatibility adapters for `/api/geocode/reverse`, `/api/places/nearby`, and `/api/places/photo`
- Phase 2 follow-up:
  - rate limiting
  - upstream/result caching
  - automated tests for merge/filter semantics

This document is intentionally stricter and more complete than the current ad hoc `/api/places/*` and `/api/geocode/*` routes. The existing routes should become compatibility adapters over this design rather than remaining the long-term contract.

## Goals

- Keep Google Places, HotPepper, and Amap keys server-side only.
- Expose one normalized restaurant model across providers.
- Preserve current product behavior:
  - China uses Amap
  - Japan uses HotPepper + Google merged when both are available
  - other regions use Google Places
  - locale-aware place data where providers support it
  - `open now` means filter out only explicit `false`, not unknown
- Support both current Next.js clients and the Flutter app.
- Add versioning, consistent errors, request IDs, caching semantics, and room for future detail endpoints.

## Non-Goals

- User accounts
- Server-side storage of visited restaurants or user preferences
- General geocoding beyond the app’s region/provider decision needs
- Fully exposing raw upstream provider payloads

## High-Level Architecture

The backend should expose versioned routes under `/api/v1`.

Canonical public routes:

- `GET /api/v1/health`
- `GET /api/v1/capabilities`
- `POST /api/v1/geo/reverse`
- `POST /api/v1/restaurants/search`
- `GET /api/v1/restaurants/:restaurantKey`
- `GET /api/v1/restaurants/:restaurantKey/photo`

Compatibility routes to keep during migration:

- `GET /api/geocode/reverse` -> adapter over `POST /api/v1/geo/reverse`
- `GET /api/places/nearby` -> adapter over `POST /api/v1/restaurants/search`
- `GET /api/places/photo` -> adapter over `GET /api/v1/restaurants/:restaurantKey/photo` or internal photo fetch helpers

## Common Conventions

### Versioning

- Version in the path: `/api/v1/...`
- Backward-incompatible changes require `/api/v2/...`
- Additive changes within `v1` are allowed

### Content Type

- Request: `application/json`
- Response: `application/json; charset=utf-8`
- Image responses use upstream image content type

### Headers

Responses should include:

- `X-Request-Id`: backend-generated UUID or equivalent
- `Cache-Control`: endpoint-specific, described below

Recommended request headers:

- `Accept-Language`: optional fallback when `locale` is omitted
- `X-Client-Platform`: `web`, `android`, `ios`
- `X-App-Version`: client app version

### Locale

Supported locales:

- `zh-CN`
- `ja`
- `en`

Google language mapping:

- `zh-CN` -> `zh-CN`
- `ja` -> `ja`
- `en` -> `en`

HotPepper data is fundamentally Japanese-first. The normalized API should still return it as-is when no translated upstream value exists.

### Provider Enums

Provider enums in normalized responses:

- `google`
- `amap`
- `hotpepper`
- `hybrid`

Provider selection modes in requests:

- `auto`
- `google`
- `amap`
- `hotpepper`

`hybrid` is a response/source concept, not a client-request override.

### Error Envelope

All non-2xx JSON responses should use this shape:

```json
{
  "error": {
    "code": "invalid_argument",
    "message": "radius_m must be between 100 and 10000",
    "request_id": "8c74f5d8-5c36-4f95-bf17-2fd4c55b2e79",
    "details": {
      "field": "radius_m"
    }
  }
}
```

Standard error codes:

- `invalid_argument`
- `not_found`
- `rate_limited`
- `provider_unavailable`
- `quota_exhausted`
- `upstream_error`
- `internal`

Suggested status mapping:

- `400` -> `invalid_argument`
- `404` -> `not_found`
- `429` -> `rate_limited`
- `502` -> `upstream_error`
- `503` -> `provider_unavailable` or `quota_exhausted`
- `500` -> `internal`

### Partial Success

Japan can be partially successful if one upstream provider fails and the other still returns usable results.

Search responses should include:

- `partial_results: boolean`
- `warnings: string[]`

Example:

```json
{
  "partial_results": true,
  "warnings": [
    "google provider failed; returning HotPepper-only results"
  ]
}
```

## Normalized Domain Model

The normalized `Restaurant` payload must stay compatible with the existing `src/types/restaurant.ts` fields, while adding a few backend-oriented fields needed for future detail/media routes.

```json
{
  "restaurant_key": "rest_v1_g_ChIJ4zGFAZpYwokRGUGph3Mf37k",
  "id": "ChIJ4zGFAZpYwokRGUGph3Mf37k",
  "name": "Example Ramen",
  "address": "1-2-3 Shibuya, Tokyo",
  "lat": 35.6595,
  "lng": 139.7005,
  "distance": 320,
  "rating": 4.4,
  "priceLevel": 2,
  "isOpenNow": true,
  "openingHours": ["Mon-Sun 11:30-23:00"],
  "cuisineType": "Ramen",
  "photoUrl": "/api/v1/restaurants/rest_v1_g_ChIJ4zGFAZpYwokRGUGph3Mf37k/photo?max_width=800",
  "phone": "+81-3-1234-5678",
  "placeUrl": "https://www.google.com/maps/dir/?api=1&destination=Example%20Ramen&destination_place_id=ChIJ4zGFAZpYwokRGUGph3Mf37k",
  "detailUrl": "https://www.hotpepper.jp/strJ001234567/",
  "couponUrl": "https://www.hotpepper.jp/strJ001234567/map/",
  "accessInfo": "渋谷駅徒歩5分",
  "budgetText": "3000～4000円",
  "capacity": 28,
  "features": ["wifi", "non_smoking", "card"],
  "menuUrl": "https://www.hotpepper.jp/strJ001234567/food/",
  "websiteUrl": "https://example-ramen.jp",
  "source": "hybrid",
  "provider_refs": [
    {
      "provider": "google",
      "provider_id": "ChIJ4zGFAZpYwokRGUGph3Mf37k"
    },
    {
      "provider": "hotpepper",
      "provider_id": "J001234567"
    }
  ]
}
```

Field notes:

- `restaurant_key` is an opaque backend-owned key for future details/media routes.
- phase 1 implementation note:
  - the key currently carries provider refs plus a normalized fallback snapshot so the details endpoint can still resolve when a provider refresh is temporarily unavailable
- `id` remains the compatibility field expected by the current frontend. For merged results it should be the Google id when present, otherwise the primary provider id.
- `distance` is meters from the user-supplied search origin.
- `priceLevel` uses the existing normalized 0-4 scale where available.
- `photoUrl` must be client-consumable without exposing upstream secrets.
- `provider_refs` is additive and new; it should not break old clients.

## Endpoint Design

### 1. `GET /api/v1/health`

Purpose:

- fast liveness/readiness check

Response:

```json
{
  "status": "ok",
  "time": "2026-04-14T08:15:30.000Z",
  "version": "v1"
}
```

Cache:

- `Cache-Control: no-store`

### 2. `GET /api/v1/capabilities`

Purpose:

- tell clients which providers and features are configured
- expose search limits without hard-coding them in every client

Response:

```json
{
  "version": "v1",
  "locales": ["zh-CN", "ja", "en"],
  "radius_presets_m": [300, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000],
  "providers": {
    "google": {
      "configured": true
    },
    "hotpepper": {
      "configured": true
    },
    "amap": {
      "configured": true
    }
  },
  "search": {
    "default_radius_m": 2000,
    "min_radius_m": 100,
    "max_radius_m": 10000,
    "default_page_size": 20,
    "max_page_size": 40
  }
}
```

Cache:

- `Cache-Control: public, max-age=300, s-maxage=300`

### 3. `POST /api/v1/geo/reverse`

Purpose:

- resolve country and provider plan from coordinates

Request:

```json
{
  "lat": 35.6595,
  "lng": 139.7005,
  "locale": "ja"
}
```

Response:

```json
{
  "country": "JP",
  "provider": "hotpepper",
  "provider_plan": ["hotpepper", "google"],
  "strategy": "hybrid_japan",
  "confidence": "high"
}
```

Response fields:

- `provider` preserves the current coarse primary provider behavior expected by the existing app, but it must always be a configured and actually usable backend
- `provider_plan` is the real execution plan the search endpoint should use
- `strategy` values:
  - `china_amap`
  - `hybrid_japan`
  - `google_global`
  - `fallback_heuristic`
  - `manual_override`
- `confidence` values:
  - `high`
  - `medium`
  - `low`

Resolution rules:

1. If the coordinates look like China and Amap is configured, verify with Amap reverse geocode.
2. Otherwise, if Google is configured, use Google reverse geocode to determine country.
3. If upstream reverse geocode fails, use coordinate heuristics:
   - China bounds -> `CN`, `amap`
   - Japan bounds -> `JP`, `hotpepper` with `provider_plan: ["hotpepper", "google"]` when Google is configured
   - otherwise -> `UNKNOWN`, `google`
4. If the region-preferred provider is not configured, fall back to the next usable provider instead of returning an unusable plan. Examples:
   - `CN` without Amap but with Google -> `provider: "google"`
   - `JP` without HotPepper but with Google -> `provider: "google"`
5. Compatibility responses for the existing web client must follow the same usable-provider rule, otherwise the client can be told to call a provider route that is guaranteed to fail.

Validation:

- `lat` required, `-90 <= lat <= 90`
- `lng` required, `-180 <= lng <= 180`

Cache:

- `Cache-Control: public, max-age=3600, s-maxage=3600`

### 4. `POST /api/v1/restaurants/search`

Purpose:

- canonical nearby search endpoint for web and mobile

Request:

```json
{
  "locale": "ja",
  "provider": "auto",
  "location": {
    "lat": 35.6595,
    "lng": 139.7005
  },
  "radius_m": 2000,
  "query": {
    "keyword": "ramen",
    "category_id": "noodles"
  },
  "filters": {
    "open_now": true,
    "min_rating": 4.0,
    "max_price_level": 2,
    "party_size": 2,
    "required_features": ["non_smoking", "card"]
  },
  "sort": {
    "by": "distance",
    "direction": "asc"
  },
  "pagination": {
    "page_size": 20,
    "page_token": null
  }
}
```

Request rules:

- `provider` default is `auto`
- `radius_m` default is `2000`
- `query.keyword` is free text; backend may append provider-specific food/place terms when needed
- `query.category_id` is an app-level semantic/category hint; backend may translate it into provider-friendly keyword terms
- `filters.open_now` uses current product semantics: keep items where `isOpenNow !== false`
- `filters.min_rating`, `filters.max_price_level`, `filters.party_size`, and `filters.required_features` are backend-side normalized filters after provider fetch
- `sort.by` values:
  - `distance`
  - `rating`
- `pagination.page_token` in phase 1 is an opaque offset token generated by the backend after normalized filtering/sorting; it is not a raw upstream provider page token

Provider plan rules:

- `provider=auto`
  - call geo resolver or inline the same logic
  - China -> Amap
  - Japan -> HotPepper and Google in parallel when both are configured
  - elsewhere -> Google
- `provider=hotpepper`
  - in Japan, still allow Google enrichment if configured
- `provider=google`
  - use Google only
- `provider=amap`
  - use Amap only
- explicit provider overrides should return `resolved.strategy: "manual_override"`

Search execution rules:

1. Resolve provider plan.
2. Query upstream providers.
3. Normalize all results to the shared `Restaurant` model.
4. In Japan, merge Google and HotPepper results by coordinate proximity under 80 meters.
5. Apply normalized filters:
   - `open_now`: remove only `isOpenNow === false`
   - `min_rating`
   - `max_price_level`
   - `party_size`
   - `required_features`
6. Sort and paginate.
7. Return stable `restaurant_key` values for each result.

Response:

```json
{
  "request_id": "ef93b0dd-7bf5-4336-8be4-8862d1ea3ad8",
  "resolved": {
    "country": "JP",
    "provider": "hotpepper",
    "provider_plan": ["hotpepper", "google"],
    "strategy": "hybrid_japan"
  },
  "applied_filters": {
    "open_now": true,
    "min_rating": 4.0,
    "max_price_level": 2,
    "party_size": 2,
    "required_features": ["non_smoking", "card"],
    "sort_by": "distance"
  },
  "partial_results": false,
  "warnings": [],
  "results": [],
  "pagination": {
    "page_size": 20,
    "next_page_token": null,
    "returned": 0
  },
  "provider_stats": [
    {
      "provider": "hotpepper",
      "raw_results": 42,
      "normalized_results": 42
    },
    {
      "provider": "google",
      "raw_results": 27,
      "normalized_results": 27
    }
  ]
}
```

Validation:

- `location.lat` required
- `location.lng` required
- `100 <= radius_m <= 10000`
- `0 <= filters.min_rating <= 5`
- `0 <= filters.max_price_level <= 4`
- `1 <= filters.party_size <= 50`
- `1 <= pagination.page_size <= 40`

Cache:

- `Cache-Control: no-store` for the JSON response
- provider-level internal caching is recommended and described below

Implementation notes by provider:

- Google:
  - keyword searches should use `places:searchText`
  - non-keyword searches should use `places:searchNearby` plus a supplemental `places:searchText` pass, matching current behavior
  - second-page token fetch is allowed for keyword search to reach up to 40 results
- HotPepper:
  - convert radius meters to range code
  - normalize budget to 1-4
  - derive `isOpenNow` conservatively from closing-day data when possible
- Amap:
  - use around search with catering category
  - map cost/rating/opening time fields conservatively
  - `isOpenNow` is usually unknown

### 5. `GET /api/v1/restaurants/:restaurantKey`

Purpose:

- future-safe lookup/details route for a restaurant returned by search
- lets clients refresh details without understanding provider-specific ids

Path parameters:

- `restaurantKey`: opaque key from search results

Query parameters:

- `locale`

Response:

- full normalized `Restaurant`
- may include additive fields later such as `photos`, `provider_metadata`, or `last_refreshed_at`

Behavior:

- if the key represents a merged result, refetch or rehydrate from the base provider and merge enrichment fields again
- if the key cannot be resolved, return `404 not_found`
- phase 1 implementation note:
  - the backend now attempts provider-specific detail refresh by `provider_refs`
  - if refresh fails but the `restaurant_key` carries an embedded normalized snapshot, return that snapshot instead of failing
  - refreshed responses may return a newly re-encoded `restaurant_key` that preserves the latest normalized snapshot and photo metadata

Cache:

- `Cache-Control: public, max-age=300, s-maxage=300`

### 6. `GET /api/v1/restaurants/:restaurantKey/photo`

Purpose:

- canonical photo/media endpoint
- keep all photo access backend-mediated

Query parameters:

- `max_width` optional, default `800`, clamp to `100..1600`

Behavior:

- resolve the primary provider photo reference from `restaurantKey`
- for Google, fetch `v1/{photoRef}/media` with server key and stream the bytes
- for HotPepper or Amap, either proxy the upstream image or redirect to a cached backend URL
- return an image response, not JSON, on success

Response headers:

- `Content-Type: image/jpeg` or actual upstream content type
- `Cache-Control: public, max-age=86400, s-maxage=86400`

Fallback behavior:

- if no photo exists, return `404 not_found`

## Compatibility Mapping for the Existing App

The original project can keep its current frontend code initially by implementing adapters like this:

### `GET /api/geocode/reverse`

Incoming query:

- `lat`
- `lng`

Adapter behavior:

- call `POST /api/v1/geo/reverse`
- return only:

```json
{
  "country": "JP",
  "provider": "hotpepper"
}
```

### `GET /api/places/nearby`

Incoming query:

- `provider`
- `lat`
- `lng`
- `radius`
- `keyword`
- `openNow`
- `locale`

Adapter behavior:

- map `provider` to `provider` or `auto`
- map `radius` to `radius_m`
- map `openNow=true` to `filters.open_now=true`
- call `POST /api/v1/restaurants/search`
- return only `results`

### `GET /api/places/photo`

Incoming query:

- `ref`
- `maxWidth`

Adapter behavior:

- either continue to support this raw compatibility path internally
- or translate the app so it consumes normalized `photoUrl` from the search response and stops constructing photo requests itself

## Search and Merge Semantics

### Japan Merge Rules

When both Google and HotPepper are available in Japan:

1. Match results by haversine distance under 80 meters.
2. Use Google as the base for:
   - id
   - rating
   - real-time `isOpenNow`
   - phone
   - better navigation URL
3. Enrich from HotPepper:
   - `detailUrl`
   - `couponUrl`
   - `accessInfo`
   - `budgetText`
   - `capacity`
   - `features`
   - `menuUrl`
4. Prefer Google photo/hours/cuisine when present; otherwise fall back to HotPepper.
5. Mark merged records as `source: "hybrid"`.

### `open_now` Semantics

This must match the current source app:

- If `open_now=false` or omitted, do not filter on open state.
- If `open_now=true`, keep records where:
  - `isOpenNow === true`
  - `isOpenNow === undefined`
- Remove only records where `isOpenNow === false`.

This matters because Amap and some HotPepper results do not have reliable real-time open state.

## Rate Limiting and Abuse Controls

No user auth is required, but the backend should still protect itself.

Recommended limits:

- `geo/reverse`: 120 requests per minute per IP
- `restaurants/search`: 60 requests per minute per IP
- `restaurant photo`: 300 requests per minute per IP

Recommended controls:

- per-IP rate limiting
- request logging with request ID and provider stats
- provider timeout budgets
- coarse caching to cut upstream costs
- optional allowlist or lightweight application token later if abuse appears

## Internal Caching Recommendations

Do not cache final JSON search responses too aggressively, but do cache upstream work.

Recommended internal caches:

- reverse geocode:
  - key by rounded coordinates or geohash
  - TTL 1 hour to 24 hours
- nearby search:
  - key by provider, locale, radius bucket, keyword, and rounded coordinates
  - TTL 30 to 120 seconds
- photo proxy:
  - TTL 24 hours

Caching must never leak provider keys to clients.

## Environment Variables

Recommended server env vars in the original project:

```bash
GOOGLE_MAPS_SERVER_KEY=
HOTPEPPER_API_KEY=
AMAP_SERVER_KEY=
RESTAURANT_SEARCH_CACHE_TTL_SECONDS=60
REVERSE_GEOCODE_CACHE_TTL_SECONDS=3600
PHOTO_CACHE_TTL_SECONDS=86400
```

## Suggested Implementation Order

1. Done: create normalized API types and error helpers.
2. Done: implement `GET /api/v1/health`.
3. Done: implement `GET /api/v1/capabilities`.
4. Done: implement `POST /api/v1/geo/reverse`.
5. Done: refactor existing Google, HotPepper, Amap, and merge logic into backend service modules.
6. Done: implement `POST /api/v1/restaurants/search`.
7. Done: implement `GET /api/v1/restaurants/:restaurantKey`.
8. Done: implement `GET /api/v1/restaurants/:restaurantKey/photo`.
9. Done: add compatibility adapters for current `/api/geocode/reverse` and `/api/places/nearby`.
10. Done: keep `/api/places/photo` as a compatibility proxy for legacy Google photo refs.
11. Pending phase 2: add tests for:
    - provider resolution
    - Japan merge correctness
    - canonical details refresh and snapshot fallback behavior
    - `open_now` filtering semantics
    - normalized field mapping
    - partial-results behavior when one provider fails

## Minimum Test Matrix for the Original Project

- China coordinates with Amap configured
- Japan coordinates with HotPepper only
- Japan coordinates with Google only
- Japan coordinates with both configured and merge enabled
- non-Japan/non-China coordinates with Google
- `GET /api/v1/restaurants/:restaurantKey` for:
  - Google-backed result
  - HotPepper-backed result
  - hybrid JP result
  - snapshot fallback when upstream detail refresh fails
- `open_now=true` with mixed `true`, `false`, and `undefined`
- rating, budget, capacity, and feature filters
- photo endpoint with Google-backed results

## Notes for the Flutter Client

The Flutter app should consume only the normalized API:

- it should not know provider-specific REST details
- it should not ship provider API keys
- it should trust `photoUrl` as a client-safe image URL
- it should treat `restaurant_key` as opaque and stable
- it can refresh a restaurant card or deep-linked detail page by calling `GET /api/v1/restaurants/:restaurantKey`

That keeps the mobile app simple and keeps provider changes isolated to the backend.
