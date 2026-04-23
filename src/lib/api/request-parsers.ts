import { getCategoryById } from '../../data/categories.ts';
import { isAppLocale } from '../app-locale.ts';
import { ApiRouteError } from './http.ts';
import {
  PROVIDER_MODES,
  type ProviderOverride,
  RESTAURANT_FEATURES,
  RESTAURANT_SORT_OPTIONS,
  type RestaurantFeature,
  type RestaurantSearchInput,
  type RestaurantSortBy,
  SORT_DIRECTIONS,
  type SortDirection,
} from './types.ts';

const GEO_REVERSE_KEYS = ['lat', 'lng', 'locale'] as const;
const SEARCH_KEYS = [
  'locale',
  'provider',
  'location',
  'radiusM',
  'query',
  'filters',
  'sort',
  'pagination',
] as const;
const SEARCH_LOCATION_KEYS = ['lat', 'lng'] as const;
const SEARCH_QUERY_KEYS = ['keyword', 'categoryId'] as const;
const SEARCH_FILTER_KEYS = [
  'openNow',
  'minRating',
  'maxPriceLevel',
  'partySize',
  'requiredFeatures',
] as const;
const SEARCH_SORT_KEYS = ['by', 'direction'] as const;
const SEARCH_PAGINATION_KEYS = ['pageSize', 'cursor'] as const;

interface ReverseGeoInput {
  lat: number;
  lng: number;
  locale?: string;
}

export function parseReverseGeoRequest(body: unknown): ReverseGeoInput {
  const record = expectObject(body, 'body');
  assertAllowedKeys(record, GEO_REVERSE_KEYS, 'body');

  const lat = readRequiredNumber(record.lat, 'lat');
  const lng = readRequiredNumber(record.lng, 'lng');
  const locale = readOptionalLocale(record.locale, 'locale');

  return { lat, lng, locale };
}

export function parseRestaurantSearchRequest(body: unknown): RestaurantSearchInput {
  const record = expectObject(body, 'body');
  assertAllowedKeys(record, SEARCH_KEYS, 'body');

  const locationRecord =
    record.location == null ? undefined : expectObject(record.location, 'location');
  if (locationRecord) {
    assertAllowedKeys(locationRecord, SEARCH_LOCATION_KEYS, 'location');
  }

  const queryRecord = record.query == null ? undefined : expectObject(record.query, 'query');
  if (queryRecord) {
    assertAllowedKeys(queryRecord, SEARCH_QUERY_KEYS, 'query');
  }

  const filtersRecord =
    record.filters == null ? undefined : expectObject(record.filters, 'filters');
  if (filtersRecord) {
    assertAllowedKeys(filtersRecord, SEARCH_FILTER_KEYS, 'filters');
  }

  const sortRecord = record.sort == null ? undefined : expectObject(record.sort, 'sort');
  if (sortRecord) {
    assertAllowedKeys(sortRecord, SEARCH_SORT_KEYS, 'sort');
  }

  const paginationRecord =
    record.pagination == null ? undefined : expectObject(record.pagination, 'pagination');
  if (paginationRecord) {
    assertAllowedKeys(paginationRecord, SEARCH_PAGINATION_KEYS, 'pagination');
  }

  const cursor = readOptionalString(paginationRecord?.cursor, 'pagination.cursor');
  if (cursor != null && cursor.length === 0) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: 'pagination.cursor must be a non-empty string',
      details: { field: 'pagination.cursor' },
    });
  }

  if (cursor) {
    assertCursorOnlySearchRequest(record, paginationRecord);
  }

  if (!locationRecord && !cursor) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: 'location is required when pagination.cursor is omitted',
      details: { field: 'location' },
    });
  }

  const categoryId = readOptionalString(queryRecord?.categoryId, 'query.categoryId');
  if (categoryId && !getCategoryById(categoryId)) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: 'query.categoryId must be a supported category id',
      details: { field: 'query.categoryId' },
    });
  }

  return {
    locale: readOptionalLocale(record.locale, 'locale'),
    provider: readOptionalProviderMode(record.provider, 'provider'),
    location:
      locationRecord == null
        ? undefined
        : {
            lat: readRequiredNumber(locationRecord.lat, 'location.lat'),
            lng: readRequiredNumber(locationRecord.lng, 'location.lng'),
          },
    radiusM: readOptionalNumber(record.radiusM, 'radiusM'),
    query:
      queryRecord == null
        ? undefined
        : {
            keyword: readOptionalString(queryRecord.keyword, 'query.keyword') ?? undefined,
            categoryId: categoryId ?? undefined,
          },
    filters:
      filtersRecord == null
        ? undefined
        : {
            openNow: readOptionalBoolean(filtersRecord.openNow, 'filters.openNow'),
            minRating: readOptionalNumber(filtersRecord.minRating, 'filters.minRating'),
            maxPriceLevel: readOptionalNumber(filtersRecord.maxPriceLevel, 'filters.maxPriceLevel'),
            partySize: readOptionalNumber(filtersRecord.partySize, 'filters.partySize'),
            requiredFeatures: readOptionalFeatureList(
              filtersRecord.requiredFeatures,
              'filters.requiredFeatures',
            ),
          },
    sort:
      sortRecord == null
        ? undefined
        : {
            by: readOptionalSortBy(sortRecord.by, 'sort.by'),
            direction: readOptionalSortDirection(sortRecord.direction, 'sort.direction'),
          },
    pagination:
      paginationRecord == null
        ? undefined
        : {
            pageSize: readOptionalNumber(paginationRecord.pageSize, 'pagination.pageSize'),
            cursor: cursor ?? undefined,
          },
  };
}

function assertCursorOnlySearchRequest(
  record: Record<string, unknown>,
  paginationRecord: Record<string, unknown> | undefined,
) {
  const unsupportedFields = [
    ...(Object.hasOwn(record, 'locale') ? ['locale'] : []),
    ...(Object.hasOwn(record, 'provider') ? ['provider'] : []),
    ...(Object.hasOwn(record, 'location') ? ['location'] : []),
    ...(Object.hasOwn(record, 'radiusM') ? ['radiusM'] : []),
    ...(Object.hasOwn(record, 'query') ? ['query'] : []),
    ...(Object.hasOwn(record, 'filters') ? ['filters'] : []),
    ...(Object.hasOwn(record, 'sort') ? ['sort'] : []),
    ...(paginationRecord && Object.hasOwn(paginationRecord, 'pageSize')
      ? ['pagination.pageSize']
      : []),
  ];

  if (unsupportedFields.length === 0) {
    return;
  }

  throw new ApiRouteError({
    status: 400,
    code: 'invalid_argument',
    message: 'body contains unsupported fields',
    details: {
      field: 'body',
      unsupportedFields,
    },
  });
}

function expectObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: `${field} must be an object`,
      details: { field },
    });
  }

  return value as Record<string, unknown>;
}

function assertAllowedKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  field: string,
) {
  const extras = Object.keys(record).filter((key) => !allowedKeys.includes(key));
  if (extras.length === 0) return;

  throw new ApiRouteError({
    status: 400,
    code: 'invalid_argument',
    message: `${field} contains unsupported fields`,
    details: { field, unsupportedFields: extras },
  });
}

function readRequiredNumber(value: unknown, field: string): number {
  const parsed = readOptionalNumber(value, field);
  if (parsed == null) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: `${field} is required`,
      details: { field },
    });
  }

  return parsed;
}

function readOptionalNumber(value: unknown, field: string): number | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: `${field} must be a number`,
      details: { field },
    });
  }

  return value;
}

function readOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'boolean') {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: `${field} must be a boolean`,
      details: { field },
    });
  }

  return value;
}

function readOptionalString(value: unknown, field: string): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'string') {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: `${field} must be a string`,
      details: { field },
    });
  }

  return value.trim();
}

function readOptionalLocale(value: unknown, field: string): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'string' || !isAppLocale(value)) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: `${field} must be one of zh-CN, ja, en`,
      details: { field },
    });
  }

  return value;
}

function readOptionalProviderMode(value: unknown, field: string): ProviderOverride | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'string' || !PROVIDER_MODES.includes(value as ProviderOverride)) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: `${field} must be one of ${PROVIDER_MODES.join(', ')}`,
      details: { field },
    });
  }

  return value as ProviderOverride;
}

function readOptionalSortBy(value: unknown, field: string): RestaurantSortBy | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'string' || !RESTAURANT_SORT_OPTIONS.includes(value as RestaurantSortBy)) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: `${field} must be one of ${RESTAURANT_SORT_OPTIONS.join(', ')}`,
      details: { field },
    });
  }

  return value as RestaurantSortBy;
}

function readOptionalSortDirection(value: unknown, field: string): SortDirection | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'string' || !SORT_DIRECTIONS.includes(value as SortDirection)) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: `${field} must be one of ${SORT_DIRECTIONS.join(', ')}`,
      details: { field },
    });
  }

  return value as SortDirection;
}

function readOptionalFeatureList(value: unknown, field: string): RestaurantFeature[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: `${field} must be an array`,
      details: { field },
    });
  }

  const features = value.map((item, index) => {
    if (typeof item !== 'string' || !RESTAURANT_FEATURES.includes(item as RestaurantFeature)) {
      throw new ApiRouteError({
        status: 400,
        code: 'invalid_argument',
        message: `${field} contains an unsupported feature`,
        details: { field, index, value: item },
      });
    }

    return item as RestaurantFeature;
  });

  return [...new Set(features)];
}
