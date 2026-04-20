//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restaurant_search_query.g.dart';

/// RestaurantSearchQuery
///
/// Properties:
/// * [keyword] 
/// * [categoryId] 
@BuiltValue()
abstract class RestaurantSearchQuery implements Built<RestaurantSearchQuery, RestaurantSearchQueryBuilder> {
  @BuiltValueField(wireName: r'keyword')
  String? get keyword;

  @BuiltValueField(wireName: r'categoryId')
  String? get categoryId;

  RestaurantSearchQuery._();

  factory RestaurantSearchQuery([void updates(RestaurantSearchQueryBuilder b)]) = _$RestaurantSearchQuery;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RestaurantSearchQueryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RestaurantSearchQuery> get serializer => _$RestaurantSearchQuerySerializer();
}

class _$RestaurantSearchQuerySerializer implements PrimitiveSerializer<RestaurantSearchQuery> {
  @override
  final Iterable<Type> types = const [RestaurantSearchQuery, _$RestaurantSearchQuery];

  @override
  final String wireName = r'RestaurantSearchQuery';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RestaurantSearchQuery object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.keyword != null) {
      yield r'keyword';
      yield serializers.serialize(
        object.keyword,
        specifiedType: const FullType(String),
      );
    }
    if (object.categoryId != null) {
      yield r'categoryId';
      yield serializers.serialize(
        object.categoryId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    RestaurantSearchQuery object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required RestaurantSearchQueryBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'keyword':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.keyword = valueDes;
          break;
        case r'categoryId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.categoryId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RestaurantSearchQuery deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RestaurantSearchQueryBuilder();
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

