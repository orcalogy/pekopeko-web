import { Prisma, RestaurantAliasStatus, RestaurantRecordStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import type { MapProviderType, Restaurant } from '@/types/restaurant';
import { ApiRouteError } from './http';
import {
  buildRestaurantSnapshot,
  generateRestaurantKey,
  getRestaurantProviderRefs,
  inferRestaurantPhotoPayload,
} from './restaurant-key';
import {
  normalizeWebsiteIdentity,
  selectExactWebsiteMatch,
  selectRestaurantRegistryCandidate,
} from './restaurant-registry-match.ts';
import type {
  ApiProviderRef,
  ApiSource,
  RestaurantKeySnapshot,
  RestaurantPhotoPayload,
} from './types';

const RESTAURANT_RECORD_INCLUDE = {
  aliases: {
    where: { status: RestaurantAliasStatus.ACTIVE },
    orderBy: { createdAt: 'asc' as const },
  },
  supersededBy: {
    select: {
      restaurantKey: true,
    },
  },
} satisfies Prisma.RestaurantRecordInclude;

const SUPERSESSION_LOOKUP_SELECT = {
  restaurantKey: true,
  status: true,
  supersededById: true,
} satisfies Prisma.RestaurantRecordSelect;

type RestaurantRecordWithAliases = Prisma.RestaurantRecordGetPayload<{
  include: typeof RESTAURANT_RECORD_INCLUDE;
}>;

interface RestaurantObservation {
  providerRefs: ApiProviderRef[];
  source: ApiSource;
  canonicalName: string;
  normalizedCanonicalName: string;
  canonicalAddress?: string;
  normalizedCanonicalAddress?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  normalizedPhone?: string;
  websiteUrl?: string;
  normalizedWebsiteHost?: string;
  normalizedWebsiteIdentity?: string;
  snapshot: RestaurantKeySnapshot;
  photo?: RestaurantPhotoPayload;
}

export interface StoredRestaurantRecord {
  status: 'ACTIVE' | 'CLOSED' | 'SUPERSEDED';
  restaurantKey: string;
  source: ApiSource;
  providerRefs: ApiProviderRef[];
  snapshot?: RestaurantKeySnapshot;
  photo?: RestaurantPhotoPayload;
  supersededByRestaurantKey?: string;
}

export interface ResolvedRestaurantIdentity {
  restaurantKey: string;
  providerRefs: ApiProviderRef[];
  photo?: RestaurantPhotoPayload;
}

export async function resolveRestaurantIdentity(
  restaurant: Restaurant,
): Promise<ResolvedRestaurantIdentity> {
  const providerRefs = getRestaurantProviderRefs(restaurant);

  if (providerRefs.length === 0) {
    throw new ApiRouteError({
      status: 500,
      code: 'internal',
      message: 'Restaurant is missing provider references',
    });
  }

  const observation = buildObservation(restaurant, providerRefs);
  const record = await upsertRestaurantObservation(observation);

  return {
    restaurantKey: record.restaurantKey,
    providerRefs,
    photo: observation.photo,
  };
}

export async function getStoredRestaurantRecord(
  restaurantKey: string,
): Promise<StoredRestaurantRecord | null> {
  const record = await prisma.restaurantRecord.findUnique({
    where: { restaurantKey },
    include: RESTAURANT_RECORD_INCLUDE,
  });

  if (!record) {
    return null;
  }

  const storedRecord = toStoredRestaurantRecord(record);
  if (
    storedRecord.status === 'SUPERSEDED' &&
    storedRecord.supersededByRestaurantKey &&
    storedRecord.supersededByRestaurantKey !== restaurantKey
  ) {
    storedRecord.supersededByRestaurantKey =
      (await resolveSupersessionTargetRestaurantKey(storedRecord.supersededByRestaurantKey)) ??
      storedRecord.supersededByRestaurantKey;
  }

  return storedRecord;
}

export function assertStoredRestaurantRecordIsCurrent(
  record: StoredRestaurantRecord,
): StoredRestaurantRecord {
  if (record.status === 'SUPERSEDED') {
    throw new ApiRouteError({
      status: 404,
      code: 'not_found',
      message: 'Restaurant has moved',
      details: {
        restaurantKey: record.restaurantKey,
        ...(record.supersededByRestaurantKey
          ? { movedToRestaurantKey: record.supersededByRestaurantKey }
          : {}),
      },
    });
  }

  if (record.status === 'CLOSED') {
    throw new ApiRouteError({
      status: 404,
      code: 'not_found',
      message: 'Restaurant is closed',
      details: {
        restaurantKey: record.restaurantKey,
        state: 'closed',
      },
    });
  }

  return record;
}

async function upsertRestaurantObservation(
  observation: RestaurantObservation,
): Promise<RestaurantRecordWithAliases> {
  try {
    return await upsertRestaurantObservationOnce(observation);
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) {
      throw error;
    }

    return upsertRestaurantObservationOnce(observation);
  }
}

async function upsertRestaurantObservationOnce(
  observation: RestaurantObservation,
): Promise<RestaurantRecordWithAliases> {
  return prisma.$transaction(async (tx) => {
    const existingAlias = await tx.restaurantAlias.findFirst({
      where: {
        status: RestaurantAliasStatus.ACTIVE,
        OR: observation.providerRefs.map((ref) => ({
          provider: ref.provider,
          providerId: ref.providerId,
        })),
      },
      include: {
        restaurant: {
          include: RESTAURANT_RECORD_INCLUDE,
        },
      },
    });

    if (existingAlias?.restaurant) {
      return updateRestaurantRecord(tx, existingAlias.restaurant, observation);
    }

    const matched = await findCandidateRestaurant(tx, observation);
    if (matched) {
      return updateRestaurantRecord(tx, matched, observation);
    }

    return createRestaurantRecord(tx, observation);
  });
}

function isPrismaUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function findCandidateRestaurant(
  tx: Prisma.TransactionClient,
  observation: RestaurantObservation,
): Promise<RestaurantRecordWithAliases | null> {
  const phoneMatch = observation.normalizedPhone
    ? await tx.restaurantRecord.findFirst({
        where: {
          status: RestaurantRecordStatus.ACTIVE,
          normalizedPhone: observation.normalizedPhone,
        },
        include: RESTAURANT_RECORD_INCLUDE,
        orderBy: { lastSeenAt: 'desc' },
      })
    : null;

  const websiteMatch =
    phoneMatch || !observation.normalizedWebsiteHost || !observation.normalizedWebsiteIdentity
      ? null
      : selectExactWebsiteMatch({
          normalizedWebsiteIdentity: observation.normalizedWebsiteIdentity,
          candidates: (
            await tx.restaurantRecord.findMany({
              where: {
                status: RestaurantRecordStatus.ACTIVE,
                normalizedWebsiteHost: observation.normalizedWebsiteHost,
              },
              include: RESTAURANT_RECORD_INCLUDE,
              take: 12,
              orderBy: { lastSeenAt: 'desc' },
            })
          ).map((candidate) => ({
            value: candidate,
            websiteUrl: candidate.websiteUrl,
          })),
        });

  const candidates =
    phoneMatch ||
    websiteMatch ||
    !observation.normalizedCanonicalName ||
    observation.lat == null ||
    observation.lng == null
      ? []
      : await tx.restaurantRecord.findMany({
          where: {
            status: RestaurantRecordStatus.ACTIVE,
            normalizedCanonicalName: observation.normalizedCanonicalName,
          },
          include: RESTAURANT_RECORD_INCLUDE,
          take: 12,
          orderBy: { lastSeenAt: 'desc' },
        });

  return selectRestaurantRegistryCandidate({
    observation: {
      canonicalName: observation.canonicalName,
      canonicalAddress: observation.canonicalAddress,
      lat: observation.lat,
      lng: observation.lng,
    },
    phoneMatch,
    websiteMatch,
    candidates: candidates.map((candidate) => ({
      value: candidate,
      canonicalName: candidate.canonicalName,
      canonicalAddress: candidate.canonicalAddress,
      lat: candidate.lat,
      lng: candidate.lng,
    })),
  });
}

async function updateRestaurantRecord(
  tx: Prisma.TransactionClient,
  record: RestaurantRecordWithAliases,
  observation: RestaurantObservation,
): Promise<RestaurantRecordWithAliases> {
  await upsertAliases(tx, record.id, observation);

  return tx.restaurantRecord.update({
    where: { id: record.id },
    data: {
      canonicalName: observation.canonicalName || record.canonicalName,
      normalizedCanonicalName:
        observation.normalizedCanonicalName || record.normalizedCanonicalName,
      canonicalAddress: observation.canonicalAddress ?? record.canonicalAddress,
      normalizedCanonicalAddress:
        observation.normalizedCanonicalAddress ?? record.normalizedCanonicalAddress,
      lat: observation.lat ?? record.lat,
      lng: observation.lng ?? record.lng,
      phone: observation.phone ?? record.phone,
      normalizedPhone: observation.normalizedPhone ?? record.normalizedPhone,
      websiteUrl: observation.websiteUrl ?? record.websiteUrl,
      normalizedWebsiteHost: observation.normalizedWebsiteHost ?? record.normalizedWebsiteHost,
      lastObservedSource: observation.source,
      lastSnapshotJson: toNullableJsonValue(observation.snapshot),
      lastPhotoPayloadJson: toNullableJsonValue(observation.photo),
      lastSeenAt: new Date(),
    },
    include: RESTAURANT_RECORD_INCLUDE,
  });
}

async function createRestaurantRecord(
  tx: Prisma.TransactionClient,
  observation: RestaurantObservation,
): Promise<RestaurantRecordWithAliases> {
  const now = new Date();

  return tx.restaurantRecord.create({
    data: {
      restaurantKey: generateRestaurantKey(),
      canonicalName: observation.canonicalName,
      normalizedCanonicalName: observation.normalizedCanonicalName,
      canonicalAddress: observation.canonicalAddress,
      normalizedCanonicalAddress: observation.normalizedCanonicalAddress,
      lat: observation.lat,
      lng: observation.lng,
      phone: observation.phone,
      normalizedPhone: observation.normalizedPhone,
      websiteUrl: observation.websiteUrl,
      normalizedWebsiteHost: observation.normalizedWebsiteHost,
      lastObservedSource: observation.source,
      lastSnapshotJson: toNullableJsonValue(observation.snapshot),
      lastPhotoPayloadJson: toNullableJsonValue(observation.photo),
      firstSeenAt: now,
      lastSeenAt: now,
      aliases: {
        create: observation.providerRefs.map((ref) => ({
          provider: ref.provider,
          providerId: ref.providerId,
          status: RestaurantAliasStatus.ACTIVE,
          confidence: 1,
          firstSeenAt: now,
          lastSeenAt: now,
          rawName: observation.canonicalName,
          rawAddress: observation.canonicalAddress,
          rawPhone: observation.phone,
          rawWebsiteUrl: observation.websiteUrl,
          rawLat: observation.lat,
          rawLng: observation.lng,
        })),
      },
    },
    include: RESTAURANT_RECORD_INCLUDE,
  });
}

async function upsertAliases(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  observation: RestaurantObservation,
) {
  const now = new Date();

  for (const ref of observation.providerRefs) {
    await tx.restaurantAlias.upsert({
      where: {
        provider_providerId: {
          provider: ref.provider,
          providerId: ref.providerId,
        },
      },
      update: {
        restaurantId,
        status: RestaurantAliasStatus.ACTIVE,
        lastSeenAt: now,
        rawName: observation.canonicalName,
        rawAddress: observation.canonicalAddress,
        rawPhone: observation.phone,
        rawWebsiteUrl: observation.websiteUrl,
        rawLat: observation.lat,
        rawLng: observation.lng,
      },
      create: {
        restaurantId,
        provider: ref.provider,
        providerId: ref.providerId,
        status: RestaurantAliasStatus.ACTIVE,
        confidence: 1,
        firstSeenAt: now,
        lastSeenAt: now,
        rawName: observation.canonicalName,
        rawAddress: observation.canonicalAddress,
        rawPhone: observation.phone,
        rawWebsiteUrl: observation.websiteUrl,
        rawLat: observation.lat,
        rawLng: observation.lng,
      },
    });
  }
}

function buildObservation(
  restaurant: Restaurant,
  providerRefs: ApiProviderRef[],
): RestaurantObservation {
  const canonicalName = restaurant.name.trim();
  const canonicalAddress = restaurant.address?.trim() || undefined;
  const phone = restaurant.phone?.trim() || undefined;
  const websiteUrl = restaurant.websiteUrl?.trim() || undefined;
  const source = restaurant.source ?? inferObservedSource(providerRefs);

  return {
    providerRefs,
    source,
    canonicalName,
    normalizedCanonicalName: normalizeText(canonicalName),
    canonicalAddress,
    normalizedCanonicalAddress: canonicalAddress ? normalizeText(canonicalAddress) : undefined,
    lat: Number.isFinite(restaurant.lat) ? restaurant.lat : undefined,
    lng: Number.isFinite(restaurant.lng) ? restaurant.lng : undefined,
    phone,
    normalizedPhone: phone ? normalizePhone(phone) : undefined,
    websiteUrl,
    normalizedWebsiteHost: websiteUrl ? normalizeWebsiteHost(websiteUrl) : undefined,
    normalizedWebsiteIdentity: normalizeWebsiteIdentity(websiteUrl),
    snapshot: buildRestaurantSnapshot(restaurant),
    photo: inferRestaurantPhotoPayload(restaurant, providerRefs),
  };
}

function toStoredRestaurantRecord(record: RestaurantRecordWithAliases): StoredRestaurantRecord {
  const supersededByRestaurantKey =
    record.status === RestaurantRecordStatus.SUPERSEDED && record.supersededBy?.restaurantKey
      ? record.supersededBy.restaurantKey
      : undefined;

  return {
    status: record.status,
    restaurantKey: record.restaurantKey,
    providerRefs: record.aliases.map((alias) => ({
      provider: alias.provider as MapProviderType,
      providerId: alias.providerId,
    })),
    source: coerceApiSource(record.lastObservedSource),
    snapshot: parseStoredSnapshot(record.lastSnapshotJson),
    photo: parseStoredPhotoPayload(record.lastPhotoPayloadJson),
    supersededByRestaurantKey,
  };
}

function inferObservedSource(providerRefs: ApiProviderRef[]): ApiSource {
  const providers = new Set(providerRefs.map((ref) => ref.provider));

  if (providers.has('google') && providers.has('hotpepper')) {
    return 'hybrid';
  }

  return providerRefs[0]?.provider ?? 'google';
}

function coerceApiSource(value: string | null): ApiSource {
  if (value === 'hotpepper' || value === 'amap' || value === 'hybrid') {
    return value;
  }

  return 'google';
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

function normalizeWebsiteHost(value: string): string | undefined {
  try {
    const host = new URL(value).hostname.trim().toLowerCase();
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return undefined;
  }
}

function toNullableJsonValue(
  value: RestaurantKeySnapshot | RestaurantPhotoPayload | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!value) {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function parseStoredSnapshot(value: Prisma.JsonValue | null): RestaurantKeySnapshot | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const id = readString(value.id);
  const name = readString(value.name);
  const address = readString(value.address);
  const lat = readFiniteNumber(value.lat);
  const lng = readFiniteNumber(value.lng);
  const distance = readFiniteNumber(value.distance);

  if (!id || !name || !address || lat == null || lng == null || distance == null) {
    return undefined;
  }

  const snapshot: RestaurantKeySnapshot = {
    id,
    name,
    address,
    lat,
    lng,
    distance,
  };

  const rating = readFiniteNumber(value.rating);
  if (rating != null) snapshot.rating = rating;

  const priceLevel = readFiniteNumber(value.priceLevel);
  if (priceLevel != null) snapshot.priceLevel = priceLevel;

  const isOpenNow = readBoolean(value.isOpenNow);
  if (isOpenNow != null) snapshot.isOpenNow = isOpenNow;

  const openingHours = readStringArray(value.openingHours);
  if (openingHours) snapshot.openingHours = openingHours;

  const cuisineType = readString(value.cuisineType);
  if (cuisineType) snapshot.cuisineType = cuisineType;

  const phone = readString(value.phone);
  if (phone) snapshot.phone = phone;

  const placeUrl = readString(value.placeUrl);
  if (placeUrl) snapshot.placeUrl = placeUrl;

  const detailUrl = readString(value.detailUrl);
  if (detailUrl) snapshot.detailUrl = detailUrl;

  const couponUrl = readString(value.couponUrl);
  if (couponUrl) snapshot.couponUrl = couponUrl;

  const accessInfo = readString(value.accessInfo);
  if (accessInfo) snapshot.accessInfo = accessInfo;

  const budgetText = readString(value.budgetText);
  if (budgetText) snapshot.budgetText = budgetText;

  const capacity = readFiniteNumber(value.capacity);
  if (capacity != null) snapshot.capacity = capacity;

  const features = readStringArray(value.features);
  if (features) snapshot.features = features;

  const menuUrl = readString(value.menuUrl);
  if (menuUrl) snapshot.menuUrl = menuUrl;

  const websiteUrl = readString(value.websiteUrl);
  if (websiteUrl) snapshot.websiteUrl = websiteUrl;

  const source = readApiSource(value.source);
  if (source) snapshot.source = source;

  return snapshot;
}

function parseStoredPhotoPayload(
  value: Prisma.JsonValue | null,
): RestaurantPhotoPayload | undefined {
  if (!isPlainObject(value) || typeof value.provider !== 'string') {
    return undefined;
  }

  if (value.provider !== 'google' && value.provider !== 'hotpepper' && value.provider !== 'amap') {
    return undefined;
  }

  const ref = readString(value.ref);
  const url = readString(value.url);
  if (!ref && !url) {
    return undefined;
  }

  return {
    provider: value.provider,
    ...(ref ? { ref } : {}),
    ...(url ? { url } : {}),
  };
}

function isPlainObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: Prisma.JsonValue | undefined): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readFiniteNumber(value: Prisma.JsonValue | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readBoolean(value: Prisma.JsonValue | undefined): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readStringArray(value: Prisma.JsonValue | undefined): string[] | undefined {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) {
    return undefined;
  }

  return value;
}

function readApiSource(value: Prisma.JsonValue | undefined): ApiSource | undefined {
  return value === 'google' || value === 'hotpepper' || value === 'amap' || value === 'hybrid'
    ? value
    : undefined;
}

export async function resolveSupersessionTargetRestaurantKey(
  restaurantKey: string,
): Promise<string | undefined> {
  const seen = new Set<string>();
  let currentKey: string | undefined = restaurantKey;

  while (currentKey && !seen.has(currentKey)) {
    seen.add(currentKey);

    const record = (await prisma.restaurantRecord.findUnique({
      where: { restaurantKey: currentKey },
      select: SUPERSESSION_LOOKUP_SELECT,
    })) as {
      restaurantKey: string;
      status: RestaurantRecordStatus;
      supersededById: string | null;
    } | null;

    if (!record) {
      return currentKey;
    }

    if (record.status !== RestaurantRecordStatus.SUPERSEDED || !record.supersededById) {
      return record.restaurantKey;
    }

    const nextRecord = (await prisma.restaurantRecord.findUnique({
      where: { id: record.supersededById },
      select: {
        restaurantKey: true,
      },
    })) as { restaurantKey: string } | null;

    currentKey = nextRecord?.restaurantKey;
  }

  return undefined;
}
