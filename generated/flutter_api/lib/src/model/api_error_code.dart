//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'api_error_code.g.dart';

class ApiErrorCode extends EnumClass {

  @BuiltValueEnumConst(wireName: r'invalid_argument')
  static const ApiErrorCode invalidArgument = _$invalidArgument;
  @BuiltValueEnumConst(wireName: r'not_found')
  static const ApiErrorCode notFound = _$notFound;
  @BuiltValueEnumConst(wireName: r'rate_limited')
  static const ApiErrorCode rateLimited = _$rateLimited;
  @BuiltValueEnumConst(wireName: r'provider_unavailable')
  static const ApiErrorCode providerUnavailable = _$providerUnavailable;
  @BuiltValueEnumConst(wireName: r'quota_exhausted')
  static const ApiErrorCode quotaExhausted = _$quotaExhausted;
  @BuiltValueEnumConst(wireName: r'upstream_error')
  static const ApiErrorCode upstreamError = _$upstreamError;
  @BuiltValueEnumConst(wireName: r'internal')
  static const ApiErrorCode internal = _$internal;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const ApiErrorCode unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<ApiErrorCode> get serializer => _$apiErrorCodeSerializer;

  const ApiErrorCode._(String name): super(name);

  static BuiltSet<ApiErrorCode> get values => _$values;
  static ApiErrorCode valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class ApiErrorCodeMixin = Object with _$ApiErrorCodeMixin;

