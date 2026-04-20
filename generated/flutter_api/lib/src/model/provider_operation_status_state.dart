//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'provider_operation_status_state.g.dart';

class ProviderOperationStatusState extends EnumClass {

  @BuiltValueEnumConst(wireName: r'success')
  static const ProviderOperationStatusState success = _$success;
  @BuiltValueEnumConst(wireName: r'failed')
  static const ProviderOperationStatusState failed = _$failed;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const ProviderOperationStatusState unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<ProviderOperationStatusState> get serializer => _$providerOperationStatusStateSerializer;

  const ProviderOperationStatusState._(String name): super(name);

  static BuiltSet<ProviderOperationStatusState> get values => _$values;
  static ProviderOperationStatusState valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class ProviderOperationStatusStateMixin = Object with _$ProviderOperationStatusStateMixin;

