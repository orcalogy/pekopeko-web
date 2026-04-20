//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'provider_source.g.dart';

class ProviderSource extends EnumClass {

  @BuiltValueEnumConst(wireName: r'google')
  static const ProviderSource google = _$google;
  @BuiltValueEnumConst(wireName: r'hotpepper')
  static const ProviderSource hotpepper = _$hotpepper;
  @BuiltValueEnumConst(wireName: r'amap')
  static const ProviderSource amap = _$amap;
  @BuiltValueEnumConst(wireName: r'hybrid')
  static const ProviderSource hybrid = _$hybrid;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const ProviderSource unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<ProviderSource> get serializer => _$providerSourceSerializer;

  const ProviderSource._(String name): super(name);

  static BuiltSet<ProviderSource> get values => _$values;
  static ProviderSource valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class ProviderSourceMixin = Object with _$ProviderSourceMixin;

