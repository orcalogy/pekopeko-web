//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:pekopeko_api/src/model/api_error_code.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'upstream_error_info.g.dart';

/// UpstreamErrorInfo
///
/// Properties:
/// * [code] 
/// * [message] 
@BuiltValue()
abstract class UpstreamErrorInfo implements Built<UpstreamErrorInfo, UpstreamErrorInfoBuilder> {
  @BuiltValueField(wireName: r'code')
  ApiErrorCode get code;
  // enum codeEnum {  invalid_argument,  not_found,  rate_limited,  provider_unavailable,  quota_exhausted,  upstream_error,  internal,  };

  @BuiltValueField(wireName: r'message')
  String get message;

  UpstreamErrorInfo._();

  factory UpstreamErrorInfo([void updates(UpstreamErrorInfoBuilder b)]) = _$UpstreamErrorInfo;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(UpstreamErrorInfoBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<UpstreamErrorInfo> get serializer => _$UpstreamErrorInfoSerializer();
}

class _$UpstreamErrorInfoSerializer implements PrimitiveSerializer<UpstreamErrorInfo> {
  @override
  final Iterable<Type> types = const [UpstreamErrorInfo, _$UpstreamErrorInfo];

  @override
  final String wireName = r'UpstreamErrorInfo';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    UpstreamErrorInfo object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(ApiErrorCode),
    );
    yield r'message';
    yield serializers.serialize(
      object.message,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    UpstreamErrorInfo object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required UpstreamErrorInfoBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ApiErrorCode),
          ) as ApiErrorCode;
          result.code = valueDes;
          break;
        case r'message':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.message = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  UpstreamErrorInfo deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = UpstreamErrorInfoBuilder();
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

