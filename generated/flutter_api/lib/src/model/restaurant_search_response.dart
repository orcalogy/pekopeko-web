//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:pekopeko_api/src/model/restaurant_resource.dart';
import 'package:pekopeko_api/src/model/restaurant_search_pagination.dart';
import 'package:built_collection/built_collection.dart';
import 'package:pekopeko_api/src/model/applied_restaurant_filters.dart';
import 'package:pekopeko_api/src/model/geo_resolution.dart';
import 'package:pekopeko_api/src/model/provider_operation_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restaurant_search_response.g.dart';

/// RestaurantSearchResponse
///
/// Properties:
/// * [requestId] 
/// * [resolved] 
/// * [appliedFilters] 
/// * [partialResults] 
/// * [providerStatuses] 
/// * [results] 
/// * [pagination] 
@BuiltValue()
abstract class RestaurantSearchResponse implements Built<RestaurantSearchResponse, RestaurantSearchResponseBuilder> {
  @BuiltValueField(wireName: r'requestId')
  String get requestId;

  @BuiltValueField(wireName: r'resolved')
  GeoResolution get resolved;

  @BuiltValueField(wireName: r'appliedFilters')
  AppliedRestaurantFilters get appliedFilters;

  @BuiltValueField(wireName: r'partialResults')
  bool get partialResults;

  @BuiltValueField(wireName: r'providerStatuses')
  BuiltList<ProviderOperationStatus> get providerStatuses;

  @BuiltValueField(wireName: r'results')
  BuiltList<RestaurantResource> get results;

  @BuiltValueField(wireName: r'pagination')
  RestaurantSearchPagination get pagination;

  RestaurantSearchResponse._();

  factory RestaurantSearchResponse([void updates(RestaurantSearchResponseBuilder b)]) = _$RestaurantSearchResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RestaurantSearchResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RestaurantSearchResponse> get serializer => _$RestaurantSearchResponseSerializer();
}

class _$RestaurantSearchResponseSerializer implements PrimitiveSerializer<RestaurantSearchResponse> {
  @override
  final Iterable<Type> types = const [RestaurantSearchResponse, _$RestaurantSearchResponse];

  @override
  final String wireName = r'RestaurantSearchResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RestaurantSearchResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'requestId';
    yield serializers.serialize(
      object.requestId,
      specifiedType: const FullType(String),
    );
    yield r'resolved';
    yield serializers.serialize(
      object.resolved,
      specifiedType: const FullType(GeoResolution),
    );
    yield r'appliedFilters';
    yield serializers.serialize(
      object.appliedFilters,
      specifiedType: const FullType(AppliedRestaurantFilters),
    );
    yield r'partialResults';
    yield serializers.serialize(
      object.partialResults,
      specifiedType: const FullType(bool),
    );
    yield r'providerStatuses';
    yield serializers.serialize(
      object.providerStatuses,
      specifiedType: const FullType(BuiltList, [FullType(ProviderOperationStatus)]),
    );
    yield r'results';
    yield serializers.serialize(
      object.results,
      specifiedType: const FullType(BuiltList, [FullType(RestaurantResource)]),
    );
    yield r'pagination';
    yield serializers.serialize(
      object.pagination,
      specifiedType: const FullType(RestaurantSearchPagination),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RestaurantSearchResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required RestaurantSearchResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'requestId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.requestId = valueDes;
          break;
        case r'resolved':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(GeoResolution),
          ) as GeoResolution;
          result.resolved.replace(valueDes);
          break;
        case r'appliedFilters':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AppliedRestaurantFilters),
          ) as AppliedRestaurantFilters;
          result.appliedFilters.replace(valueDes);
          break;
        case r'partialResults':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.partialResults = valueDes;
          break;
        case r'providerStatuses':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(ProviderOperationStatus)]),
          ) as BuiltList<ProviderOperationStatus>;
          result.providerStatuses.replace(valueDes);
          break;
        case r'results':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(RestaurantResource)]),
          ) as BuiltList<RestaurantResource>;
          result.results.replace(valueDes);
          break;
        case r'pagination':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RestaurantSearchPagination),
          ) as RestaurantSearchPagination;
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
  RestaurantSearchResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RestaurantSearchResponseBuilder();
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

