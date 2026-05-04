import assert from 'node:assert/strict';
import test from 'node:test';
import { parseEatOutRerank } from './intent-parser.ts';
import { mockFactCards, mockRestaurants } from './restaurant-fixtures.test-data.ts';
import { buildRestaurantFactCards } from './restaurant-shortlist.ts';

test('builds compact restaurant fact cards', () => {
  const cards = buildRestaurantFactCards({
    restaurants: mockRestaurants.slice(0, 1),
  });

  assert.equal(cards[0]?.id, 'rid-cafe-1');
  assert.equal(cards[0]?.distanceM, 240);
  assert.equal(cards[0]?.features.includes('wifi'), true);
  assert.equal(cards[0]?.missingFacts.includes('noise'), true);
});

test('adds grounded preference and risk evidence for low-appetite reranking', () => {
  const cards = buildRestaurantFactCards({
    restaurants: mockRestaurants,
    currentIntent: {
      confidence: 0.8,
      occasion: 'low_appetite',
      softPreferences: ['light', 'gentle', 'warm', 'soup', 'small_portion'],
      avoidPreferences: ['heavy', 'rich', 'alcohol_focused'],
    },
  });
  const udon = cards.find((card) => card.id === 'rid-udon-1');
  const ramen = cards.find((card) => card.id === 'rid-ramen-1');
  const izakaya = cards.find((card) => card.id === 'rid-izakaya-1');

  assert.ok(udon?.preferenceEvidence?.some((item) => item.includes('gentle')));
  assert.ok(ramen?.riskEvidence?.some((item) => item.includes('heavy')));
  assert.ok(izakaya?.riskEvidence?.some((item) => item.includes('alcohol')));
});

test('rejects invalid LLM rerank ids', () => {
  const rerank = parseEatOutRerank(
    JSON.stringify({
      recommendations: [
        {
          id: 'rid-missing',
          score: 1,
          matched: ['rating 5'],
          tradeoffs: [],
          reason: 'Looks great',
          confidence: 1,
        },
      ],
    }),
    mockFactCards,
  );

  assert.equal(rerank, null);
});

test('accepts common rerank JSON variants while keeping ids valid', () => {
  const rerank = parseEatOutRerank(
    JSON.stringify({
      ranking: [
        {
          name: 'Desk Cafe',
          score: 0.9,
          matched: ['wifi'],
          tradeoffs: ['quiet unknown'],
          reason: 'Matches wifi.',
          confidence: 0.7,
        },
      ],
    }),
    mockFactCards,
  );

  assert.equal(rerank?.[0]?.id, 'rid-cafe-1');
});

test('accepts top-level rerank id arrays', () => {
  const rerank = parseEatOutRerank(JSON.stringify(['rid-cafe-1']), ['rid-cafe-1']);

  assert.equal(rerank?.[0]?.id, 'rid-cafe-1');
});

test('keeps grounded WiFi reason', () => {
  const rerank = parseEatOutRerank(
    JSON.stringify({
      recommendations: [
        {
          id: 'rid-cafe-1',
          score: 0.95,
          matched: ['wifi', 'rating 4.4'],
          tradeoffs: ['noise unknown'],
          reason: 'Has WiFi and a 4.4 rating.',
          confidence: 0.9,
        },
      ],
    }),
    mockFactCards,
  );

  assert.equal(rerank?.[0]?.reason, 'Has WiFi and a 4.4 rating.');
  assert.deepEqual(rerank?.[0]?.matched, ['wifi', 'rating 4.4']);
});

test('replaces unsupported hallucinated quiet reason', () => {
  const rerank = parseEatOutRerank(
    JSON.stringify({
      recommendations: [
        {
          id: 'rid-cafe-1',
          score: 2,
          matched: ['wifi'],
          tradeoffs: ['noise unknown'],
          reason: 'A quiet vegetarian-friendly cafe with WiFi.',
          confidence: 2,
        },
      ],
    }),
    mockFactCards,
    'en',
  );

  assert.notEqual(rerank?.[0]?.reason, 'A quiet vegetarian-friendly cafe with WiFi.');
  assert.equal(rerank?.[0]?.score, 1);
  assert.equal(rerank?.[0]?.confidence, 1);
});

test('replaces unsupported multilingual ambience claims', () => {
  const rerank = parseEatOutRerank(
    JSON.stringify({
      recommendations: [
        {
          id: 'rid-cafe-1',
          score: 0.7,
          matched: ['wifi'],
          tradeoffs: [],
          reason: '静かで安静なカフェです。',
          confidence: 0.8,
        },
      ],
    }),
    mockFactCards,
    'ja',
  );

  assert.notEqual(rerank?.[0]?.reason, '静かで安静なカフェです。');
  assert.match(rerank?.[0]?.reason ?? '', /合う点/);
});
