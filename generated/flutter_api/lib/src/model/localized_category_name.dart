//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'localized_category_name.g.dart';

/// LocalizedCategoryName
///
/// Properties:
/// * [zhCN] 
/// * [ja] 
/// * [en] 
@BuiltValue()
abstract class LocalizedCategoryName implements Built<LocalizedCategoryName, LocalizedCategoryNameBuilder> {
  @BuiltValueField(wireName: r'zh-CN')
  String get zhCN;

  @BuiltValueField(wireName: r'ja')
  String get ja;

  @BuiltValueField(wireName: r'en')
  String get en;

  LocalizedCategoryName._();

  factory LocalizedCategoryName([void updates(LocalizedCategoryNameBuilder b)]) = _$LocalizedCategoryName;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(LocalizedCategoryNameBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<LocalizedCategoryName> get serializer => _$LocalizedCategoryNameSerializer();
}

class _$LocalizedCategoryNameSerializer implements PrimitiveSerializer<LocalizedCategoryName> {
  @override
  final Iterable<Type> types = const [LocalizedCategoryName, _$LocalizedCategoryName];

  @override
  final String wireName = r'LocalizedCategoryName';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    LocalizedCategoryName object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'zh-CN';
    yield serializers.serialize(
      object.zhCN,
      specifiedType: const FullType(String),
    );
    yield r'ja';
    yield serializers.serialize(
      object.ja,
      specifiedType: const FullType(String),
    );
    yield r'en';
    yield serializers.serialize(
      object.en,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    LocalizedCategoryName object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required LocalizedCategoryNameBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'zh-CN':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.zhCN = valueDes;
          break;
        case r'ja':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.ja = valueDes;
          break;
        case r'en':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.en = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  LocalizedCategoryName deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = LocalizedCategoryNameBuilder();
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

