
# CapabilitiesResponse


## Properties

Name | Type
------------ | -------------
`version` | [ApiVersion](ApiVersion.md)
`locales` | [Array&lt;AppLocale&gt;](AppLocale.md)
`providers` | [CapabilitiesResponseProviders](CapabilitiesResponseProviders.md)
`geo` | [CapabilitiesResponseGeo](CapabilitiesResponseGeo.md)
`details` | [CapabilitiesResponseDetails](CapabilitiesResponseDetails.md)
`search` | [CapabilitiesResponseSearch](CapabilitiesResponseSearch.md)
`categories` | [Array&lt;CategoryCapability&gt;](CategoryCapability.md)

## Example

```typescript
import type { CapabilitiesResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "version": null,
  "locales": null,
  "providers": null,
  "geo": null,
  "details": null,
  "search": null,
  "categories": null,
} satisfies CapabilitiesResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CapabilitiesResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


