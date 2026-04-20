//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:pekopeko_api/src/model/upstream_error_info.dart';
import 'package:pekopeko_api/src/model/provider_kind.dart';
import 'package:pekopeko_api/src/model/provider_operation_status_state.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'provider_operation_status.g.dart';

/// ProviderOperationStatus
///
/// Properties:
/// * [provider] 
/// * [status] 
/// * [rawResults] 
/// * [error] 
@BuiltValue()
abstract class ProviderOperationStatus implements Built<ProviderOperationStatus, ProviderOperationStatusBuilder> {
  @BuiltValueField(wireName: r'provider')
  ProviderKind get provider;
  // enum providerEnum {  google,  hotpepper,  amap,  };

  @BuiltValueField(wireName: r'status')
  ProviderOperationStatusState get status;
  // enum statusEnum {  success,  failed,  };

  @BuiltValueField(wireName: r'rawResults')
  int? get rawResults;

  @BuiltValueField(wireName: r'error')
  UpstreamErrorInfo? get error;

  ProviderOperationStatus._();

  factory ProviderOperationStatus([void updates(ProviderOperationStatusBuilder b)]) = _$ProviderOperationStatus;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ProviderOperationStatusBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ProviderOperationStatus> get serializer => _$ProviderOperationStatusSerializer();
}

class _$ProviderOperationStatusSerializer implements PrimitiveSerializer<ProviderOperationStatus> {
  @override
  final Iterable<Type> types = const [ProviderOperationStatus, _$ProviderOperationStatus];

  @override
  final String wireName = r'ProviderOperationStatus';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ProviderOperationStatus object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'provider';
    yield serializers.serialize(
      object.provider,
      specifiedType: const FullType(ProviderKind),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(ProviderOperationStatusState),
    );
    if (object.rawResults != null) {
      yield r'rawResults';
      yield serializers.serialize(
        object.rawResults,
        specifiedType: const FullType(int),
      );
    }
    if (object.error != null) {
      yield r'error';
      yield serializers.serialize(
        object.error,
        specifiedType: const FullType(UpstreamErrorInfo),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    ProviderOperationStatus object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required ProviderOperationStatusBuilder result,
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
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ProviderOperationStatusState),
          ) as ProviderOperationStatusState;
          result.status = valueDes;
          break;
        case r'rawResults':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.rawResults = valueDes;
          break;
        case r'error':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(UpstreamErrorInfo),
          ) as UpstreamErrorInfo;
          result.error.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ProviderOperationStatus deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ProviderOperationStatusBuilder();
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

