//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'provider_mode.g.dart';

class ProviderMode extends EnumClass {

  @BuiltValueEnumConst(wireName: r'auto')
  static const ProviderMode auto = _$auto;
  @BuiltValueEnumConst(wireName: r'google')
  static const ProviderMode google = _$google;
  @BuiltValueEnumConst(wireName: r'hotpepper')
  static const ProviderMode hotpepper = _$hotpepper;
  @BuiltValueEnumConst(wireName: r'amap')
  static const ProviderMode amap = _$amap;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const ProviderMode unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<ProviderMode> get serializer => _$providerModeSerializer;

  const ProviderMode._(String name): super(name);

  static BuiltSet<ProviderMode> get values => _$values;
  static ProviderMode valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class ProviderModeMixin = Object with _$ProviderModeMixin;

