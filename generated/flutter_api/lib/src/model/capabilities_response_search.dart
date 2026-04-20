//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:pekopeko_api/src/model/restaurant_sort_by.dart';
import 'package:pekopeko_api/src/model/provider_mode.dart';
import 'package:pekopeko_api/src/model/restaurant_feature.dart';
import 'package:pekopeko_api/src/model/sort_direction.dart';
import 'package:pekopeko_api/src/model/pagination_mode.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'capabilities_response_search.g.dart';

/// CapabilitiesResponseSearch
///
/// Properties:
/// * [defaultRadiusM] 
/// * [minRadiusM] 
/// * [maxRadiusM] 
/// * [radiusPresetsM] 
/// * [defaultPageSize] 
/// * [maxPageSize] 
/// * [paginationMode] 
/// * [providerModes] 
/// * [sortBy] 
/// * [sortDirections] 
/// * [requiredFeatures] 
@BuiltValue()
abstract class CapabilitiesResponseSearch implements Built<CapabilitiesResponseSearch, CapabilitiesResponseSearchBuilder> {
  @BuiltValueField(wireName: r'defaultRadiusM')
  int get defaultRadiusM;

  @BuiltValueField(wireName: r'minRadiusM')
  int get minRadiusM;

  @BuiltValueField(wireName: r'maxRadiusM')
  int get maxRadiusM;

  @BuiltValueField(wireName: r'radiusPresetsM')
  BuiltList<int> get radiusPresetsM;

  @BuiltValueField(wireName: r'defaultPageSize')
  int get defaultPageSize;

  @BuiltValueField(wireName: r'maxPageSize')
  int get maxPageSize;

  @BuiltValueField(wireName: r'paginationMode')
  PaginationMode get paginationMode;
  // enum paginationModeEnum {  offset,  };

  @BuiltValueField(wireName: r'providerModes')
  BuiltList<ProviderMode> get providerModes;

  @BuiltValueField(wireName: r'sortBy')
  BuiltList<RestaurantSortBy> get sortBy;

  @BuiltValueField(wireName: r'sortDirections')
  BuiltList<SortDirection> get sortDirections;

  @BuiltValueField(wireName: r'requiredFeatures')
  BuiltList<RestaurantFeature> get requiredFeatures;

  CapabilitiesResponseSearch._();

  factory CapabilitiesResponseSearch([void updates(CapabilitiesResponseSearchBuilder b)]) = _$CapabilitiesResponseSearch;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CapabilitiesResponseSearchBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CapabilitiesResponseSearch> get serializer => _$CapabilitiesResponseSearchSerializer();
}

class _$CapabilitiesResponseSearchSerializer implements PrimitiveSerializer<CapabilitiesResponseSearch> {
  @override
  final Iterable<Type> types = const [CapabilitiesResponseSearch, _$CapabilitiesResponseSearch];

  @override
  final String wireName = r'CapabilitiesResponseSearch';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CapabilitiesResponseSearch object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'defaultRadiusM';
    yield serializers.serialize(
      object.defaultRadiusM,
      specifiedType: const FullType(int),
    );
    yield r'minRadiusM';
    yield serializers.serialize(
      object.minRadiusM,
      specifiedType: const FullType(int),
    );
    yield r'maxRadiusM';
    yield serializers.serialize(
      object.maxRadiusM,
      specifiedType: const FullType(int),
    );
    yield r'radiusPresetsM';
    yield serializers.serialize(
      object.radiusPresetsM,
      specifiedType: const FullType(BuiltList, [FullType(int)]),
    );
    yield r'defaultPageSize';
    yield serializers.serialize(
      object.defaultPageSize,
      specifiedType: const FullType(int),
    );
    yield r'maxPageSize';
    yield serializers.serialize(
      object.maxPageSize,
      specifiedType: const FullType(int),
    );
    yield r'paginationMode';
    yield serializers.serialize(
      object.paginationMode,
      specifiedType: const FullType(PaginationMode),
    );
    yield r'providerModes';
    yield serializers.serialize(
      object.providerModes,
      specifiedType: const FullType(BuiltList, [FullType(ProviderMode)]),
    );
    yield r'sortBy';
    yield serializers.serialize(
      object.sortBy,
      specifiedType: const FullType(BuiltList, [FullType(RestaurantSortBy)]),
    );
    yield r'sortDirections';
    yield serializers.serialize(
      object.sortDirections,
      specifiedType: const FullType(BuiltList, [FullType(SortDirection)]),
    );
    yield r'requiredFeatures';
    yield serializers.serialize(
      object.requiredFeatures,
      specifiedType: const FullType(BuiltList, [FullType(RestaurantFeature)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CapabilitiesResponseSearch object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required CapabilitiesResponseSearchBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'defaultRadiusM':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.defaultRadiusM = valueDes;
          break;
        case r'minRadiusM':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.minRadiusM = valueDes;
          break;
        case r'maxRadiusM':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.maxRadiusM = valueDes;
          break;
        case r'radiusPresetsM':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(int)]),
          ) as BuiltList<int>;
          result.radiusPresetsM.replace(valueDes);
          break;
        case r'defaultPageSize':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.defaultPageSize = valueDes;
          break;
        case r'maxPageSize':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.maxPageSize = valueDes;
          break;
        case r'paginationMode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PaginationMode),
          ) as PaginationMode;
          result.paginationMode = valueDes;
          break;
        case r'providerModes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(ProviderMode)]),
          ) as BuiltList<ProviderMode>;
          result.providerModes.replace(valueDes);
          break;
        case r'sortBy':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(RestaurantSortBy)]),
          ) as BuiltList<RestaurantSortBy>;
          result.sortBy.replace(valueDes);
          break;
        case r'sortDirections':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(SortDirection)]),
          ) as BuiltList<SortDirection>;
          result.sortDirections.replace(valueDes);
          break;
        case r'requiredFeatures':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(RestaurantFeature)]),
          ) as BuiltList<RestaurantFeature>;
          result.requiredFeatures.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CapabilitiesResponseSearch deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CapabilitiesResponseSearchBuilder();
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

