//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:pekopeko_api/src/model/app_locale.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'geo_reverse_request.g.dart';

/// GeoReverseRequest
///
/// Properties:
/// * [lat] 
/// * [lng] 
/// * [locale] 
@BuiltValue()
abstract class GeoReverseRequest implements Built<GeoReverseRequest, GeoReverseRequestBuilder> {
  @BuiltValueField(wireName: r'lat')
  double get lat;

  @BuiltValueField(wireName: r'lng')
  double get lng;

  @BuiltValueField(wireName: r'locale')
  AppLocale? get locale;
  // enum localeEnum {  zh-CN,  ja,  en,  };

  GeoReverseRequest._();

  factory GeoReverseRequest([void updates(GeoReverseRequestBuilder b)]) = _$GeoReverseRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(GeoReverseRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<GeoReverseRequest> get serializer => _$GeoReverseRequestSerializer();
}

class _$GeoReverseRequestSerializer implements PrimitiveSerializer<GeoReverseRequest> {
  @override
  final Iterable<Type> types = const [GeoReverseRequest, _$GeoReverseRequest];

  @override
  final String wireName = r'GeoReverseRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    GeoReverseRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'lat';
    yield serializers.serialize(
      object.lat,
      specifiedType: const FullType(double),
    );
    yield r'lng';
    yield serializers.serialize(
      object.lng,
      specifiedType: const FullType(double),
    );
    if (object.locale != null) {
      yield r'locale';
      yield serializers.serialize(
        object.locale,
        specifiedType: const FullType(AppLocale),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    GeoReverseRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required GeoReverseRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'lat':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.lat = valueDes;
          break;
        case r'lng':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.lng = valueDes;
          break;
        case r'locale':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AppLocale),
          ) as AppLocale;
          result.locale = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  GeoReverseRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = GeoReverseRequestBuilder();
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

