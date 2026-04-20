//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:pekopeko_api/src/model/restaurant_sort_by.dart';
import 'package:pekopeko_api/src/model/restaurant_feature.dart';
import 'package:pekopeko_api/src/model/sort_direction.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'applied_restaurant_filters.g.dart';

/// AppliedRestaurantFilters
///
/// Properties:
/// * [openNow] 
/// * [minRating] 
/// * [maxPriceLevel] 
/// * [partySize] 
/// * [requiredFeatures] 
/// * [sortBy] 
/// * [sortDirection] 
@BuiltValue()
abstract class AppliedRestaurantFilters implements Built<AppliedRestaurantFilters, AppliedRestaurantFiltersBuilder> {
  @BuiltValueField(wireName: r'openNow')
  bool get openNow;

  @BuiltValueField(wireName: r'minRating')
  double? get minRating;

  @BuiltValueField(wireName: r'maxPriceLevel')
  int? get maxPriceLevel;

  @BuiltValueField(wireName: r'partySize')
  int? get partySize;

  @BuiltValueField(wireName: r'requiredFeatures')
  BuiltList<RestaurantFeature> get requiredFeatures;

  @BuiltValueField(wireName: r'sortBy')
  RestaurantSortBy get sortBy;
  // enum sortByEnum {  distance,  rating,  };

  @BuiltValueField(wireName: r'sortDirection')
  SortDirection get sortDirection;
  // enum sortDirectionEnum {  asc,  desc,  };

  AppliedRestaurantFilters._();

  factory AppliedRestaurantFilters([void updates(AppliedRestaurantFiltersBuilder b)]) = _$AppliedRestaurantFilters;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AppliedRestaurantFiltersBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AppliedRestaurantFilters> get serializer => _$AppliedRestaurantFiltersSerializer();
}

class _$AppliedRestaurantFiltersSerializer implements PrimitiveSerializer<AppliedRestaurantFilters> {
  @override
  final Iterable<Type> types = const [AppliedRestaurantFilters, _$AppliedRestaurantFilters];

  @override
  final String wireName = r'AppliedRestaurantFilters';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AppliedRestaurantFilters object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'openNow';
    yield serializers.serialize(
      object.openNow,
      specifiedType: const FullType(bool),
    );
    if (object.minRating != null) {
      yield r'minRating';
      yield serializers.serialize(
        object.minRating,
        specifiedType: const FullType(double),
      );
    }
    if (object.maxPriceLevel != null) {
      yield r'maxPriceLevel';
      yield serializers.serialize(
        object.maxPriceLevel,
        specifiedType: const FullType(int),
      );
    }
    if (object.partySize != null) {
      yield r'partySize';
      yield serializers.serialize(
        object.partySize,
        specifiedType: const FullType(int),
      );
    }
    yield r'requiredFeatures';
    yield serializers.serialize(
      object.requiredFeatures,
      specifiedType: const FullType(BuiltList, [FullType(RestaurantFeature)]),
    );
    yield r'sortBy';
    yield serializers.serialize(
      object.sortBy,
      specifiedType: const FullType(RestaurantSortBy),
    );
    yield r'sortDirection';
    yield serializers.serialize(
      object.sortDirection,
      specifiedType: const FullType(SortDirection),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    AppliedRestaurantFilters object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AppliedRestaurantFiltersBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'openNow':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.openNow = valueDes;
          break;
        case r'minRating':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.minRating = valueDes;
          break;
        case r'maxPriceLevel':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.maxPriceLevel = valueDes;
          break;
        case r'partySize':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.partySize = valueDes;
          break;
        case r'requiredFeatures':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(RestaurantFeature)]),
          ) as BuiltList<RestaurantFeature>;
          result.requiredFeatures.replace(valueDes);
          break;
        case r'sortBy':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RestaurantSortBy),
          ) as RestaurantSortBy;
          result.sortBy = valueDes;
          break;
        case r'sortDirection':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SortDirection),
          ) as SortDirection;
          result.sortDirection = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AppliedRestaurantFilters deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AppliedRestaurantFiltersBuilder();
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

