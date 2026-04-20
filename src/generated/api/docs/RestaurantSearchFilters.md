
# RestaurantSearchFilters


## Properties

Name | Type
------------ | -------------
`openNow` | boolean
`minRating` | number
`maxPriceLevel` | number
`partySize` | number
`requiredFeatures` | [Array&lt;RestaurantFeature&gt;](RestaurantFeature.md)

## Example

```typescript
import type { RestaurantSearchFilters } from ''

// TODO: Update the object below with actual values
const example = {
  "openNow": null,
  "minRating": null,
  "maxPriceLevel": null,
  "partySize": null,
  "requiredFeatures": null,
} satisfies RestaurantSearchFilters

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RestaurantSearchFilters
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


