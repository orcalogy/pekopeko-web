//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restaurant_search_request_location.g.dart';

/// RestaurantSearchRequestLocation
///
/// Properties:
/// * [lat] 
/// * [lng] 
@BuiltValue()
abstract class RestaurantSearchRequestLocation implements Built<RestaurantSearchRequestLocation, RestaurantSearchRequestLocationBuilder> {
  @BuiltValueField(wireName: r'lat')
  double get lat;

  @BuiltValueField(wireName: r'lng')
  double get lng;

  RestaurantSearchRequestLocation._();

  factory RestaurantSearchRequestLocation([void updates(RestaurantSearchRequestLocationBuilder b)]) = _$RestaurantSearchRequestLocation;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RestaurantSearchRequestLocationBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RestaurantSearchRequestLocation> get serializer => _$RestaurantSearchRequestLocationSerializer();
}

class _$RestaurantSearchRequestLocationSerializer implements PrimitiveSerializer<RestaurantSearchRequestLocation> {
  @override
  final Iterable<Type> types = const [RestaurantSearchRequestLocation, _$RestaurantSearchRequestLocation];

  @override
  final String wireName = r'RestaurantSearchRequestLocation';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RestaurantSearchRequestLocation object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'lat';
    yield serializers.serialize(
      object.lat,
      specifiedType: const FullType(double),
    );
    yield r'lng';
    yield serializers.serialize(
      object.lng,
      specifiedType: const FullType(double),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RestaurantSearchRequestLocation object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required RestaurantSearchRequestLocationBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'lat':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.lat = valueDes;
          break;
        case r'lng':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.lng = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RestaurantSearchRequestLocation deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RestaurantSearchRequestLocationBuilder();
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

