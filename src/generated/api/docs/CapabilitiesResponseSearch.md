
# CapabilitiesResponseSearch


## Properties

Name | Type
------------ | -------------
`defaultRadiusM` | number
`minRadiusM` | number
`maxRadiusM` | number
`radiusPresetsM` | Array&lt;number&gt;
`defaultPageSize` | number
`maxPageSize` | number
`paginationMode` | [PaginationMode](PaginationMode.md)
`providerModes` | [Array&lt;ProviderMode&gt;](ProviderMode.md)
`sortBy` | [Array&lt;RestaurantSortBy&gt;](RestaurantSortBy.md)
`sortDirections` | [Array&lt;SortDirection&gt;](SortDirection.md)
`requiredFeatures` | [Array&lt;RestaurantFeature&gt;](RestaurantFeature.md)

## Example

```typescript
import type { CapabilitiesResponseSearch } from ''

// TODO: Update the object below with actual values
const example = {
  "defaultRadiusM": null,
  "minRadiusM": null,
  "maxRadiusM": null,
  "radiusPresetsM": null,
  "defaultPageSize": null,
  "maxPageSize": null,
  "paginationMode": null,
  "providerModes": null,
  "sortBy": null,
  "sortDirections": null,
  "requiredFeatures": null,
} satisfies CapabilitiesResponseSearch

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CapabilitiesResponseSearch
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


