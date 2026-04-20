//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'provider_configuration.g.dart';

/// ProviderConfiguration
///
/// Properties:
/// * [configured] 
@BuiltValue()
abstract class ProviderConfiguration implements Built<ProviderConfiguration, ProviderConfigurationBuilder> {
  @BuiltValueField(wireName: r'configured')
  bool get configured;

  ProviderConfiguration._();

  factory ProviderConfiguration([void updates(ProviderConfigurationBuilder b)]) = _$ProviderConfiguration;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ProviderConfigurationBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ProviderConfiguration> get serializer => _$ProviderConfigurationSerializer();
}

class _$ProviderConfigurationSerializer implements PrimitiveSerializer<ProviderConfiguration> {
  @override
  final Iterable<Type> types = const [ProviderConfiguration, _$ProviderConfiguration];

  @override
  final String wireName = r'ProviderConfiguration';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ProviderConfiguration object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'configured';
    yield serializers.serialize(
      object.configured,
      specifiedType: const FullType(bool),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    ProviderConfiguration object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required ProviderConfigurationBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'configured':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.configured = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ProviderConfiguration deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ProviderConfigurationBuilder();
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

