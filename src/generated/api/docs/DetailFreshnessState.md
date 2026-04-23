
# DetailFreshnessState

Indicates how fresh the detail payload is. `live` means the returned payload was assembled from successful live provider refreshes. `partial_live` means at least one live provider refresh succeeded but some detail data may still be stale or missing. `snapshot` means no live refresh succeeded and the response was served from the last stored snapshot. 

## Properties

Name | Type
------------ | -------------

## Example

```typescript
import type { DetailFreshnessState } from ''

// TODO: Update the object below with actual values
const example = {
} satisfies DetailFreshnessState

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DetailFreshnessState
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


