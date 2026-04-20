import assert from 'node:assert/strict';
import test from 'node:test';
import type { Restaurant } from '../../types/restaurant';
import { mergeResults } from './merge.ts';

function createRestaurant(overrides: Partial<Restaurant>): Restaurant {
  return {
    id: overrides.id ?? 'id',
    name: overrides.name ?? 'Sample Restaurant',
    address: overrides.address ?? '東京都渋谷区道玄坂1-1-1',
    lat: overrides.lat ?? 35.658,
    lng: overrides.lng ?? 139.701,
    distance: overrides.distance ?? 100,
    source: overrides.source ?? 'google',
    providerRefs: overrides.providerRefs,
    rating: overrides.rating,
    priceLevel: overrides.priceLevel,
    isOpenNow: overrides.isOpenNow,
    openingHours: overrides.openingHours,
    cuisineType: overrides.cuisineType,
    photoUrl: overrides.photoUrl,
    phone: overrides.phone,
    placeUrl: overrides.placeUrl,
    detailUrl: overrides.detailUrl,
    couponUrl: overrides.couponUrl,
    accessInfo: overrides.accessInfo,
    budgetText: overrides.budgetText,
    capacity: overrides.capacity,
    features: overrides.features,
    menuUrl: overrides.menuUrl,
    websiteUrl: overrides.websiteUrl,
    restaurantKey: overrides.restaurantKey,
    photoRef: overrides.photoRef,
  };
}

test('merges exact name matches when the coordinates are close', () => {
  const google = createRestaurant({
    id: 'google-1',
    name: '焼肉ライク 渋谷宇田川町店',
    source: 'google',
    providerRefs: [{ provider: 'google', providerId: 'google-1' }],
  });
  const hotpepper = createRestaurant({
    id: 'hp-1',
    name: '焼肉ライク渋谷宇田川町店',
    lat: 35.65818,
    lng: 139.7011,
    source: 'hotpepper',
    providerRefs: [{ provider: 'hotpepper', providerId: 'hp-1' }],
    couponUrl: 'https://example.com/coupon',
  });

  const merged = mergeResults([google], [hotpepper]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.source, 'hybrid');
  assert.equal(merged[0]?.couponUrl, 'https://example.com/coupon');
});

test('does not merge unrelated restaurants that happen to be nearby', () => {
  const google = createRestaurant({
    id: 'google-1',
    name: 'すしざんまい 渋谷東口店',
    source: 'google',
    providerRefs: [{ provider: 'google', providerId: 'google-1' }],
  });
  const hotpepper = createRestaurant({
    id: 'hp-1',
    name: '鳥貴族 渋谷道玄坂店',
    lat: 35.65803,
    lng: 139.70105,
    source: 'hotpepper',
    providerRefs: [{ provider: 'hotpepper', providerId: 'hp-1' }],
  });

  const merged = mergeResults([google], [hotpepper]);

  assert.equal(merged.length, 2);
  assert.deepEqual(merged.map((restaurant) => restaurant.id).sort(), ['google-1', 'hp-1']);
});

test('does not merge same-brand branches with different suffixes', () => {
  const google = createRestaurant({
    id: 'google-1',
    name: 'スターバックスコーヒー渋谷店',
    address: '東京都渋谷区宇田川町21-6 QFRONT 1F',
    source: 'google',
    providerRefs: [{ provider: 'google', providerId: 'google-1' }],
  });
  const hotpepper = createRestaurant({
    id: 'hp-1',
    name: 'スターバックスコーヒー渋谷マークシティ店',
    address: '東京都渋谷区道玄坂1-12-1 渋谷マークシティ 4F',
    lat: 35.6581,
    lng: 139.70105,
    source: 'hotpepper',
    providerRefs: [{ provider: 'hotpepper', providerId: 'hp-1' }],
  });

  const merged = mergeResults([google], [hotpepper]);

  assert.equal(merged.length, 2);
});

test('does not merge a branchless chain name with a nearby branch-specific result', () => {
  const google = createRestaurant({
    id: 'google-1',
    name: 'スターバックスコーヒー',
    address: '東京都渋谷区道玄坂1-12-1',
    source: 'google',
    providerRefs: [{ provider: 'google', providerId: 'google-1' }],
  });
  const hotpepper = createRestaurant({
    id: 'hp-1',
    name: 'スターバックスコーヒー渋谷マークシティ店',
    address: '東京都渋谷区道玄坂1-13-1',
    lat: 35.65803,
    lng: 139.70102,
    source: 'hotpepper',
    providerRefs: [{ provider: 'hotpepper', providerId: 'hp-1' }],
  });

  const merged = mergeResults([google], [hotpepper]);

  assert.equal(merged.length, 2);
});

test('does not merge exact-name matches when the primary address number sequence differs', () => {
  const google = createRestaurant({
    id: 'google-1',
    name: '鳥貴族 渋谷店',
    address: '東京都渋谷区道玄坂1-12-1 2F',
    source: 'google',
    providerRefs: [{ provider: 'google', providerId: 'google-1' }],
  });
  const hotpepper = createRestaurant({
    id: 'hp-1',
    name: '鳥貴族 渋谷店',
    address: '東京都渋谷区道玄坂1-13-1 2F',
    lat: 35.65803,
    lng: 139.70102,
    source: 'hotpepper',
    providerRefs: [{ provider: 'hotpepper', providerId: 'hp-1' }],
  });

  const merged = mergeResults([google], [hotpepper]);

  assert.equal(merged.length, 2);
});

test('merges when Google adds a Japanese postal code prefix to the same address', () => {
  const google = createRestaurant({
    id: 'google-1',
    name: 'good spoon Handmade Cheese & Pizzeria ルミネ新宿店',
    address: '日本、〒160-0023 東京都新宿区西新宿1-1-5 ルミネ新宿LUMINE1 7F',
    lat: 35.6891923,
    lng: 139.6990268,
    source: 'google',
    providerRefs: [{ provider: 'google', providerId: 'google-1' }],
  });
  const hotpepper = createRestaurant({
    id: 'hp-1',
    name: 'good spoon Handmade Cheese&Pizzeria ルミネ新宿店',
    address: '東京都新宿区西新宿1-1-5ルミネ新宿LUMINE1 7F',
    lat: 35.6891877229,
    lng: 139.6991410468,
    source: 'hotpepper',
    providerRefs: [{ provider: 'hotpepper', providerId: 'hp-1' }],
    couponUrl: 'https://example.com/good-spoon',
  });

  const merged = mergeResults([google], [hotpepper]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.source, 'hybrid');
  assert.equal(merged[0]?.couponUrl, 'https://example.com/good-spoon');
});

test('merges when HotPepper adds a descriptive prefix to the same venue name', () => {
  const google = createRestaurant({
    id: 'google-1',
    name: 'くいもの屋わん 渋谷スペイン坂店',
    source: 'google',
    providerRefs: [{ provider: 'google', providerId: 'google-1' }],
  });
  const hotpepper = createRestaurant({
    id: 'hp-1',
    name: '個室居酒屋 くいもの屋わん 渋谷スペイン坂店',
    lat: 35.65807,
    lng: 139.70103,
    source: 'hotpepper',
    providerRefs: [{ provider: 'hotpepper', providerId: 'hp-1' }],
    detailUrl: 'https://example.com/detail',
  });

  const merged = mergeResults([google], [hotpepper]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.detailUrl, 'https://example.com/detail');
  assert.equal(merged[0]?.source, 'hybrid');
});
