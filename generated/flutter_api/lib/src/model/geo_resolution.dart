//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:pekopeko_api/src/model/geo_resolution_confidence.dart';
import 'package:pekopeko_api/src/model/provider_kind.dart';
import 'package:pekopeko_api/src/model/geo_resolution_strategy.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'geo_resolution.g.dart';

/// GeoResolution
///
/// Properties:
/// * [country] 
/// * [provider] 
/// * [providerPlan] 
/// * [strategy] 
/// * [confidence] 
@BuiltValue()
abstract class GeoResolution implements Built<GeoResolution, GeoResolutionBuilder> {
  @BuiltValueField(wireName: r'country')
  String get country;

  @BuiltValueField(wireName: r'provider')
  ProviderKind get provider;
  // enum providerEnum {  google,  hotpepper,  amap,  };

  @BuiltValueField(wireName: r'providerPlan')
  BuiltList<ProviderKind> get providerPlan;

  @BuiltValueField(wireName: r'strategy')
  GeoResolutionStrategy get strategy;
  // enum strategyEnum {  china_amap,  hybrid_japan,  google_global,  fallback_heuristic,  manual_override,  };

  @BuiltValueField(wireName: r'confidence')
  GeoResolutionConfidence get confidence;
  // enum confidenceEnum {  high,  medium,  low,  };

  GeoResolution._();

  factory GeoResolution([void updates(GeoResolutionBuilder b)]) = _$GeoResolution;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(GeoResolutionBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<GeoResolution> get serializer => _$GeoResolutionSerializer();
}

class _$GeoResolutionSerializer implements PrimitiveSerializer<GeoResolution> {
  @override
  final Iterable<Type> types = const [GeoResolution, _$GeoResolution];

  @override
  final String wireName = r'GeoResolution';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    GeoResolution object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'country';
    yield serializers.serialize(
      object.country,
      specifiedType: const FullType(String),
    );
    yield r'provider';
    yield serializers.serialize(
      object.provider,
      specifiedType: const FullType(ProviderKind),
    );
    yield r'providerPlan';
    yield serializers.serialize(
      object.providerPlan,
      specifiedType: const FullType(BuiltList, [FullType(ProviderKind)]),
    );
    yield r'strategy';
    yield serializers.serialize(
      object.strategy,
      specifiedType: const FullType(GeoResolutionStrategy),
    );
    yield r'confidence';
    yield serializers.serialize(
      object.confidence,
      specifiedType: const FullType(GeoResolutionConfidence),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    GeoResolution object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required GeoResolutionBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'country':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.country = valueDes;
          break;
        case r'provider':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ProviderKind),
          ) as ProviderKind;
          result.provider = valueDes;
          break;
        case r'providerPlan':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(ProviderKind)]),
          ) as BuiltList<ProviderKind>;
          result.providerPlan.replace(valueDes);
          break;
        case r'strategy':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(GeoResolutionStrategy),
          ) as GeoResolutionStrategy;
          result.strategy = valueDes;
          break;
        case r'confidence':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(GeoResolutionConfidence),
          ) as GeoResolutionConfidence;
          result.confidence = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  GeoResolution deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = GeoResolutionBuilder();
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

