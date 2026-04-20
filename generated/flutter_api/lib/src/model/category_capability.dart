//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:pekopeko_api/src/model/localized_category_name.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'category_capability.g.dart';

/// CategoryCapability
///
/// Properties:
/// * [id] 
/// * [name] 
/// * [color] 
@BuiltValue()
abstract class CategoryCapability implements Built<CategoryCapability, CategoryCapabilityBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'name')
  LocalizedCategoryName get name;

  @BuiltValueField(wireName: r'color')
  String get color;

  CategoryCapability._();

  factory CategoryCapability([void updates(CategoryCapabilityBuilder b)]) = _$CategoryCapability;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CategoryCapabilityBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CategoryCapability> get serializer => _$CategoryCapabilitySerializer();
}

class _$CategoryCapabilitySerializer implements PrimitiveSerializer<CategoryCapability> {
  @override
  final Iterable<Type> types = const [CategoryCapability, _$CategoryCapability];

  @override
  final String wireName = r'CategoryCapability';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CategoryCapability object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(LocalizedCategoryName),
    );
    yield r'color';
    yield serializers.serialize(
      object.color,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CategoryCapability object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required CategoryCapabilityBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(LocalizedCategoryName),
          ) as LocalizedCategoryName;
          result.name.replace(valueDes);
          break;
        case r'color':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.color = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CategoryCapability deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CategoryCapabilityBuilder();
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

