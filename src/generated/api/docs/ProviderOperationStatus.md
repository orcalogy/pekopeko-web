
# ProviderOperationStatus


## Properties

Name | Type
------------ | -------------
`provider` | [ProviderKind](ProviderKind.md)
`status` | [ProviderOperationStatusState](ProviderOperationStatusState.md)
`rawResults` | number
`error` | [UpstreamErrorInfo](UpstreamErrorInfo.md)

## Example

```typescript
import type { ProviderOperationStatus } from ''

// TODO: Update the object below with actual values
const example = {
  "provider": null,
  "status": null,
  "rawResults": null,
  "error": null,
} satisfies ProviderOperationStatus

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ProviderOperationStatus
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


