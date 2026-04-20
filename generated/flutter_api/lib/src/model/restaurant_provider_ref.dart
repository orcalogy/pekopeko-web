//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:pekopeko_api/src/model/provider_kind.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restaurant_provider_ref.g.dart';

/// RestaurantProviderRef
///
/// Properties:
/// * [provider] 
/// * [providerId] 
@BuiltValue()
abstract class RestaurantProviderRef implements Built<RestaurantProviderRef, RestaurantProviderRefBuilder> {
  @BuiltValueField(wireName: r'provider')
  ProviderKind get provider;
  // enum providerEnum {  google,  hotpepper,  amap,  };

  @BuiltValueField(wireName: r'providerId')
  String get providerId;

  RestaurantProviderRef._();

  factory RestaurantProviderRef([void updates(RestaurantProviderRefBuilder b)]) = _$RestaurantProviderRef;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RestaurantProviderRefBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RestaurantProviderRef> get serializer => _$RestaurantProviderRefSerializer();
}

class _$RestaurantProviderRefSerializer implements PrimitiveSerializer<RestaurantProviderRef> {
  @override
  final Iterable<Type> types = const [RestaurantProviderRef, _$RestaurantProviderRef];

  @override
  final String wireName = r'RestaurantProviderRef';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RestaurantProviderRef object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'provider';
    yield serializers.serialize(
      object.provider,
      specifiedType: const FullType(ProviderKind),
    );
    yield r'providerId';
    yield serializers.serialize(
      object.providerId,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RestaurantProviderRef object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required RestaurantProviderRefBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'provider':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ProviderKind),
          ) as ProviderKind;
          result.provider = valueDes;
          break;
        case r'providerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.providerId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RestaurantProviderRef deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RestaurantProviderRefBuilder();
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

