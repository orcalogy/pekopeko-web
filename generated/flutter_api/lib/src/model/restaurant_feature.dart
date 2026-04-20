//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restaurant_feature.g.dart';

class RestaurantFeature extends EnumClass {

  @BuiltValueEnumConst(wireName: r'wifi')
  static const RestaurantFeature wifi = _$wifi;
  @BuiltValueEnumConst(wireName: r'lunch')
  static const RestaurantFeature lunch = _$lunch;
  @BuiltValueEnumConst(wireName: r'private_room')
  static const RestaurantFeature privateRoom = _$privateRoom;
  @BuiltValueEnumConst(wireName: r'english')
  static const RestaurantFeature english = _$english;
  @BuiltValueEnumConst(wireName: r'non_smoking')
  static const RestaurantFeature nonSmoking = _$nonSmoking;
  @BuiltValueEnumConst(wireName: r'card')
  static const RestaurantFeature card = _$card;
  @BuiltValueEnumConst(wireName: r'parking')
  static const RestaurantFeature parking = _$parking;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const RestaurantFeature unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<RestaurantFeature> get serializer => _$restaurantFeatureSerializer;

  const RestaurantFeature._(String name): super(name);

  static BuiltSet<RestaurantFeature> get values => _$values;
  static RestaurantFeature valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class RestaurantFeatureMixin = Object with _$RestaurantFeatureMixin;

