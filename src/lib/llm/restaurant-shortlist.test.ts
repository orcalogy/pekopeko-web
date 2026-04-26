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
