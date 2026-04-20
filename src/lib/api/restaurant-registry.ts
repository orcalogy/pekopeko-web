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

const ACTIVE_ALIAS_INCLUDE = {
  aliases: {
    where: { status: RestaurantAliasStatus.ACTIVE },
    orderBy: { id: 'asc' as const },
  },
} satisfies Prisma.RestaurantRecordInclude;

type RestaurantRecordWithAliases = Prisma.RestaurantRecordGetPayload<{
  include: typeof ACTIVE_ALIAS_INCLUDE;
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
  restaurantKey: string;
  source: ApiSource;
  providerRefs: ApiProviderRef[];
  snapshot?: RestaurantKeySnapshot;
  photo?: RestaurantPhotoPayload;
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
    include: ACTIVE_ALIAS_INCLUDE,
  });

  return record ? toStoredRestaurantRecord(record) : null;
}

async function upsertRestaurantObservation(
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
          include: ACTIVE_ALIAS_INCLUDE,
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
        include: ACTIVE_ALIAS_INCLUDE,
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
              include: ACTIVE_ALIAS_INCLUDE,
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
          include: ACTIVE_ALIAS_INCLUDE,
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
      providerCoverageKeys: mergeProviderCoverage(
        record.providerCoverageKeys,
        observation.providerRefs,
      ),
      lastObservedSource: observation.source,
      lastSnapshotJson: toNullableJsonValue(observation.snapshot),
      lastPhotoPayloadJson: toNullableJsonValue(observation.photo),
      lastSeenAt: new Date(),
    },
    include: ACTIVE_ALIAS_INCLUDE,
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
      providerCoverageKeys: [...new Set(observation.providerRefs.map((ref) => ref.provider))],
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
    include: ACTIVE_ALIAS_INCLUDE,
  });
}

async function upsertAliases(
  tx: Prisma.TransactionClient,
  restaurantId: bigint,
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
  return {
    restaurantKey: record.restaurantKey,
    providerRefs: record.aliases.map((alias) => ({
      provider: alias.provider as MapProviderType,
      providerId: alias.providerId,
    })),
    source: coerceApiSource(record.lastObservedSource),
    snapshot: parseStoredSnapshot(record.lastSnapshotJson),
    photo: parseStoredPhotoPayload(record.lastPhotoPayloadJson),
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

function mergeProviderCoverage(existing: string[], providerRefs: ApiProviderRef[]): string[] {
  return [...new Set([...existing, ...providerRefs.map((ref) => ref.provider)])];
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
  return isPlainObject(value) ? (value as RestaurantKeySnapshot) : undefined;
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

  return {
    provider: value.provider,
    ...(typeof value.ref === 'string' ? { ref: value.ref } : {}),
    ...(typeof value.url === 'string' ? { url: value.url } : {}),
  };
}

function isPlainObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}
