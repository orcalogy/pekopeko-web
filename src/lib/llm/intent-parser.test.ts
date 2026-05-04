import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveEatOutIntentFromQuery,
  deriveEatOutRefinementPatchFromQuery,
  parseCookIntent,
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

test('normalizes over-literal eat-out keywords with source hints', () => {
  const intent = parseEatOutIntent(
    JSON.stringify({
      keyword: 'quiet cafe where I can work',
      confidence: 0.6,
    }),
    'quiet cafe where I can work',
  );

  assert.equal(intent?.keyword, 'cafe');
  assert.deepEqual(intent?.features, ['wifi']);
  assert.deepEqual(intent?.softPreferences, ['quiet', 'wifi']);
});

test('maps low-appetite cook prompts to gentle bounded preferences', () => {
  const intent = parseCookIntent(
    JSON.stringify({
      keyword: '食欲ない',
      mood: 'happy',
      maxSpicy: 3,
      softPreferences: ['light', 'made-up'],
    }),
    '食欲ない',
  );

  assert.equal(intent?.keyword, undefined);
  assert.equal(intent?.mood, 'tired');
  assert.equal(intent?.maxSpicy, 0);
  assert.equal(intent?.occasion, 'low_appetite');
  assert.ok(intent?.softPreferences?.includes('gentle'));
  assert.ok(intent?.softPreferences?.includes('soup'));
  assert.ok(intent?.avoidPreferences?.includes('heavy'));
});

test('keeps low-appetite eat-out prompts local preference-only', () => {
  const intent = parseEatOutIntent(
    JSON.stringify({
      keyword: '食欲ない',
      category: 'southeast-asian',
      confidence: 0.72,
      queryExpansion: {
        primaryKeyword: '食欲ない',
        providerQueries: { google: ['食欲ない'] },
      },
      softPreferences: ['light', 'made-up'],
    }),
    '食欲ない',
  );

  assert.equal(intent?.keyword, undefined);
  assert.equal(intent?.category, undefined);
  assert.equal(intent?.queryExpansion?.primaryKeyword, undefined);
  assert.equal(intent?.queryExpansion?.providerQueries, undefined);
  assert.equal(intent?.occasion, 'low_appetite');
  assert.ok(intent?.softPreferences?.includes('gentle'));
  assert.ok(intent?.avoidPreferences?.includes('spicy'));
  assert.ok(intent?.avoidPreferences?.includes('fastfood'));
});

test('derives common current-preference hints from source query', () => {
  const intent = deriveEatOutIntentFromQuery('something new, not expensive, not ramen today');

  assert.equal(intent?.personalPreferenceMode, 'explore');
  assert.ok(intent?.softPreferences?.includes('novel'));
  assert.ok(intent?.softPreferences?.includes('budget_friendly'));
  assert.ok(intent?.avoidPreferences?.includes('expensive'));
  assert.ok(intent?.avoidCuisines?.includes('ramen'));
});

test('derives quiet solo place hints without inventing provider keywords', () => {
  const intent = deriveEatOutIntentFromQuery('quiet solo place');

  assert.equal(intent?.keyword, undefined);
  assert.equal(intent?.partySize, 1);
  assert.equal(intent?.occasion, 'solo');
  assert.ok(intent?.softPreferences?.includes('quiet'));
  assert.ok(intent?.softPreferences?.includes('solo_friendly'));
});

test('supports ignoring usual preferences for this search', () => {
  const intent = deriveEatOutIntentFromQuery('ignore my usual preferences today');

  assert.equal(intent?.personalPreferenceMode, 'ignore');
});

test('derives conservative eat-out fallback intent from source query', () => {
  const intent = deriveEatOutIntentFromQuery('quiet cafe where I can work');

  assert.equal(intent?.keyword, 'cafe');
  assert.deepEqual(intent?.features, ['wifi']);
  assert.deepEqual(intent?.softPreferences, ['quiet', 'wifi']);
  assert.equal(intent?.confidence, 0.45);
});

test('derives conservative refinement patch from distance query', () => {
  const patch = deriveEatOutRefinementPatchFromQuery('within 500 meters');

  assert.equal(patch?.operation, 'refine');
  assert.equal(patch?.spatialIntent?.type, 'near_current_location');
  assert.equal(patch?.spatialIntent?.radiusM, 500);
  assert.equal(patch?.spatialIntent?.importance, 'hard');
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
