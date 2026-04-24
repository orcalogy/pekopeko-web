
# RestaurantSearchRequest

First-page requests define the search. Follow-up requests must use only `pagination.cursor` and may not redefine the search.

## Properties

Name | Type
------------ | -------------
`locale` | [AppLocale](AppLocale.md)
`provider` | [ProviderMode](ProviderMode.md)
`location` | [RestaurantSearchRequestLocation](RestaurantSearchRequestLocation.md)
`radiusM` | number
`query` | [RestaurantSearchQuery](RestaurantSearchQuery.md)
`filters` | [RestaurantSearchFilters](RestaurantSearchFilters.md)
`sort` | [RestaurantSearchSort](RestaurantSearchSort.md)
`pagination` | [RestaurantSearchPaginationRequest](RestaurantSearchPaginationRequest.md)

## Example

```typescript
import type { RestaurantSearchRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "locale": null,
  "provider": null,
  "location": null,
  "radiusM": null,
  "query": null,
  "filters": null,
  "sort": null,
  "pagination": null,
} satisfies RestaurantSearchRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RestaurantSearchRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

