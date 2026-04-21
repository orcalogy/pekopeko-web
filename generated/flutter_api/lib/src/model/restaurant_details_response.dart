//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:pekopeko_api/src/model/restaurant_details_freshness.dart';
import 'package:built_collection/built_collection.dart';
import 'package:pekopeko_api/src/model/provider_operation_status.dart';
import 'package:pekopeko_api/src/model/restaurant_details_resource.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restaurant_details_response.g.dart';

/// RestaurantDetailsResponse
///
/// Properties:
/// * [requestId] 
/// * [restaurant] 
/// * [freshness] 
/// * [providerStatuses] 
@BuiltValue()
abstract class RestaurantDetailsResponse implements Built<RestaurantDetailsResponse, RestaurantDetailsResponseBuilder> {
  @BuiltValueField(wireName: r'requestId')
  String get requestId;

  @BuiltValueField(wireName: r'restaurant')
  RestaurantDetailsResource get restaurant;

  @BuiltValueField(wireName: r'freshness')
  RestaurantDetailsFreshness get freshness;

  @BuiltValueField(wireName: r'providerStatuses')
  BuiltList<ProviderOperationStatus> get providerStatuses;

  RestaurantDetailsResponse._();

  factory RestaurantDetailsResponse([void updates(RestaurantDetailsResponseBuilder b)]) = _$RestaurantDetailsResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RestaurantDetailsResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RestaurantDetailsResponse> get serializer => _$RestaurantDetailsResponseSerializer();
}

class _$RestaurantDetailsResponseSerializer implements PrimitiveSerializer<RestaurantDetailsResponse> {
  @override
  final Iterable<Type> types = const [RestaurantDetailsResponse, _$RestaurantDetailsResponse];

  @override
  final String wireName = r'RestaurantDetailsResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RestaurantDetailsResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'requestId';
    yield serializers.serialize(
      object.requestId,
      specifiedType: const FullType(String),
    );
    yield r'restaurant';
    yield serializers.serialize(
      object.restaurant,
      specifiedType: const FullType(RestaurantDetailsResource),
    );
    yield r'freshness';
    yield serializers.serialize(
      object.freshness,
      specifiedType: const FullType(RestaurantDetailsFreshness),
    );
    yield r'providerStatuses';
    yield serializers.serialize(
      object.providerStatuses,
      specifiedType: const FullType(BuiltList, [FullType(ProviderOperationStatus)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RestaurantDetailsResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required RestaurantDetailsResponseBuilder result,
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
        case r'restaurant':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RestaurantDetailsResource),
          ) as RestaurantDetailsResource;
          result.restaurant.replace(valueDes);
          break;
        case r'freshness':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RestaurantDetailsFreshness),
          ) as RestaurantDetailsFreshness;
          result.freshness.replace(valueDes);
          break;
        case r'providerStatuses':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(ProviderOperationStatus)]),
          ) as BuiltList<ProviderOperationStatus>;
          result.providerStatuses.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RestaurantDetailsResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RestaurantDetailsResponseBuilder();
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

