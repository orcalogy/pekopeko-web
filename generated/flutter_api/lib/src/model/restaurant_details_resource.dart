//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:pekopeko_api/src/model/restaurant_provider_ref.dart';
import 'package:built_collection/built_collection.dart';
import 'package:pekopeko_api/src/model/provider_source.dart';
import 'package:pekopeko_api/src/model/restaurant_feature.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restaurant_details_resource.g.dart';

/// RestaurantDetailsResource
///
/// Properties:
/// * [restaurantKey] 
/// * [name] 
/// * [address] 
/// * [lat] 
/// * [lng] 
/// * [rating] 
/// * [priceLevel] 
/// * [isOpenNow] 
/// * [openingHours] 
/// * [cuisineType] 
/// * [photoUrl] 
/// * [phone] 
/// * [placeUrl] 
/// * [detailUrl] 
/// * [couponUrl] 
/// * [accessInfo] 
/// * [budgetText] 
/// * [capacity] 
/// * [features] 
/// * [menuUrl] 
/// * [websiteUrl] 
/// * [source_] 
/// * [providerRefs] 
@BuiltValue()
abstract class RestaurantDetailsResource implements Built<RestaurantDetailsResource, RestaurantDetailsResourceBuilder> {
  @BuiltValueField(wireName: r'restaurantKey')
  String get restaurantKey;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'address')
  String get address;

  @BuiltValueField(wireName: r'lat')
  double get lat;

  @BuiltValueField(wireName: r'lng')
  double get lng;

  @BuiltValueField(wireName: r'rating')
  double? get rating;

  @BuiltValueField(wireName: r'priceLevel')
  int? get priceLevel;

  @BuiltValueField(wireName: r'isOpenNow')
  bool? get isOpenNow;

  @BuiltValueField(wireName: r'openingHours')
  BuiltList<String>? get openingHours;

  @BuiltValueField(wireName: r'cuisineType')
  String? get cuisineType;

  @BuiltValueField(wireName: r'photoUrl')
  String? get photoUrl;

  @BuiltValueField(wireName: r'phone')
  String? get phone;

  @BuiltValueField(wireName: r'placeUrl')
  String? get placeUrl;

  @BuiltValueField(wireName: r'detailUrl')
  String? get detailUrl;

  @BuiltValueField(wireName: r'couponUrl')
  String? get couponUrl;

  @BuiltValueField(wireName: r'accessInfo')
  String? get accessInfo;

  @BuiltValueField(wireName: r'budgetText')
  String? get budgetText;

  @BuiltValueField(wireName: r'capacity')
  int? get capacity;

  @BuiltValueField(wireName: r'features')
  BuiltList<RestaurantFeature>? get features;

  @BuiltValueField(wireName: r'menuUrl')
  String? get menuUrl;

  @BuiltValueField(wireName: r'websiteUrl')
  String? get websiteUrl;

  @BuiltValueField(wireName: r'source')
  ProviderSource get source_;
  // enum source_Enum {  google,  hotpepper,  amap,  hybrid,  };

  @BuiltValueField(wireName: r'providerRefs')
  BuiltList<RestaurantProviderRef> get providerRefs;

  RestaurantDetailsResource._();

  factory RestaurantDetailsResource([void updates(RestaurantDetailsResourceBuilder b)]) = _$RestaurantDetailsResource;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RestaurantDetailsResourceBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RestaurantDetailsResource> get serializer => _$RestaurantDetailsResourceSerializer();
}

class _$RestaurantDetailsResourceSerializer implements PrimitiveSerializer<RestaurantDetailsResource> {
  @override
  final Iterable<Type> types = const [RestaurantDetailsResource, _$RestaurantDetailsResource];

  @override
  final String wireName = r'RestaurantDetailsResource';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RestaurantDetailsResource object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'restaurantKey';
    yield serializers.serialize(
      object.restaurantKey,
      specifiedType: const FullType(String),
    );
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'address';
    yield serializers.serialize(
      object.address,
      specifiedType: const FullType(String),
    );
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
    if (object.rating != null) {
      yield r'rating';
      yield serializers.serialize(
        object.rating,
        specifiedType: const FullType(double),
      );
    }
    if (object.priceLevel != null) {
      yield r'priceLevel';
      yield serializers.serialize(
        object.priceLevel,
        specifiedType: const FullType(int),
      );
    }
    if (object.isOpenNow != null) {
      yield r'isOpenNow';
      yield serializers.serialize(
        object.isOpenNow,
        specifiedType: const FullType(bool),
      );
    }
    if (object.openingHours != null) {
      yield r'openingHours';
      yield serializers.serialize(
        object.openingHours,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
    if (object.cuisineType != null) {
      yield r'cuisineType';
      yield serializers.serialize(
        object.cuisineType,
        specifiedType: const FullType(String),
      );
    }
    if (object.photoUrl != null) {
      yield r'photoUrl';
      yield serializers.serialize(
        object.photoUrl,
        specifiedType: const FullType(String),
      );
    }
    if (object.phone != null) {
      yield r'phone';
      yield serializers.serialize(
        object.phone,
        specifiedType: const FullType(String),
      );
    }
    if (object.placeUrl != null) {
      yield r'placeUrl';
      yield serializers.serialize(
        object.placeUrl,
        specifiedType: const FullType(String),
      );
    }
    if (object.detailUrl != null) {
      yield r'detailUrl';
      yield serializers.serialize(
        object.detailUrl,
        specifiedType: const FullType(String),
      );
    }
    if (object.couponUrl != null) {
      yield r'couponUrl';
      yield serializers.serialize(
        object.couponUrl,
        specifiedType: const FullType(String),
      );
    }
    if (object.accessInfo != null) {
      yield r'accessInfo';
      yield serializers.serialize(
        object.accessInfo,
        specifiedType: const FullType(String),
      );
    }
    if (object.budgetText != null) {
      yield r'budgetText';
      yield serializers.serialize(
        object.budgetText,
        specifiedType: const FullType(String),
      );
    }
    if (object.capacity != null) {
      yield r'capacity';
      yield serializers.serialize(
        object.capacity,
        specifiedType: const FullType(int),
      );
    }
    if (object.features != null) {
      yield r'features';
      yield serializers.serialize(
        object.features,
        specifiedType: const FullType(BuiltList, [FullType(RestaurantFeature)]),
      );
    }
    if (object.menuUrl != null) {
      yield r'menuUrl';
      yield serializers.serialize(
        object.menuUrl,
        specifiedType: const FullType(String),
      );
    }
    if (object.websiteUrl != null) {
      yield r'websiteUrl';
      yield serializers.serialize(
        object.websiteUrl,
        specifiedType: const FullType(String),
      );
    }
    yield r'source';
    yield serializers.serialize(
      object.source_,
      specifiedType: const FullType(ProviderSource),
    );
    yield r'providerRefs';
    yield serializers.serialize(
      object.providerRefs,
      specifiedType: const FullType(BuiltList, [FullType(RestaurantProviderRef)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RestaurantDetailsResource object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required RestaurantDetailsResourceBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'restaurantKey':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.restaurantKey = valueDes;
          break;
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.name = valueDes;
          break;
        case r'address':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.address = valueDes;
          break;
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
        case r'rating':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.rating = valueDes;
          break;
        case r'priceLevel':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.priceLevel = valueDes;
          break;
        case r'isOpenNow':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.isOpenNow = valueDes;
          break;
        case r'openingHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.openingHours.replace(valueDes);
          break;
        case r'cuisineType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.cuisineType = valueDes;
          break;
        case r'photoUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.photoUrl = valueDes;
          break;
        case r'phone':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.phone = valueDes;
          break;
        case r'placeUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.placeUrl = valueDes;
          break;
        case r'detailUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.detailUrl = valueDes;
          break;
        case r'couponUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.couponUrl = valueDes;
          break;
        case r'accessInfo':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.accessInfo = valueDes;
          break;
        case r'budgetText':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.budgetText = valueDes;
          break;
        case r'capacity':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.capacity = valueDes;
          break;
        case r'features':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(RestaurantFeature)]),
          ) as BuiltList<RestaurantFeature>;
          result.features.replace(valueDes);
          break;
        case r'menuUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.menuUrl = valueDes;
          break;
        case r'websiteUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.websiteUrl = valueDes;
          break;
        case r'source':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ProviderSource),
          ) as ProviderSource;
          result.source_ = valueDes;
          break;
        case r'providerRefs':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(RestaurantProviderRef)]),
          ) as BuiltList<RestaurantProviderRef>;
          result.providerRefs.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RestaurantDetailsResource deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RestaurantDetailsResourceBuilder();
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

