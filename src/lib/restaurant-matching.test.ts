import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateRestaurantMatch, type RestaurantMatchable } from './restaurant-matching.ts';

function createPlace(overrides: Partial<RestaurantMatchable>): RestaurantMatchable {
  return {
    name: overrides.name ?? 'Sample Restaurant',
    address: overrides.address ?? '東京都渋谷区道玄坂1-1-1',
    lat: overrides.lat ?? 35.658,
    lng: overrides.lng ?? 139.701,
  };
}

test('accepts exact-name matches with corroborating primary address sequence', () => {
  const left = createPlace({
    name: '焼肉ライク 渋谷宇田川町店',
    address: '東京都渋谷区宇田川町21-6 QFRONT 1F',
  });
  const right = createPlace({
    name: '焼肉ライク渋谷宇田川町店',
    address: '東京都渋谷区宇田川町21-6 QFRONT 1階',
    lat: 35.65804,
    lng: 139.70103,
  });

  const match = evaluateRestaurantMatch(left, right);

  assert.equal(match.accepted, true);
  assert.equal(match.hasPositiveAddressCorroboration, true);
});

test('ignores Japanese postal codes when comparing primary address sequences', () => {
  const left = createPlace({
    name: 'good spoon Handmade Cheese&Pizzeria ルミネ新宿店',
    address: '東京都新宿区西新宿1-1-5ルミネ新宿LUMINE1 7F',
    lat: 35.6891877229,
    lng: 139.6991410468,
  });
  const right = createPlace({
    name: 'good spoon Handmade Cheese & Pizzeria ルミネ新宿店',
    address: '日本、〒160-0023 東京都新宿区西新宿1-1-5 ルミネ新宿LUMINE1 7F',
    lat: 35.6891923,
    lng: 139.6990268,
  });

  const match = evaluateRestaurantMatch(left, right);

  assert.equal(match.accepted, true);
  assert.equal(match.hasAddressConflict, false);
  assert.equal(match.hasPositiveAddressCorroboration, true);
});

test('rejects exact-name matches when the primary address number sequence differs', () => {
  const left = createPlace({
    name: '鳥貴族 渋谷店',
    address: '東京都渋谷区道玄坂1-12-1 2F',
  });
  const right = createPlace({
    name: '鳥貴族 渋谷店',
    address: '東京都渋谷区道玄坂1-13-1 2F',
    lat: 35.65803,
    lng: 139.70102,
  });

  const match = evaluateRestaurantMatch(left, right);

  assert.equal(match.accepted, false);
  assert.equal(match.hasAddressConflict, true);
});

test('rejects containment pairs for nearby same-brand branches in different buildings', () => {
  const left = createPlace({
    name: 'スターバックスコーヒー',
    address: '東京都渋谷区道玄坂1-12-1',
  });
  const right = createPlace({
    name: 'スターバックスコーヒー渋谷マークシティ店',
    address: '東京都渋谷区道玄坂1-13-1',
    lat: 35.65803,
    lng: 139.70102,
  });

  const match = evaluateRestaurantMatch(left, right);

  assert.equal(match.isContainmentPair, true);
  assert.equal(match.accepted, false);
});

test('accepts containment pairs only when address evidence is positive and close', () => {
  const left = createPlace({
    name: 'くいもの屋わん 渋谷スペイン坂店',
    address: '東京都渋谷区宇田川町13-7 小安ビル 4F',
  });
  const right = createPlace({
    name: '個室居酒屋 くいもの屋わん 渋谷スペイン坂店',
    address: '東京都渋谷区宇田川町13-7 小安ビル4階',
    lat: 35.65801,
    lng: 139.70101,
  });

  const match = evaluateRestaurantMatch(left, right);

  assert.equal(match.isContainmentPair, true);
  assert.equal(match.hasPositiveAddressCorroboration, true);
  assert.equal(match.accepted, true);
});

test('accepts containment pairs when the only address difference is a Japanese postal code prefix', () => {
  const left = createPlace({
    name: 'じぶんどき 新宿東口駅前店',
    address: '東京都新宿区新宿3-36-10 ミラザ新宿5F',
    lat: 35.6905381941,
    lng: 139.7016599454,
  });
  const right = createPlace({
    name: '全席個室 じぶんどき新宿東口駅前店',
    address: '日本、〒160-0022 東京都新宿区新宿3-36-10 ミラザ新宿 5F',
    lat: 35.6905484,
    lng: 139.7017888,
  });

  const match = evaluateRestaurantMatch(left, right);

  assert.equal(match.isContainmentPair, true);
  assert.equal(match.hasPositiveAddressCorroboration, true);
  assert.equal(match.accepted, true);
});

test('rejects containment pairs when address corroboration is missing', () => {
  const left = createPlace({
    name: 'くいもの屋わん 渋谷スペイン坂店',
    address: '東京都渋谷区宇田川町13-7 小安ビル 4F',
  });
  const right = createPlace({
    name: '個室居酒屋 くいもの屋わん 渋谷スペイン坂店',
    address: undefined,
    lat: 35.65801,
    lng: 139.70101,
  });

  const match = evaluateRestaurantMatch(left, right);

  assert.equal(match.isContainmentPair, true);
  assert.equal(match.hasPositiveAddressCorroboration, false);
  assert.equal(match.accepted, false);
});
