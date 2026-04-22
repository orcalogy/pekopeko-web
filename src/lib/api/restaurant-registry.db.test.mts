import assert from 'node:assert/strict';
import test from 'node:test';
import { config as loadEnv } from 'dotenv';
import type { Restaurant } from '@/types/restaurant';

loadEnv({ path: '.env.local', quiet: true });
loadEnv({ quiet: true });

const { RestaurantRecordStatus } = await import('@prisma/client');
const { prisma } = await import('@/lib/db/prisma');
const { ApiRouteError } = await import('./http.ts');
const {
  assertStoredRestaurantRecordIsCurrent,
  getStoredRestaurantRecord,
  resolveRestaurantIdentity,
  resolveSupersessionTargetRestaurantKey,
} = await import('./restaurant-registry.ts');

function createRestaurant(overrides: Partial<Restaurant>): Restaurant {
  return {
    id: overrides.id ?? 'provider-id',
    name: overrides.name ?? 'Jibundoki Shibuya',
    address: overrides.address ?? '東京都渋谷区道玄坂1-1-1',
    lat: overrides.lat ?? 35.658,
    lng: overrides.lng ?? 139.701,
    distance: overrides.distance ?? 120,
    phone: overrides.phone ?? '+81 3-1234-5678',
    websiteUrl: overrides.websiteUrl ?? 'https://example.com/shibuya',
    source: overrides.source ?? 'google',
    providerRefs:
      overrides.providerRefs ??
      (overrides.id
        ? [
            {
              provider: (overrides.source === 'hotpepper' || overrides.source === 'amap'
                ? overrides.source
                : 'google') as 'google' | 'hotpepper' | 'amap',
              providerId: overrides.id,
            },
          ]
        : undefined),
  };
}

async function resetRegistryTables() {
  await prisma.restaurantAlias.deleteMany();
  await prisma.restaurantRecord.deleteMany();
}

test('resolveRestaurantIdentity persists and reuses the same record across providers', async () => {
  await resetRegistryTables();

  const googleIdentity = await resolveRestaurantIdentity(
    createRestaurant({
      id: 'google-place-1',
      source: 'google',
      providerRefs: [{ provider: 'google', providerId: 'google-place-1' }],
    }),
  );

  const hotpepperIdentity = await resolveRestaurantIdentity(
    createRestaurant({
      id: 'hotpepper-shop-1',
      source: 'hotpepper',
      providerRefs: [{ provider: 'hotpepper', providerId: 'hotpepper-shop-1' }],
    }),
  );

  assert.equal(hotpepperIdentity.restaurantKey, googleIdentity.restaurantKey);

  const records = await prisma.restaurantRecord.findMany({
    include: {
      aliases: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  assert.equal(records.length, 1);
  assert.equal(typeof records[0]?.id, 'string');
  assert.equal(records[0]?.aliases.length, 2);

  const stored = await getStoredRestaurantRecord(googleIdentity.restaurantKey);
  assert.equal(stored?.status, 'ACTIVE');
  assert.equal(stored?.providerRefs.length, 2);
});

test('superseded restaurant records resolve to the terminal replacement key', async () => {
  await resetRegistryTables();

  const original = await resolveRestaurantIdentity(
    createRestaurant({
      id: 'google-place-original',
      source: 'google',
      providerRefs: [{ provider: 'google', providerId: 'google-place-original' }],
      websiteUrl: 'https://example.com/original',
    }),
  );
  const replacement = await resolveRestaurantIdentity(
    createRestaurant({
      id: 'google-place-replacement',
      source: 'google',
      providerRefs: [{ provider: 'google', providerId: 'google-place-replacement' }],
      name: 'Jibundoki Shibuya Annex',
      phone: '+81 3-9999-0001',
      websiteUrl: 'https://example.com/replacement',
    }),
  );
  const replacement2 = await resolveRestaurantIdentity(
    createRestaurant({
      id: 'google-place-replacement-2',
      source: 'google',
      providerRefs: [{ provider: 'google', providerId: 'google-place-replacement-2' }],
      name: 'Jibundoki Shibuya Central',
      phone: '+81 3-9999-0002',
      websiteUrl: 'https://example.com/replacement-2',
    }),
  );

  const [originalRecord, replacementRecord, replacement2Record] = await Promise.all([
    prisma.restaurantRecord.findUniqueOrThrow({
      where: { restaurantKey: original.restaurantKey },
    }),
    prisma.restaurantRecord.findUniqueOrThrow({
      where: { restaurantKey: replacement.restaurantKey },
    }),
    prisma.restaurantRecord.findUniqueOrThrow({
      where: { restaurantKey: replacement2.restaurantKey },
    }),
  ]);

  await prisma.restaurantRecord.update({
    where: { id: originalRecord.id },
    data: {
      status: RestaurantRecordStatus.SUPERSEDED,
      supersededById: replacementRecord.id,
    },
  });
  await prisma.restaurantRecord.update({
    where: { id: replacementRecord.id },
    data: {
      status: RestaurantRecordStatus.SUPERSEDED,
      supersededById: replacement2Record.id,
    },
  });

  const terminalKey = await resolveSupersessionTargetRestaurantKey(original.restaurantKey);
  assert.equal(terminalKey, replacement2.restaurantKey);

  const stored = await getStoredRestaurantRecord(original.restaurantKey);
  assert.equal(stored?.status, 'SUPERSEDED');
  assert.equal(stored?.supersededByRestaurantKey, replacement2.restaurantKey);

  assert.throws(
    () => assertStoredRestaurantRecordIsCurrent(stored!),
    (error: unknown) => {
      assert.ok(error instanceof ApiRouteError);
      assert.equal(error.details?.movedToRestaurantKey, replacement2.restaurantKey);
      return true;
    },
  );
});
