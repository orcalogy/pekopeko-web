//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restaurant_sort_by.g.dart';

class RestaurantSortBy extends EnumClass {

  @BuiltValueEnumConst(wireName: r'distance')
  static const RestaurantSortBy distance = _$distance;
  @BuiltValueEnumConst(wireName: r'rating')
  static const RestaurantSortBy rating = _$rating;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const RestaurantSortBy unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<RestaurantSortBy> get serializer => _$restaurantSortBySerializer;

  const RestaurantSortBy._(String name): super(name);

  static BuiltSet<RestaurantSortBy> get values => _$values;
  static RestaurantSortBy valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class RestaurantSortByMixin = Object with _$RestaurantSortByMixin;

