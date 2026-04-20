//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restaurant_search_pagination.g.dart';

/// RestaurantSearchPagination
///
/// Properties:
/// * [pageSize] 
/// * [offset] 
/// * [nextOffset] 
/// * [returned] 
/// * [total] 
@BuiltValue()
abstract class RestaurantSearchPagination implements Built<RestaurantSearchPagination, RestaurantSearchPaginationBuilder> {
  @BuiltValueField(wireName: r'pageSize')
  int get pageSize;

  @BuiltValueField(wireName: r'offset')
  int get offset;

  @BuiltValueField(wireName: r'nextOffset')
  int? get nextOffset;

  @BuiltValueField(wireName: r'returned')
  int get returned;

  @BuiltValueField(wireName: r'total')
  int get total;

  RestaurantSearchPagination._();

  factory RestaurantSearchPagination([void updates(RestaurantSearchPaginationBuilder b)]) = _$RestaurantSearchPagination;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RestaurantSearchPaginationBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RestaurantSearchPagination> get serializer => _$RestaurantSearchPaginationSerializer();
}

class _$RestaurantSearchPaginationSerializer implements PrimitiveSerializer<RestaurantSearchPagination> {
  @override
  final Iterable<Type> types = const [RestaurantSearchPagination, _$RestaurantSearchPagination];

  @override
  final String wireName = r'RestaurantSearchPagination';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RestaurantSearchPagination object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'pageSize';
    yield serializers.serialize(
      object.pageSize,
      specifiedType: const FullType(int),
    );
    yield r'offset';
    yield serializers.serialize(
      object.offset,
      specifiedType: const FullType(int),
    );
    if (object.nextOffset != null) {
      yield r'nextOffset';
      yield serializers.serialize(
        object.nextOffset,
        specifiedType: const FullType.nullable(int),
      );
    }
    yield r'returned';
    yield serializers.serialize(
      object.returned,
      specifiedType: const FullType(int),
    );
    yield r'total';
    yield serializers.serialize(
      object.total,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RestaurantSearchPagination object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required RestaurantSearchPaginationBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'pageSize':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.pageSize = valueDes;
          break;
        case r'offset':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.offset = valueDes;
          break;
        case r'nextOffset':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.nextOffset = valueDes;
          break;
        case r'returned':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.returned = valueDes;
          break;
        case r'total':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.total = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RestaurantSearchPagination deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RestaurantSearchPaginationBuilder();
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

