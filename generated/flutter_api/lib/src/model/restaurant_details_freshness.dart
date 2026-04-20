//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:pekopeko_api/src/model/detail_freshness_state.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restaurant_details_freshness.g.dart';

/// RestaurantDetailsFreshness
///
/// Properties:
/// * [state] 
@BuiltValue()
abstract class RestaurantDetailsFreshness implements Built<RestaurantDetailsFreshness, RestaurantDetailsFreshnessBuilder> {
  @BuiltValueField(wireName: r'state')
  DetailFreshnessState get state;
  // enum stateEnum {  live,  partial_live,  snapshot,  };

  RestaurantDetailsFreshness._();

  factory RestaurantDetailsFreshness([void updates(RestaurantDetailsFreshnessBuilder b)]) = _$RestaurantDetailsFreshness;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RestaurantDetailsFreshnessBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RestaurantDetailsFreshness> get serializer => _$RestaurantDetailsFreshnessSerializer();
}

class _$RestaurantDetailsFreshnessSerializer implements PrimitiveSerializer<RestaurantDetailsFreshness> {
  @override
  final Iterable<Type> types = const [RestaurantDetailsFreshness, _$RestaurantDetailsFreshness];

  @override
  final String wireName = r'RestaurantDetailsFreshness';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RestaurantDetailsFreshness object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'state';
    yield serializers.serialize(
      object.state,
      specifiedType: const FullType(DetailFreshnessState),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RestaurantDetailsFreshness object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required RestaurantDetailsFreshnessBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'state':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DetailFreshnessState),
          ) as DetailFreshnessState;
          result.state = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RestaurantDetailsFreshness deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RestaurantDetailsFreshnessBuilder();
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

