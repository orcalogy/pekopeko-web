import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEatOutNavigationParams } from './eat-out-navigation.ts';

test('builds a keyword-backed random navigation from raw query text', () => {
  const params = buildEatOutNavigationParams({
    query: '  ramen  ',
    random: true,
  });

  assert.equal(params.get('keyword'), 'ramen');
  assert.equal(params.get('random'), 'true');
  assert.equal(params.get('category'), null);
  assert.equal(params.get('openNow'), null);
});

test('prefers semantic intent fields when present', () => {
  const params = buildEatOutNavigationParams({
    query: 'late night noodles',
    intent: {
      keyword: 'ramen',
      category: 'noodles',
      openNow: true,
    },
    random: true,
  });

  assert.equal(params.get('keyword'), 'ramen');
  assert.equal(params.get('category'), 'noodles');
  assert.equal(params.get('openNow'), 'true');
  assert.equal(params.get('random'), 'true');
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
