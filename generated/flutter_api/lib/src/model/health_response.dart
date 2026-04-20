//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:pekopeko_api/src/model/api_version.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'health_response.g.dart';

/// HealthResponse
///
/// Properties:
/// * [status] 
/// * [time] 
/// * [version] 
@BuiltValue()
abstract class HealthResponse implements Built<HealthResponse, HealthResponseBuilder> {
  @BuiltValueField(wireName: r'status')
  HealthResponseStatusEnum get status;
  // enum statusEnum {  ok,  };

  @BuiltValueField(wireName: r'time')
  DateTime get time;

  @BuiltValueField(wireName: r'version')
  ApiVersion get version;
  // enum versionEnum {  v1,  };

  HealthResponse._();

  factory HealthResponse([void updates(HealthResponseBuilder b)]) = _$HealthResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(HealthResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<HealthResponse> get serializer => _$HealthResponseSerializer();
}

class _$HealthResponseSerializer implements PrimitiveSerializer<HealthResponse> {
  @override
  final Iterable<Type> types = const [HealthResponse, _$HealthResponse];

  @override
  final String wireName = r'HealthResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    HealthResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(HealthResponseStatusEnum),
    );
    yield r'time';
    yield serializers.serialize(
      object.time,
      specifiedType: const FullType(DateTime),
    );
    yield r'version';
    yield serializers.serialize(
      object.version,
      specifiedType: const FullType(ApiVersion),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    HealthResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required HealthResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(HealthResponseStatusEnum),
          ) as HealthResponseStatusEnum;
          result.status = valueDes;
          break;
        case r'time':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.time = valueDes;
          break;
        case r'version':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ApiVersion),
          ) as ApiVersion;
          result.version = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  HealthResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = HealthResponseBuilder();
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

class HealthResponseStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'ok')
  static const HealthResponseStatusEnum ok = _$healthResponseStatusEnum_ok;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const HealthResponseStatusEnum unknownDefaultOpenApi = _$healthResponseStatusEnum_unknownDefaultOpenApi;

  static Serializer<HealthResponseStatusEnum> get serializer => _$healthResponseStatusEnumSerializer;

  const HealthResponseStatusEnum._(String name): super(name);

  static BuiltSet<HealthResponseStatusEnum> get values => _$healthResponseStatusEnumValues;
  static HealthResponseStatusEnum valueOf(String name) => _$healthResponseStatusEnumValueOf(name);
}

