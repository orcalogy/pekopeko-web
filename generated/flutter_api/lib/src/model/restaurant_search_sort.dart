//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:pekopeko_api/src/model/restaurant_sort_by.dart';
import 'package:pekopeko_api/src/model/sort_direction.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restaurant_search_sort.g.dart';

/// RestaurantSearchSort
///
/// Properties:
/// * [by] 
/// * [direction] 
@BuiltValue()
abstract class RestaurantSearchSort implements Built<RestaurantSearchSort, RestaurantSearchSortBuilder> {
  @BuiltValueField(wireName: r'by')
  RestaurantSortBy? get by;
  // enum byEnum {  distance,  rating,  };

  @BuiltValueField(wireName: r'direction')
  SortDirection? get direction;
  // enum directionEnum {  asc,  desc,  };

  RestaurantSearchSort._();

  factory RestaurantSearchSort([void updates(RestaurantSearchSortBuilder b)]) = _$RestaurantSearchSort;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RestaurantSearchSortBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RestaurantSearchSort> get serializer => _$RestaurantSearchSortSerializer();
}

class _$RestaurantSearchSortSerializer implements PrimitiveSerializer<RestaurantSearchSort> {
  @override
  final Iterable<Type> types = const [RestaurantSearchSort, _$RestaurantSearchSort];

  @override
  final String wireName = r'RestaurantSearchSort';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RestaurantSearchSort object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.by != null) {
      yield r'by';
      yield serializers.serialize(
        object.by,
        specifiedType: const FullType(RestaurantSortBy),
      );
    }
    if (object.direction != null) {
      yield r'direction';
      yield serializers.serialize(
        object.direction,
        specifiedType: const FullType(SortDirection),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    RestaurantSearchSort object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required RestaurantSearchSortBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'by':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RestaurantSortBy),
          ) as RestaurantSortBy;
          result.by = valueDes;
          break;
        case r'direction':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SortDirection),
          ) as SortDirection;
          result.direction = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RestaurantSearchSort deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RestaurantSearchSortBuilder();
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

