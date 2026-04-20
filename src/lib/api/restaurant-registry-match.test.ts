import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeWebsiteIdentity,
  type RegistryMatchCandidate,
  type RegistryMatchObservation,
  selectExactWebsiteMatch,
  selectRestaurantRegistryCandidate,
} from './restaurant-registry-match.ts';

interface CandidateRecord {
  id: string;
}

function createObservation(overrides: Partial<RegistryMatchObservation>): RegistryMatchObservation {
  return {
    canonicalName: overrides.canonicalName ?? 'Sample Restaurant',
    canonicalAddress: overrides.canonicalAddress ?? '東京都渋谷区道玄坂1-1-1',
    lat: overrides.lat ?? 35.658,
    lng: overrides.lng ?? 139.701,
  };
}

function createCandidate(
  id: string,
  overrides: Partial<Omit<RegistryMatchCandidate<CandidateRecord>, 'value'>>,
): RegistryMatchCandidate<CandidateRecord> {
  return {
    value: { id },
    canonicalName: overrides.canonicalName ?? 'Sample Restaurant',
    canonicalAddress: overrides.canonicalAddress ?? '東京都渋谷区道玄坂1-1-1',
    lat: overrides.lat ?? 35.658,
    lng: overrides.lng ?? 139.701,
  };
}

test('returns phone matches before any candidate matching', () => {
  const phoneMatch = { id: 'phone-match' };
  const result = selectRestaurantRegistryCandidate({
    observation: createObservation({}),
    phoneMatch,
    candidates: [
      createCandidate('candidate-1', {
        canonicalName: '別の店舗',
      }),
    ],
  });

  assert.equal(result, phoneMatch);
});

test('returns website matches when there is no phone match', () => {
  const websiteMatch = { id: 'website-match' };
  const result = selectRestaurantRegistryCandidate({
    observation: createObservation({}),
    websiteMatch,
    candidates: [
      createCandidate('candidate-1', {
        canonicalName: '別の店舗',
      }),
    ],
  });

  assert.equal(result, websiteMatch);
});

test('matches exact website pages, not just a shared chain host', () => {
  const result = selectExactWebsiteMatch({
    normalizedWebsiteIdentity: normalizeWebsiteIdentity(
      'https://shop.saizeriya.co.jp/sz_restaurant/spot/detail?code=0967',
    ),
    candidates: [
      {
        value: { id: 'host-only-miss' },
        websiteUrl: 'https://shop.saizeriya.co.jp/sz_restaurant/spot/detail?code=0931',
      },
      {
        value: { id: 'exact-page-hit' },
        websiteUrl:
          'https://shop.saizeriya.co.jp/sz_restaurant/spot/detail?code=0967&utm_source=test',
      },
    ],
  });

  assert.deepEqual(result, { id: 'exact-page-hit' });
});

test('does not treat a shared chain host as an exact website match', () => {
  const result = selectExactWebsiteMatch({
    normalizedWebsiteIdentity: normalizeWebsiteIdentity(
      'https://www.kichiri.co.jp/japanstyle/shinjuku/',
    ),
    candidates: [
      {
        value: { id: 'other-branch' },
        websiteUrl: 'https://www.kichiri.co.jp/japanstyle/shibuya/',
      },
    ],
  });

  assert.equal(result, null);
});

test('reuses an existing candidate only when the shared matcher accepts it', () => {
  const result = selectRestaurantRegistryCandidate({
    observation: createObservation({
      canonicalName: '焼肉ライク 渋谷宇田川町店',
      canonicalAddress: '東京都渋谷区宇田川町21-6 QFRONT 1F',
    }),
    candidates: [
      createCandidate('record-1', {
        canonicalName: '焼肉ライク渋谷宇田川町店',
        canonicalAddress: '東京都渋谷区宇田川町21-6 QFRONT 1階',
        lat: 35.65804,
        lng: 139.70103,
      }),
    ],
  });

  assert.deepEqual(result, { id: 'record-1' });
});

test('returns null when every candidate is rejected by the shared matcher', () => {
  const result = selectRestaurantRegistryCandidate({
    observation: createObservation({
      canonicalName: '鳥貴族 渋谷店',
      canonicalAddress: '東京都渋谷区道玄坂1-12-1 2F',
    }),
    candidates: [
      createCandidate('record-1', {
        canonicalName: '鳥貴族 渋谷店',
        canonicalAddress: '東京都渋谷区道玄坂1-13-1 2F',
        lat: 35.65803,
        lng: 139.70102,
      }),
    ],
  });

  assert.equal(result, null);
});
