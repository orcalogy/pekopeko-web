//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:pekopeko_api/src/model/geo_resolution_confidence.dart';
import 'package:pekopeko_api/src/model/geo_resolution_strategy.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'capabilities_response_geo.g.dart';

/// CapabilitiesResponseGeo
///
/// Properties:
/// * [strategies] 
/// * [confidences] 
@BuiltValue()
abstract class CapabilitiesResponseGeo implements Built<CapabilitiesResponseGeo, CapabilitiesResponseGeoBuilder> {
  @BuiltValueField(wireName: r'strategies')
  BuiltList<GeoResolutionStrategy> get strategies;

  @BuiltValueField(wireName: r'confidences')
  BuiltList<GeoResolutionConfidence> get confidences;

  CapabilitiesResponseGeo._();

  factory CapabilitiesResponseGeo([void updates(CapabilitiesResponseGeoBuilder b)]) = _$CapabilitiesResponseGeo;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CapabilitiesResponseGeoBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CapabilitiesResponseGeo> get serializer => _$CapabilitiesResponseGeoSerializer();
}

class _$CapabilitiesResponseGeoSerializer implements PrimitiveSerializer<CapabilitiesResponseGeo> {
  @override
  final Iterable<Type> types = const [CapabilitiesResponseGeo, _$CapabilitiesResponseGeo];

  @override
  final String wireName = r'CapabilitiesResponseGeo';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CapabilitiesResponseGeo object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'strategies';
    yield serializers.serialize(
      object.strategies,
      specifiedType: const FullType(BuiltList, [FullType(GeoResolutionStrategy)]),
    );
    yield r'confidences';
    yield serializers.serialize(
      object.confidences,
      specifiedType: const FullType(BuiltList, [FullType(GeoResolutionConfidence)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CapabilitiesResponseGeo object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required CapabilitiesResponseGeoBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'strategies':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(GeoResolutionStrategy)]),
          ) as BuiltList<GeoResolutionStrategy>;
          result.strategies.replace(valueDes);
          break;
        case r'confidences':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(GeoResolutionConfidence)]),
          ) as BuiltList<GeoResolutionConfidence>;
          result.confidences.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CapabilitiesResponseGeo deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CapabilitiesResponseGeoBuilder();
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

