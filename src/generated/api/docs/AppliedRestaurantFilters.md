
# AppliedRestaurantFilters


## Properties

Name | Type
------------ | -------------
`openNow` | boolean
`minRating` | number
`maxPriceLevel` | number
`partySize` | number
`requiredFeatures` | [Array&lt;RestaurantFeature&gt;](RestaurantFeature.md)
`sortBy` | [RestaurantSortBy](RestaurantSortBy.md)
`sortDirection` | [SortDirection](SortDirection.md)

## Example

```typescript
import type { AppliedRestaurantFilters } from ''

// TODO: Update the object below with actual values
const example = {
  "openNow": null,
  "minRating": null,
  "maxPriceLevel": null,
  "partySize": null,
  "requiredFeatures": null,
  "sortBy": null,
  "sortDirection": null,
} satisfies AppliedRestaurantFilters

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AppliedRestaurantFilters
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


