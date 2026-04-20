//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:pekopeko_api/src/model/restaurant_search_request_location.dart';
import 'package:pekopeko_api/src/model/app_locale.dart';
import 'package:pekopeko_api/src/model/restaurant_search_pagination_request.dart';
import 'package:pekopeko_api/src/model/restaurant_search_query.dart';
import 'package:pekopeko_api/src/model/provider_mode.dart';
import 'package:pekopeko_api/src/model/restaurant_search_sort.dart';
import 'package:pekopeko_api/src/model/restaurant_search_filters.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restaurant_search_request.g.dart';

/// RestaurantSearchRequest
///
/// Properties:
/// * [locale] 
/// * [provider] 
/// * [location] 
/// * [radiusM] 
/// * [query] 
/// * [filters] 
/// * [sort] 
/// * [pagination] 
@BuiltValue()
abstract class RestaurantSearchRequest implements Built<RestaurantSearchRequest, RestaurantSearchRequestBuilder> {
  @BuiltValueField(wireName: r'locale')
  AppLocale? get locale;
  // enum localeEnum {  zh-CN,  ja,  en,  };

  @BuiltValueField(wireName: r'provider')
  ProviderMode? get provider;
  // enum providerEnum {  auto,  google,  hotpepper,  amap,  };

  @BuiltValueField(wireName: r'location')
  RestaurantSearchRequestLocation get location;

  @BuiltValueField(wireName: r'radiusM')
  int? get radiusM;

  @BuiltValueField(wireName: r'query')
  RestaurantSearchQuery? get query;

  @BuiltValueField(wireName: r'filters')
  RestaurantSearchFilters? get filters;

  @BuiltValueField(wireName: r'sort')
  RestaurantSearchSort? get sort;

  @BuiltValueField(wireName: r'pagination')
  RestaurantSearchPaginationRequest? get pagination;

  RestaurantSearchRequest._();

  factory RestaurantSearchRequest([void updates(RestaurantSearchRequestBuilder b)]) = _$RestaurantSearchRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RestaurantSearchRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RestaurantSearchRequest> get serializer => _$RestaurantSearchRequestSerializer();
}

class _$RestaurantSearchRequestSerializer implements PrimitiveSerializer<RestaurantSearchRequest> {
  @override
  final Iterable<Type> types = const [RestaurantSearchRequest, _$RestaurantSearchRequest];

  @override
  final String wireName = r'RestaurantSearchRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RestaurantSearchRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.locale != null) {
      yield r'locale';
      yield serializers.serialize(
        object.locale,
        specifiedType: const FullType(AppLocale),
      );
    }
    if (object.provider != null) {
      yield r'provider';
      yield serializers.serialize(
        object.provider,
        specifiedType: const FullType(ProviderMode),
      );
    }
    yield r'location';
    yield serializers.serialize(
      object.location,
      specifiedType: const FullType(RestaurantSearchRequestLocation),
    );
    if (object.radiusM != null) {
      yield r'radiusM';
      yield serializers.serialize(
        object.radiusM,
        specifiedType: const FullType(int),
      );
    }
    if (object.query != null) {
      yield r'query';
      yield serializers.serialize(
        object.query,
        specifiedType: const FullType(RestaurantSearchQuery),
      );
    }
    if (object.filters != null) {
      yield r'filters';
      yield serializers.serialize(
        object.filters,
        specifiedType: const FullType(RestaurantSearchFilters),
      );
    }
    if (object.sort != null) {
      yield r'sort';
      yield serializers.serialize(
        object.sort,
        specifiedType: const FullType(RestaurantSearchSort),
      );
    }
    if (object.pagination != null) {
      yield r'pagination';
      yield serializers.serialize(
        object.pagination,
        specifiedType: const FullType(RestaurantSearchPaginationRequest),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    RestaurantSearchRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required RestaurantSearchRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'locale':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AppLocale),
          ) as AppLocale;
          result.locale = valueDes;
          break;
        case r'provider':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ProviderMode),
          ) as ProviderMode;
          result.provider = valueDes;
          break;
        case r'location':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RestaurantSearchRequestLocation),
          ) as RestaurantSearchRequestLocation;
          result.location.replace(valueDes);
          break;
        case r'radiusM':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.radiusM = valueDes;
          break;
        case r'query':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RestaurantSearchQuery),
          ) as RestaurantSearchQuery;
          result.query.replace(valueDes);
          break;
        case r'filters':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RestaurantSearchFilters),
          ) as RestaurantSearchFilters;
          result.filters.replace(valueDes);
          break;
        case r'sort':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RestaurantSearchSort),
          ) as RestaurantSearchSort;
          result.sort.replace(valueDes);
          break;
        case r'pagination':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RestaurantSearchPaginationRequest),
          ) as RestaurantSearchPaginationRequest;
          result.pagination.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RestaurantSearchRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RestaurantSearchRequestBuilder();
    final serializedList = (serialized as Iterable<Object?>).toList();
    final unhandled = <Object?>[];
    _deserializeProperties(
      serializers,
      serialized,
      specifiedType: specifiedType,
      serializedList: serializedList,
      unhandled: unhandled,
      result: result,
    );
    return result.build();
  }
}

