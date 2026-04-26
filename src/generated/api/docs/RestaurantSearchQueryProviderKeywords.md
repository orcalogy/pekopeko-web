
# RestaurantSearchQueryProviderKeywords

Optional bounded provider-specific keyword expansion. Clients should send these only as a supplement to the base keyword when a semantic parser has high enough confidence that extra provider terms may improve recall. The server may ignore these terms when the base search already has enough results. 

## Properties

Name | Type
------------ | -------------
`google` | Array&lt;string&gt;
`hotpepper` | Array&lt;string&gt;
`amap` | Array&lt;string&gt;

## Example

```typescript
import type { RestaurantSearchQueryProviderKeywords } from ''

// TODO: Update the object below with actual values
const example = {
  "google": null,
  "hotpepper": null,
  "amap": null,
} satisfies RestaurantSearchQueryProviderKeywords

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RestaurantSearchQueryProviderKeywords
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


