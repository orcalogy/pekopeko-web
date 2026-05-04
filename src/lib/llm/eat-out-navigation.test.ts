import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEatOutNavigationParams } from './eat-out-navigation.ts';

test('builds a keyword-backed random navigation when server keywords are allowed', () => {
  const params = buildEatOutNavigationParams({
    query: '  ramen  ',
    random: true,
  });

  assert.equal(params.get('keyword'), 'ramen');
  assert.equal(params.get('random'), 'true');
  assert.equal(params.get('category'), null);
  assert.equal(params.get('openNow'), null);
});

test('keeps semantic prompts local-only for eat-out navigation', () => {
  const params = buildEatOutNavigationParams({
    query: '食欲ない',
    intent: {
      keyword: '食欲ない',
      category: 'southeast-asian',
      confidence: 0.72,
      softPreferences: ['light'],
      avoidPreferences: ['heavy'],
      queryExpansion: {
        primaryKeyword: '食欲ない',
        providerQueries: {
          google: ['食欲ない'],
        },
      },
    },
    localOnly: true,
    localIntentId: 'local-123',
  });

  assert.equal(params.get('localIntent'), 'local-123');
  assert.equal(params.get('keyword'), null);
  assert.equal(params.get('providerKeywords'), null);
  assert.equal(params.get('softPreferences'), null);
  assert.equal(params.get('avoidPreferences'), null);
  assert.equal(params.get('category'), null);
  assert.equal(params.get('openNow'), null);
  assert.equal(params.get('radiusM'), null);
});

test('prefers semantic intent fields when present', () => {
  const params = buildEatOutNavigationParams({
    query: 'late night noodles',
    intent: {
      keyword: 'ramen',
      category: 'noodles',
      openNow: true,
      confidence: 0.9,
    },
    random: true,
  });

  assert.equal(params.get('keyword'), 'ramen');
  assert.equal(params.get('category'), 'noodles');
  assert.equal(params.get('openNow'), 'true');
  assert.equal(params.get('random'), 'true');
});

test('uses query expansion primary keyword when intent keyword is absent', () => {
  const params = buildEatOutNavigationParams({
    query: 'somewhere quiet for work',
    intent: {
      confidence: 0.6,
      queryExpansion: {
        primaryKeyword: 'cafe',
        hardFilters: ['openNow'],
        providerQueries: {
          google: ['quiet cafe'],
        },
      },
    },
  });

  assert.equal(params.get('keyword'), 'cafe');
  assert.equal(params.get('openNow'), 'true');
  assert.equal(params.get('providerKeywords'), '{"google":["quiet cafe"]}');
});

test('keeps random-only navigation when no prompt is provided', () => {
  const params = buildEatOutNavigationParams({
    query: '   ',
    random: true,
  });

  assert.equal(params.get('keyword'), null);
  assert.equal(params.get('category'), null);
  assert.equal(params.get('openNow'), null);
  assert.equal(params.get('random'), 'true');
});
