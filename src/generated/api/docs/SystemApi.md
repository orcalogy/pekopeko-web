# SystemApi

All URIs are relative to *http://127.0.0.1:3000*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getCapabilities**](SystemApi.md#getcapabilities) | **GET** /api/v1/capabilities | Runtime capabilities and search contract |
| [**getHealth**](SystemApi.md#gethealth) | **GET** /api/v1/health | Health check |



## getCapabilities

> CapabilitiesResponse getCapabilities()

Runtime capabilities and search contract

### Example

```ts
import {
  Configuration,
  SystemApi,
} from '';
import type { GetCapabilitiesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SystemApi();

  try {
    const data = await api.getCapabilities();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**CapabilitiesResponse**](CapabilitiesResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | API capabilities |  * X-Request-Id -  <br>  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getHealth

> HealthResponse getHealth()

Health check

### Example

```ts
import {
  Configuration,
  SystemApi,
} from '';
import type { GetHealthRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SystemApi();

  try {
    const data = await api.getHealth();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**HealthResponse**](HealthResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | API health status |  * X-Request-Id -  <br>  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

