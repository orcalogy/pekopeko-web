
# GeoResolution


## Properties

Name | Type
------------ | -------------
`country` | string
`provider` | [ProviderKind](ProviderKind.md)
`providerPlan` | [Array&lt;ProviderKind&gt;](ProviderKind.md)
`strategy` | [GeoResolutionStrategy](GeoResolutionStrategy.md)
`confidence` | [GeoResolutionConfidence](GeoResolutionConfidence.md)

## Example

```typescript
import type { GeoResolution } from ''

// TODO: Update the object below with actual values
const example = {
  "country": null,
  "provider": null,
  "providerPlan": null,
  "strategy": null,
  "confidence": null,
} satisfies GeoResolution

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as GeoResolution
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


