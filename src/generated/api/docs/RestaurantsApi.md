# RestaurantsApi

All URIs are relative to *http://127.0.0.1:3000*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getRestaurantDetails**](RestaurantsApi.md#getrestaurantdetails) | **GET** /api/v1/restaurants/{restaurantKey} | Get restaurant details by stable restaurant key |
| [**getRestaurantPhoto**](RestaurantsApi.md#getrestaurantphoto) | **GET** /api/v1/restaurants/{restaurantKey}/photo | Proxy restaurant photo media |
| [**searchRestaurants**](RestaurantsApi.md#searchrestaurants) | **POST** /api/v1/restaurants/search | Search nearby restaurants |



## getRestaurantDetails

> RestaurantDetailsResponse getRestaurantDetails(restaurantKey, locale)

Get restaurant details by stable restaurant key

### Example

```ts
import {
  Configuration,
  RestaurantsApi,
} from '';
import type { GetRestaurantDetailsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new RestaurantsApi();

  const body = {
    // string
    restaurantKey: restaurantKey_example,
    // AppLocale (optional)
    locale: ...,
  } satisfies GetRestaurantDetailsRequest;

  try {
    const data = await api.getRestaurantDetails(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **restaurantKey** | `string` |  | [Defaults to `undefined`] |
| **locale** | `AppLocale` |  | [Optional] [Defaults to `undefined`] [Enum: zh-CN, ja, en] |

### Return type

[**RestaurantDetailsResponse**](RestaurantDetailsResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Restaurant details |  * X-Request-Id -  <br>  |
| **404** | Resource not found |  * X-Request-Id -  <br>  |
| **429** | Request was rate limited or upstream quota was exhausted. In v1 this primarily reflects upstream quota/rate-limit passthrough; local per-IP throttling is not guaranteed.  |  * X-Request-Id -  <br>  * Retry-After -  <br>  |
| **503** | Required upstream provider is unavailable |  * X-Request-Id -  <br>  |
| **0** | Internal server error |  * X-Request-Id -  <br>  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getRestaurantPhoto

> Blob getRestaurantPhoto(restaurantKey, maxWidth)

Proxy restaurant photo media

### Example

```ts
import {
  Configuration,
  RestaurantsApi,
} from '';
import type { GetRestaurantPhotoRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new RestaurantsApi();

  const body = {
    // string
    restaurantKey: restaurantKey_example,
    // number (optional)
    maxWidth: 56,
  } satisfies GetRestaurantPhotoRequest;

  try {
    const data = await api.getRestaurantPhoto(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **restaurantKey** | `string` |  | [Defaults to `undefined`] |
| **maxWidth** | `number` |  | [Optional] [Defaults to `800`] |

### Return type

**Blob**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `image/*`, `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Image bytes |  * X-Request-Id -  <br>  * Cache-Control -  <br>  * Content-Type -  <br>  |
| **404** | Resource not found |  * X-Request-Id -  <br>  |
| **429** | Request was rate limited or upstream quota was exhausted. In v1 this primarily reflects upstream quota/rate-limit passthrough; local per-IP throttling is not guaranteed.  |  * X-Request-Id -  <br>  * Retry-After -  <br>  |
| **502** | Upstream provider failure |  * X-Request-Id -  <br>  |
| **503** | Required upstream provider is unavailable |  * X-Request-Id -  <br>  |
| **0** | Internal server error |  * X-Request-Id -  <br>  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchRestaurants

> RestaurantSearchResponse searchRestaurants(RestaurantSearchRequest)

Search nearby restaurants

### Example

```ts
import {
  Configuration,
  RestaurantsApi,
} from '';
import type { SearchRestaurantsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new RestaurantsApi();

  const body = {
    // RestaurantSearchRequest
    RestaurantSearchRequest: ...,
  } satisfies SearchRestaurantsRequest;

  try {
    const data = await api.searchRestaurants(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **RestaurantSearchRequest** | [RestaurantSearchRequest](RestaurantSearchRequest.md) |  | |

### Return type

[**RestaurantSearchResponse**](RestaurantSearchResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Search results |  * X-Request-Id -  <br>  |
| **400** | Invalid request |  * X-Request-Id -  <br>  |
| **429** | Request was rate limited or upstream quota was exhausted. In v1 this primarily reflects upstream quota/rate-limit passthrough; local per-IP throttling is not guaranteed.  |  * X-Request-Id -  <br>  * Retry-After -  <br>  |
| **502** | Upstream provider failure |  * X-Request-Id -  <br>  |
| **503** | Required upstream provider is unavailable |  * X-Request-Id -  <br>  |
| **0** | Internal server error |  * X-Request-Id -  <br>  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

