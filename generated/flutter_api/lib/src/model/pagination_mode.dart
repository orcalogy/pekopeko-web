//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'pagination_mode.g.dart';

class PaginationMode extends EnumClass {

  @BuiltValueEnumConst(wireName: r'offset')
  static const PaginationMode offset = _$offset;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const PaginationMode unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<PaginationMode> get serializer => _$paginationModeSerializer;

  const PaginationMode._(String name): super(name);

  static BuiltSet<PaginationMode> get values => _$values;
  static PaginationMode valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class PaginationModeMixin = Object with _$PaginationModeMixin;

