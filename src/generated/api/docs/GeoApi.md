# GeoApi

All URIs are relative to *http://127.0.0.1:3000*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**reverseGeo**](GeoApi.md#reversegeo) | **POST** /api/v1/geo/reverse | Resolve country and provider plan from coordinates |



## reverseGeo

> GeoResolution reverseGeo(GeoReverseRequest)

Resolve country and provider plan from coordinates

### Example

```ts
import {
  Configuration,
  GeoApi,
} from '';
import type { ReverseGeoRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new GeoApi();

  const body = {
    // GeoReverseRequest
    GeoReverseRequest: ...,
  } satisfies ReverseGeoRequest;

  try {
    const data = await api.reverseGeo(body);
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
| **GeoReverseRequest** | [GeoReverseRequest](GeoReverseRequest.md) |  | |

### Return type

[**GeoResolution**](GeoResolution.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Geo resolution |  * X-Request-Id -  <br>  |
| **400** | Invalid request |  -  |
| **503** | Required upstream provider is unavailable |  -  |
| **0** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

