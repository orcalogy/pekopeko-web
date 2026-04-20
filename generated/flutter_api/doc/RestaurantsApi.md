# pekopeko_api.api.RestaurantsApi

## Load the API package
```dart
import 'package:pekopeko_api/api.dart';
```

All URIs are relative to *http://127.0.0.1:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getRestaurantDetails**](RestaurantsApi.md#getrestaurantdetails) | **GET** /api/v1/restaurants/{restaurantKey} | Get restaurant details by stable restaurant key
[**getRestaurantPhoto**](RestaurantsApi.md#getrestaurantphoto) | **GET** /api/v1/restaurants/{restaurantKey}/photo | Proxy restaurant photo media
[**searchRestaurants**](RestaurantsApi.md#searchrestaurants) | **POST** /api/v1/restaurants/search | Search nearby restaurants


# **getRestaurantDetails**
> RestaurantDetailsResponse getRestaurantDetails(restaurantKey, locale)

Get restaurant details by stable restaurant key

### Example
```dart
import 'package:pekopeko_api/api.dart';

final api = PekopekoApi().getRestaurantsApi();
final String restaurantKey = restaurantKey_example; // String | 
final AppLocale locale = ; // AppLocale | 

try {
    final response = api.getRestaurantDetails(restaurantKey, locale);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RestaurantsApi->getRestaurantDetails: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **restaurantKey** | **String**|  | 
 **locale** | [**AppLocale**](.md)|  | [optional] 

### Return type

[**RestaurantDetailsResponse**](RestaurantDetailsResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getRestaurantPhoto**
> Uint8List getRestaurantPhoto(restaurantKey, maxWidth)

Proxy restaurant photo media

### Example
```dart
import 'package:pekopeko_api/api.dart';

final api = PekopekoApi().getRestaurantsApi();
final String restaurantKey = restaurantKey_example; // String | 
final int maxWidth = 56; // int | 

try {
    final response = api.getRestaurantPhoto(restaurantKey, maxWidth);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RestaurantsApi->getRestaurantPhoto: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **restaurantKey** | **String**|  | 
 **maxWidth** | **int**|  | [optional] [default to 800]

### Return type

[**Uint8List**](Uint8List.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: image/*, application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **searchRestaurants**
> RestaurantSearchResponse searchRestaurants(restaurantSearchRequest)

Search nearby restaurants

### Example
```dart
import 'package:pekopeko_api/api.dart';

final api = PekopekoApi().getRestaurantsApi();
final RestaurantSearchRequest restaurantSearchRequest = ; // RestaurantSearchRequest | 

try {
    final response = api.searchRestaurants(restaurantSearchRequest);
    print(response);
} on DioException catch (e) {
    print('Exception when calling RestaurantsApi->searchRestaurants: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **restaurantSearchRequest** | [**RestaurantSearchRequest**](RestaurantSearchRequest.md)|  | 

### Return type

[**RestaurantSearchResponse**](RestaurantSearchResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

