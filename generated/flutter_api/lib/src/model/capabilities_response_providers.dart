//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:pekopeko_api/src/model/provider_configuration.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'capabilities_response_providers.g.dart';

/// CapabilitiesResponseProviders
///
/// Properties:
/// * [google] 
/// * [hotpepper] 
/// * [amap] 
@BuiltValue()
abstract class CapabilitiesResponseProviders implements Built<CapabilitiesResponseProviders, CapabilitiesResponseProvidersBuilder> {
  @BuiltValueField(wireName: r'google')
  ProviderConfiguration get google;

  @BuiltValueField(wireName: r'hotpepper')
  ProviderConfiguration get hotpepper;

  @BuiltValueField(wireName: r'amap')
  ProviderConfiguration get amap;

  CapabilitiesResponseProviders._();

  factory CapabilitiesResponseProviders([void updates(CapabilitiesResponseProvidersBuilder b)]) = _$CapabilitiesResponseProviders;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CapabilitiesResponseProvidersBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CapabilitiesResponseProviders> get serializer => _$CapabilitiesResponseProvidersSerializer();
}

class _$CapabilitiesResponseProvidersSerializer implements PrimitiveSerializer<CapabilitiesResponseProviders> {
  @override
  final Iterable<Type> types = const [CapabilitiesResponseProviders, _$CapabilitiesResponseProviders];

  @override
  final String wireName = r'CapabilitiesResponseProviders';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CapabilitiesResponseProviders object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'google';
    yield serializers.serialize(
      object.google,
      specifiedType: const FullType(ProviderConfiguration),
    );
    yield r'hotpepper';
    yield serializers.serialize(
      object.hotpepper,
      specifiedType: const FullType(ProviderConfiguration),
    );
    yield r'amap';
    yield serializers.serialize(
      object.amap,
      specifiedType: const FullType(ProviderConfiguration),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CapabilitiesResponseProviders object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required CapabilitiesResponseProvidersBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'google':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ProviderConfiguration),
          ) as ProviderConfiguration;
          result.google.replace(valueDes);
          break;
        case r'hotpepper':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ProviderConfiguration),
          ) as ProviderConfiguration;
          result.hotpepper.replace(valueDes);
          break;
        case r'amap':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ProviderConfiguration),
          ) as ProviderConfiguration;
          result.amap.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CapabilitiesResponseProviders deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CapabilitiesResponseProvidersBuilder();
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

