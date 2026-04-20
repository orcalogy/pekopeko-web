
# RestaurantResource


## Properties

Name | Type
------------ | -------------
`restaurantKey` | string
`id` | string
`name` | string
`address` | string
`lat` | number
`lng` | number
`distance` | number
`rating` | number
`priceLevel` | number
`isOpenNow` | boolean
`openingHours` | Array&lt;string&gt;
`cuisineType` | string
`photoUrl` | string
`phone` | string
`placeUrl` | string
`detailUrl` | string
`couponUrl` | string
`accessInfo` | string
`budgetText` | string
`capacity` | number
`features` | [Array&lt;RestaurantFeature&gt;](RestaurantFeature.md)
`menuUrl` | string
`websiteUrl` | string
`source` | [ProviderSource](ProviderSource.md)
`providerRefs` | [Array&lt;RestaurantProviderRef&gt;](RestaurantProviderRef.md)

## Example

```typescript
import type { RestaurantResource } from ''

// TODO: Update the object below with actual values
const example = {
  "restaurantKey": null,
  "id": null,
  "name": null,
  "address": null,
  "lat": null,
  "lng": null,
  "distance": null,
  "rating": null,
  "priceLevel": null,
  "isOpenNow": null,
  "openingHours": null,
  "cuisineType": null,
  "photoUrl": null,
  "phone": null,
  "placeUrl": null,
  "detailUrl": null,
  "couponUrl": null,
  "accessInfo": null,
  "budgetText": null,
  "capacity": null,
  "features": null,
  "menuUrl": null,
  "websiteUrl": null,
  "source": null,
  "providerRefs": null,
} satisfies RestaurantResource

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RestaurantResource
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


