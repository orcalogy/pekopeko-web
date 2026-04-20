# pekopeko_api.api.GeoApi

## Load the API package
```dart
import 'package:pekopeko_api/api.dart';
```

All URIs are relative to *http://127.0.0.1:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**reverseGeo**](GeoApi.md#reversegeo) | **POST** /api/v1/geo/reverse | Resolve country and provider plan from coordinates


# **reverseGeo**
> GeoResolution reverseGeo(geoReverseRequest)

Resolve country and provider plan from coordinates

### Example
```dart
import 'package:pekopeko_api/api.dart';

final api = PekopekoApi().getGeoApi();
final GeoReverseRequest geoReverseRequest = ; // GeoReverseRequest | 

try {
    final response = api.reverseGeo(geoReverseRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling GeoApi->reverseGeo: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **geoReverseRequest** | [**GeoReverseRequest**](GeoReverseRequest.md)|  | 

### Return type

[**GeoResolution**](GeoResolution.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

