import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseEatOutIntent,
  parseEatOutRefinementPatch,
  radiusFromWalkMinutes,
} from './intent-parser.ts';

test('parses older eat-out intent with default confidence', () => {
  const intent = parseEatOutIntent(JSON.stringify({ keyword: ' ramen ', openNow: true }));

  assert.equal(intent?.keyword, 'ramen');
  assert.equal(intent?.openNow, true);
  assert.equal(intent?.confidence, 0.7);
});

test('parses low-confidence clarification and missing info', () => {
  const intent = parseEatOutIntent(
    JSON.stringify({
      confidence: 0.2,
      missingInfo: ['budget', 'ambience', 'unknown'],
      clarifyingQuestion: {
        question: 'What matters most?',
        options: ['cheap', 'quiet', 'open now'],
      },
    }),
  );

  assert.equal(intent?.confidence, 0.2);
  assert.deepEqual(intent?.missingInfo, ['budget', 'ambience']);
  assert.equal(intent?.clarifyingQuestion?.question, 'What matters most?');
});

test('parses bounded query expansion and spatial intent', () => {
  const intent = parseEatOutIntent(
    JSON.stringify({
      keyword: 'cafe',
      confidence: 0.6,
      spatialIntent: {
        type: 'near_station',
        anchorText: 'Shinjuku Station',
        maxWalkMinutes: 6,
        importance: 'hard',
      },
      queryExpansion: {
        providerQueries: {
          google: ['quiet cafe', 'work cafe', 'wifi cafe', 'extra'],
          hotpepper: ['カフェ', 'WiFi'],
        },
        softPreferences: ['quiet', 'wifi'],
      },
    }),
  );

  assert.equal(intent?.spatialIntent?.radiusM, 420);
  assert.deepEqual(intent?.queryExpansion?.providerQueries?.google, [
    'quiet cafe',
    'work cafe',
    'wifi cafe',
  ]);
  assert.deepEqual(intent?.queryExpansion?.softPreferences, ['quiet', 'wifi']);
});

test('parses conservative refinement patches', () => {
  const patch = parseEatOutRefinementPatch(
    JSON.stringify({
      operation: 'refine',
      addSoftPreferences: ['quiet'],
      removeCuisines: ['ramen'],
      maxBudgetLevel: 2,
      partySize: 4,
      rerankOnly: true,
    }),
  );

  assert.equal(patch?.operation, 'refine');
  assert.deepEqual(patch?.removeCuisines, ['ramen']);
  assert.equal(patch?.maxBudgetLevel, 2);
  assert.equal(patch?.partySize, 4);
});

test('converts walking minutes conservatively', () => {
  assert.equal(radiusFromWalkMinutes(5), 350);
});
