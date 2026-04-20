//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'detail_freshness_state.g.dart';

class DetailFreshnessState extends EnumClass {

  @BuiltValueEnumConst(wireName: r'live')
  static const DetailFreshnessState live = _$live;
  @BuiltValueEnumConst(wireName: r'partial_live')
  static const DetailFreshnessState partialLive = _$partialLive;
  @BuiltValueEnumConst(wireName: r'snapshot')
  static const DetailFreshnessState snapshot = _$snapshot;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const DetailFreshnessState unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<DetailFreshnessState> get serializer => _$detailFreshnessStateSerializer;

  const DetailFreshnessState._(String name): super(name);

  static BuiltSet<DetailFreshnessState> get values => _$values;
  static DetailFreshnessState valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class DetailFreshnessStateMixin = Object with _$DetailFreshnessStateMixin;

