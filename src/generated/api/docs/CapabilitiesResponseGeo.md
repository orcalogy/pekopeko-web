
# CapabilitiesResponseGeo


## Properties

Name | Type
------------ | -------------
`strategies` | [Array&lt;GeoResolutionStrategy&gt;](GeoResolutionStrategy.md)
`confidences` | [Array&lt;GeoResolutionConfidence&gt;](GeoResolutionConfidence.md)

## Example

```typescript
import type { CapabilitiesResponseGeo } from ''

// TODO: Update the object below with actual values
const example = {
  "strategies": null,
  "confidences": null,
} satisfies CapabilitiesResponseGeo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CapabilitiesResponseGeo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


