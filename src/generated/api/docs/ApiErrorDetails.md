
# ApiErrorDetails


## Properties

Name | Type
------------ | -------------
`field` | string
`unsupportedFields` | Array&lt;string&gt;
`index` | number
`value` | string
`provider` | [ProviderKind](ProviderKind.md)
`restaurantKey` | string
`movedToRestaurantKey` | string
`state` | string

## Example

```typescript
import type { ApiErrorDetails } from ''

// TODO: Update the object below with actual values
const example = {
  "field": null,
  "unsupportedFields": null,
  "index": null,
  "value": null,
  "provider": null,
  "restaurantKey": null,
  "movedToRestaurantKey": null,
  "state": null,
} satisfies ApiErrorDetails

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ApiErrorDetails
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


