//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restaurant_search_pagination_request.g.dart';

/// RestaurantSearchPaginationRequest
///
/// Properties:
/// * [pageSize] 
/// * [offset] 
@BuiltValue()
abstract class RestaurantSearchPaginationRequest implements Built<RestaurantSearchPaginationRequest, RestaurantSearchPaginationRequestBuilder> {
  @BuiltValueField(wireName: r'pageSize')
  int? get pageSize;

  @BuiltValueField(wireName: r'offset')
  int? get offset;

  RestaurantSearchPaginationRequest._();

  factory RestaurantSearchPaginationRequest([void updates(RestaurantSearchPaginationRequestBuilder b)]) = _$RestaurantSearchPaginationRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RestaurantSearchPaginationRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RestaurantSearchPaginationRequest> get serializer => _$RestaurantSearchPaginationRequestSerializer();
}

class _$RestaurantSearchPaginationRequestSerializer implements PrimitiveSerializer<RestaurantSearchPaginationRequest> {
  @override
  final Iterable<Type> types = const [RestaurantSearchPaginationRequest, _$RestaurantSearchPaginationRequest];

  @override
  final String wireName = r'RestaurantSearchPaginationRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RestaurantSearchPaginationRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.pageSize != null) {
      yield r'pageSize';
      yield serializers.serialize(
        object.pageSize,
        specifiedType: const FullType(int),
      );
    }
    if (object.offset != null) {
      yield r'offset';
      yield serializers.serialize(
        object.offset,
        specifiedType: const FullType(int),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    RestaurantSearchPaginationRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required RestaurantSearchPaginationRequestBuilder result,
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
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RestaurantSearchPaginationRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RestaurantSearchPaginationRequestBuilder();
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

