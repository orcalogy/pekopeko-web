//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_import

import 'package:one_of_serializer/any_of_serializer.dart';
import 'package:one_of_serializer/one_of_serializer.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/serializer.dart';
import 'package:built_value/standard_json_plugin.dart';
import 'package:built_value/iso_8601_date_time_serializer.dart';
import 'package:pekopeko_api/src/date_serializer.dart';
import 'package:pekopeko_api/src/model/date.dart';

import 'package:pekopeko_api/src/model/api_error.dart';
import 'package:pekopeko_api/src/model/api_error_code.dart';
import 'package:pekopeko_api/src/model/api_error_response.dart';
import 'package:pekopeko_api/src/model/api_version.dart';
import 'package:pekopeko_api/src/model/app_locale.dart';
import 'package:pekopeko_api/src/model/applied_restaurant_filters.dart';
import 'package:pekopeko_api/src/model/capabilities_response.dart';
import 'package:pekopeko_api/src/model/capabilities_response_geo.dart';
import 'package:pekopeko_api/src/model/capabilities_response_providers.dart';
import 'package:pekopeko_api/src/model/capabilities_response_search.dart';
import 'package:pekopeko_api/src/model/category_capability.dart';
import 'package:pekopeko_api/src/model/detail_freshness_state.dart';
import 'package:pekopeko_api/src/model/geo_resolution.dart';
import 'package:pekopeko_api/src/model/geo_resolution_confidence.dart';
import 'package:pekopeko_api/src/model/geo_resolution_strategy.dart';
import 'package:pekopeko_api/src/model/geo_reverse_request.dart';
import 'package:pekopeko_api/src/model/health_response.dart';
import 'package:pekopeko_api/src/model/localized_category_name.dart';
import 'package:pekopeko_api/src/model/pagination_mode.dart';
import 'package:pekopeko_api/src/model/provider_configuration.dart';
import 'package:pekopeko_api/src/model/provider_kind.dart';
import 'package:pekopeko_api/src/model/provider_mode.dart';
import 'package:pekopeko_api/src/model/provider_operation_status.dart';
import 'package:pekopeko_api/src/model/provider_operation_status_state.dart';
import 'package:pekopeko_api/src/model/provider_source.dart';
import 'package:pekopeko_api/src/model/restaurant_details_freshness.dart';
import 'package:pekopeko_api/src/model/restaurant_details_resource.dart';
import 'package:pekopeko_api/src/model/restaurant_details_response.dart';
import 'package:pekopeko_api/src/model/restaurant_feature.dart';
import 'package:pekopeko_api/src/model/restaurant_provider_ref.dart';
import 'package:pekopeko_api/src/model/restaurant_search_filters.dart';
import 'package:pekopeko_api/src/model/restaurant_search_item.dart';
import 'package:pekopeko_api/src/model/restaurant_search_pagination.dart';
import 'package:pekopeko_api/src/model/restaurant_search_pagination_request.dart';
import 'package:pekopeko_api/src/model/restaurant_search_query.dart';
import 'package:pekopeko_api/src/model/restaurant_search_request.dart';
import 'package:pekopeko_api/src/model/restaurant_search_request_location.dart';
import 'package:pekopeko_api/src/model/restaurant_search_response.dart';
import 'package:pekopeko_api/src/model/restaurant_search_sort.dart';
import 'package:pekopeko_api/src/model/restaurant_sort_by.dart';
import 'package:pekopeko_api/src/model/sort_direction.dart';
import 'package:pekopeko_api/src/model/upstream_error_info.dart';

part 'serializers.g.dart';

@SerializersFor([
  ApiError,
  ApiErrorCode,
  ApiErrorResponse,
  ApiVersion,
  AppLocale,
  AppliedRestaurantFilters,
  CapabilitiesResponse,
  CapabilitiesResponseGeo,
  CapabilitiesResponseProviders,
  CapabilitiesResponseSearch,
  CategoryCapability,
  DetailFreshnessState,
  GeoResolution,
  GeoResolutionConfidence,
  GeoResolutionStrategy,
  GeoReverseRequest,
  HealthResponse,
  LocalizedCategoryName,
  PaginationMode,
  ProviderConfiguration,
  ProviderKind,
  ProviderMode,
  ProviderOperationStatus,
  ProviderOperationStatusState,
  ProviderSource,
  RestaurantDetailsFreshness,
  RestaurantDetailsResource,
  RestaurantDetailsResponse,
  RestaurantFeature,
  RestaurantProviderRef,
  RestaurantSearchFilters,
  RestaurantSearchItem,
  RestaurantSearchPagination,
  RestaurantSearchPaginationRequest,
  RestaurantSearchQuery,
  RestaurantSearchRequest,
  RestaurantSearchRequestLocation,
  RestaurantSearchResponse,
  RestaurantSearchSort,
  RestaurantSortBy,
  SortDirection,
  UpstreamErrorInfo,
])
Serializers serializers = (_$serializers.toBuilder()
      ..add(const OneOfSerializer())
      ..add(const AnyOfSerializer())
      ..add(const DateSerializer())
      ..add(Iso8601DateTimeSerializer())
    ).build();

Serializers standardSerializers =
    (serializers.toBuilder()..addPlugin(StandardJsonPlugin())).build();
