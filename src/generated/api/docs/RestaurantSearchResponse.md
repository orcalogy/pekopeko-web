
# RestaurantSearchResponse


## Properties

Name | Type
------------ | -------------
`requestId` | string
`resolved` | [GeoResolution](GeoResolution.md)
`appliedFilters` | [AppliedRestaurantFilters](AppliedRestaurantFilters.md)
`partialResults` | boolean
`providerStatuses` | [Array&lt;ProviderOperationStatus&gt;](ProviderOperationStatus.md)
`results` | [Array&lt;RestaurantResource&gt;](RestaurantResource.md)
`pagination` | [RestaurantSearchPagination](RestaurantSearchPagination.md)

## Example

```typescript
import type { RestaurantSearchResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "requestId": null,
  "resolved": null,
  "appliedFilters": null,
  "partialResults": null,
  "providerStatuses": null,
  "results": null,
  "pagination": null,
} satisfies RestaurantSearchResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RestaurantSearchResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


