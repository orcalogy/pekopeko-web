//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:pekopeko_api/src/model/api_version.dart';
import 'package:pekopeko_api/src/model/app_locale.dart';
import 'package:pekopeko_api/src/model/capabilities_response_search.dart';
import 'package:built_collection/built_collection.dart';
import 'package:pekopeko_api/src/model/category_capability.dart';
import 'package:pekopeko_api/src/model/capabilities_response_providers.dart';
import 'package:pekopeko_api/src/model/capabilities_response_geo.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'capabilities_response.g.dart';

/// CapabilitiesResponse
///
/// Properties:
/// * [version] 
/// * [locales] 
/// * [providers] 
/// * [geo] 
/// * [search] 
/// * [categories] 
@BuiltValue()
abstract class CapabilitiesResponse implements Built<CapabilitiesResponse, CapabilitiesResponseBuilder> {
  @BuiltValueField(wireName: r'version')
  ApiVersion get version;
  // enum versionEnum {  v1,  };

  @BuiltValueField(wireName: r'locales')
  BuiltList<AppLocale> get locales;

  @BuiltValueField(wireName: r'providers')
  CapabilitiesResponseProviders get providers;

  @BuiltValueField(wireName: r'geo')
  CapabilitiesResponseGeo get geo;

  @BuiltValueField(wireName: r'search')
  CapabilitiesResponseSearch get search;

  @BuiltValueField(wireName: r'categories')
  BuiltList<CategoryCapability> get categories;

  CapabilitiesResponse._();

  factory CapabilitiesResponse([void updates(CapabilitiesResponseBuilder b)]) = _$CapabilitiesResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CapabilitiesResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CapabilitiesResponse> get serializer => _$CapabilitiesResponseSerializer();
}

class _$CapabilitiesResponseSerializer implements PrimitiveSerializer<CapabilitiesResponse> {
  @override
  final Iterable<Type> types = const [CapabilitiesResponse, _$CapabilitiesResponse];

  @override
  final String wireName = r'CapabilitiesResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CapabilitiesResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'version';
    yield serializers.serialize(
      object.version,
      specifiedType: const FullType(ApiVersion),
    );
    yield r'locales';
    yield serializers.serialize(
      object.locales,
      specifiedType: const FullType(BuiltList, [FullType(AppLocale)]),
    );
    yield r'providers';
    yield serializers.serialize(
      object.providers,
      specifiedType: const FullType(CapabilitiesResponseProviders),
    );
    yield r'geo';
    yield serializers.serialize(
      object.geo,
      specifiedType: const FullType(CapabilitiesResponseGeo),
    );
    yield r'search';
    yield serializers.serialize(
      object.search,
      specifiedType: const FullType(CapabilitiesResponseSearch),
    );
    yield r'categories';
    yield serializers.serialize(
      object.categories,
      specifiedType: const FullType(BuiltList, [FullType(CategoryCapability)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CapabilitiesResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required CapabilitiesResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'version':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ApiVersion),
          ) as ApiVersion;
          result.version = valueDes;
          break;
        case r'locales':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(AppLocale)]),
          ) as BuiltList<AppLocale>;
          result.locales.replace(valueDes);
          break;
        case r'providers':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CapabilitiesResponseProviders),
          ) as CapabilitiesResponseProviders;
          result.providers.replace(valueDes);
          break;
        case r'geo':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CapabilitiesResponseGeo),
          ) as CapabilitiesResponseGeo;
          result.geo.replace(valueDes);
          break;
        case r'search':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CapabilitiesResponseSearch),
          ) as CapabilitiesResponseSearch;
          result.search.replace(valueDes);
          break;
        case r'categories':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(CategoryCapability)]),
          ) as BuiltList<CategoryCapability>;
          result.categories.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CapabilitiesResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CapabilitiesResponseBuilder();
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

