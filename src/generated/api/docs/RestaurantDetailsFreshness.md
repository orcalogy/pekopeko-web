
# RestaurantDetailsFreshness

Freshness metadata for the detail payload. `snapshot` responses may contain stale registry data and should not be cached beyond the immediate response. 

## Properties

Name | Type
------------ | -------------
`state` | [DetailFreshnessState](DetailFreshnessState.md)

## Example

```typescript
import type { RestaurantDetailsFreshness } from ''

// TODO: Update the object below with actual values
const example = {
  "state": null,
} satisfies RestaurantDetailsFreshness

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RestaurantDetailsFreshness
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


