# PekoPeko API Client Guide

This is the short usage guide for `/api/v1` clients.

## Search vs Details

- Call `POST /api/v1/restaurants/search` to find nearby restaurants and receive stable
  `restaurantKey` values.
- Call `GET /api/v1/restaurants/{restaurantKey}` when the client needs one canonical detail view
  for a specific restaurant.
- Treat `restaurantKey` as opaque and stable. Do not derive provider ids from it.

## Pagination

- The first search request defines the search:
  - `locale`
  - `provider`
  - `location`
  - `radiusM`
  - `query`
  - `filters`
  - `sort`
  - optional `pagination.pageSize`
- If `pagination.nextCursor` is present in the response, request the next page by sending only:

```json
{
  "pagination": {
    "cursor": "..."
  }
}
```

- Do not send new search-definition fields together with `pagination.cursor`.
- `pagination.cursor` is short-lived and may expire. If a follow-up request returns
  `400 invalid_argument` with `details.field = "pagination.cursor"`, restart from the first page.

## Handling 404s

- A normal missing restaurant returns `404 not_found` with `details.restaurantKey`.
- A moved restaurant returns `404 not_found` with:
  - `details.restaurantKey`
  - `details.movedToRestaurantKey`
- Recommended client behavior for moved restaurants:
  - redirect or refresh using `movedToRestaurantKey`
  - update any stored bookmark/reference to the new key
- A closed restaurant returns `404 not_found` with:
  - `details.restaurantKey`
  - `details.state = "closed"`
- Recommended client behavior for closed restaurants:
  - show the item as closed/unavailable
  - avoid retry loops unless the user explicitly refreshes

## Capabilities

- Treat `GET /api/v1/capabilities` as the runtime source of truth for:
  - configured providers
  - supported provider modes
  - search pagination mode
  - supported sort directions and required feature enums
  - detail freshness states
- Clients should avoid hardcoding these values when capabilities are already available.

## Detail Freshness

- `freshness.state = "live"` means the returned details were assembled from successful live refreshes.
- `freshness.state = "partial_live"` means some live refresh succeeded, but some provider detail data
  may still be stale or missing.
- `freshness.state = "snapshot"` means no live detail refresh succeeded and the response was served
  from the last stored snapshot.
- For `partial_live` and `snapshot`, clients should prefer conservative UI:
  - allow manual refresh
  - avoid presenting the payload as guaranteed real-time state
