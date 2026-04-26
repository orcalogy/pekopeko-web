
# RestaurantSearchPaginationRequest

Cursor-based pagination. `pageSize` may be set only on the first page. When `cursor` is present, omit all other search-definition fields and continue the previously created search session. 

## Properties

Name | Type
------------ | -------------
`pageSize` | number
`cursor` | string

## Example

```typescript
import type { RestaurantSearchPaginationRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "pageSize": null,
  "cursor": null,
} satisfies RestaurantSearchPaginationRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RestaurantSearchPaginationRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


