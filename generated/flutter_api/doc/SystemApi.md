# pekopeko_api.api.SystemApi

## Load the API package
```dart
import 'package:pekopeko_api/api.dart';
```

All URIs are relative to *http://127.0.0.1:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getCapabilities**](SystemApi.md#getcapabilities) | **GET** /api/v1/capabilities | Runtime capabilities and search contract
[**getHealth**](SystemApi.md#gethealth) | **GET** /api/v1/health | Health check


# **getCapabilities**
> CapabilitiesResponse getCapabilities()

Runtime capabilities and search contract

### Example
```dart
import 'package:pekopeko_api/api.dart';

final api = PekopekoApi().getSystemApi();

try {
    final response = api.getCapabilities();
    print(response);
} on DioException catch (e) {
    print('Exception when calling SystemApi->getCapabilities: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**CapabilitiesResponse**](CapabilitiesResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getHealth**
> HealthResponse getHealth()

Health check

### Example
```dart
import 'package:pekopeko_api/api.dart';

final api = PekopekoApi().getSystemApi();

try {
    final response = api.getHealth();
    print(response);
} on DioException catch (e) {
    print('Exception when calling SystemApi->getHealth: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**HealthResponse**](HealthResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

