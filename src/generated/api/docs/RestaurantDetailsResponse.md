
# RestaurantDetailsResponse


## Properties

Name | Type
------------ | -------------
`requestId` | string
`restaurant` | [RestaurantDetailsResource](RestaurantDetailsResource.md)
`freshness` | [RestaurantDetailsFreshness](RestaurantDetailsFreshness.md)
`providerStatuses` | [Array&lt;ProviderOperationStatus&gt;](ProviderOperationStatus.md)

## Example

```typescript
import type { RestaurantDetailsResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "requestId": null,
  "restaurant": null,
  "freshness": null,
  "providerStatuses": null,
} satisfies RestaurantDetailsResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RestaurantDetailsResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


