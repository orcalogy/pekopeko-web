
# RestaurantSearchPagination


## Properties

Name | Type
------------ | -------------
`mode` | [PaginationMode](PaginationMode.md)
`pageSize` | number
`nextCursor` | string
`returned` | number
`total` | number

## Example

```typescript
import type { RestaurantSearchPagination } from ''

// TODO: Update the object below with actual values
const example = {
  "mode": null,
  "pageSize": null,
  "nextCursor": null,
  "returned": null,
  "total": null,
} satisfies RestaurantSearchPagination

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RestaurantSearchPagination
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


