# LLM Restaurant Intelligence Implementation Guide

Status: first implementation guide for the roadmap in `docs/llm-restaurant-design.md`.

This guide is intentionally concrete. It records the first implemented pass, validation rules, and
verification commands for the LLM restaurant improvements without breaking deterministic search.

## First-Pass Scope

Implemented:

- confidence, missing-info, clarification, spatial-intent, query-expansion, and refinement-patch
  parsing
- bounded `query.providerKeywords` support in `/api/v1/restaurants/search`
- Eat Out v1 search wiring, refinement chips, clarification UI, and random pick modes
- fact-card rerank input and grounded rerank output validation
- feedback aspects, local aspect profile derivation, and a Settings preference editor
- fixture-backed unit tests for parsers, rerank validation, profiles, random pick, and request
  parsing

Deferred:

- true landmark/station geocoding
- route or between-people planning
- candidate-order-aware refinements such as "more like the second one"
- a reusable clarification component shared across pages
- live provider/Vercel verification in this local pass

## Phase 1: Shared Types, Parsers, and Prompts

Primary files:

- `src/lib/llm/types.ts`
- `src/lib/llm/intent-parser.ts`
- `src/lib/llm/prompts.ts`
- new tests under `src/lib/llm/*.test.ts`

Steps:

1. Add LLM-facing types:
   - `MissingIntentInfo`
   - `SpatialIntent`
   - `EatOutQueryExpansion`
   - `EatOutClarifyingQuestion`
   - extended `EatOutSemanticIntent`
   - `EatOutRefinementPatch`
   - extended `EatOutRerankEntry`
2. Keep manual validation. Do not add a schema dependency.
3. Extend `EAT_OUT_INTENT_SCHEMA` with confidence, missing info, clarifying question, spatial
   intent, query expansion, and soft preferences.
4. Add `EAT_OUT_REFINEMENT_PATCH_SCHEMA`.
5. Extend `EAT_OUT_RERANK_SCHEMA` with `score`, `matched`, `tradeoffs`, and `confidence`.
6. Add parser helpers:
   - `clampUnitInterval(value, fallback)`
   - `readStringArray(value, allowed?, maxItems)`
   - `parseSpatialIntent(value)`
   - `parseEatOutQueryExpansion(value)`
   - `parseEatOutRefinementPatch(raw)`
7. Parser defaults:
   - if an old intent has actionable fields but no confidence, set confidence to `0.7`
   - if confidence is invalid and no actionable field exists, return null
   - drop unknown enum values
   - ignore unknown LLM object fields
8. Prompt updates:
   - instruct the model to return JSON only
   - explain confidence semantics
   - ask for missing info and at most one clarifying question
   - tell the model to keep provider query expansion bounded
   - include prompt-injection resistance language for restaurant/provider text

Acceptance tests:

- old-style intent still parses
- confidence clamps to `0..1`
- low-confidence intent with question parses
- invalid clarifying options are dropped
- spatial walk minutes convert through helper tests
- invalid refinement patch returns null

## Phase 2: OpenAPI and Server Query Expansion

Primary files:

- `openapi/pekopeko-api.yaml`
- `src/lib/api/types.ts`
- `src/lib/api/request-parsers.ts`
- `src/lib/api/restaurants.ts`
- `src/generated/api/*`

Steps:

1. Add `RestaurantSearchQuery.providerKeywords` to OpenAPI.
2. Regenerate TypeScript client with `pnpm openapi:generate`.
3. Add `providerKeywords?: Partial<Record<MapProviderType, string[]>>` to
   `RestaurantSearchInput.query`.
4. Extend `SEARCH_QUERY_KEYS` to allow `providerKeywords`.
5. Add `readOptionalProviderKeywords`.
6. Validation policy:
   - object keys must be `google`, `hotpepper`, or `amap`
   - each provider array maxes at 3 strings
   - total normalized strings max at 6
   - empty strings are removed
   - duplicates are removed after normalization
7. Refactor keyword building:
   - keep `buildSearchKeyword` for the base keyword
   - add bounded provider expansion helpers such as `buildExpandedProviderKeywords`
   - category terms are combined per provider using the existing HotPepper Japanese category rule
8. Refactor provider fetching:
   - run base search first
   - apply existing merge, filters, and sort
   - if result count is at least 8, skip expansion
   - if fewer than 8 and expansions exist, run bounded extra provider searches
   - dedupe by provider refs and provider ids before final merge
   - expansion errors are logged but do not fail the response when base results exist
9. Preserve cursor behavior:
   - first-page request stores the final result snapshot
   - cursor requests remain cursor-only
   - parser rejects `providerKeywords` with cursor just like other search-definition fields

Acceptance tests:

- request parser accepts valid provider keywords
- request parser rejects unsupported provider keys
- request parser caps too many query strings
- base search path behaves unchanged without `providerKeywords`
- expansion falls back to base results if expansion provider call fails
- cursor-only parser rejects `query.providerKeywords`

## Phase 3: Eat-Out Search Uses V1 Results

Primary file:

- `src/app/eat-out/page.tsx`

Steps:

1. Change `fetchRestaurants` to call `POST /api/v1/restaurants/search`.
2. Send:
   - `locale`
   - `provider`
   - `location`
   - `radiusM`
   - `query.keyword`
   - `query.categoryId`
   - optional `query.providerKeywords`
   - `filters.openNow`
   - `sort.by = distance`
   - `sort.direction = asc`
3. Read `data.results` and set them into existing `Restaurant[]` state.
4. Keep the existing legacy compatibility shape by relying on `ApiRestaurantRecord extends
   Restaurant`.
5. Keep current client-side filters initially; server filters can be tightened later.
6. Only send provider keywords when LLM produced expansion and the confidence/use case warrants it.
7. If the v1 request fails, show the existing error state. Do not silently retry legacy search.

Acceptance tests:

- page-level behavior can still be manually verified with AI off
- v1 response restaurant keys are available for feedback and rerank IDs
- provider status data is not required by current UI but remains available for future display

## Phase 4: Fact Cards and Grounded Rerank

Primary files:

- `src/lib/llm/restaurant-shortlist.ts`
- `src/lib/llm/intent-parser.ts`
- `src/lib/llm/prompts.ts`
- `src/components/restaurant/RestaurantCard.tsx`

Steps:

1. Add `buildRestaurantFactCards`.
2. Keep `formatRestaurantsForRerank` only as a wrapper or replace it with a JSON fact-card catalog.
3. Candidate limit remains 10.
4. Build fact cards from stable restaurant identity keys.
5. Include deterministic reason codes from `rankRestaurants`.
6. Add grounding helpers:
   - `getSupportedClaimTags(factCard)`
   - `validateGroundedMatchedItems(items, factCard)`
   - `validateGroundedReason(reason, factCard)`
   - `composeFallbackRerankReason(locale, factCard, matched, tradeoffs)`
7. Claim tags to guard:
   - quiet/noise
   - vegetarian/dietary
   - date/occasion
   - English menu
   - WiFi
   - open now
   - cheap/budget
   - group/party size
   - solo-friendly
   - near station/access
8. Parse rerank output against the fact-card list, not only IDs.
9. If a reason is unsupported, replace it with a local fallback reason instead of showing the raw
   prose.
10. If no valid recommendations remain, return fallback mode and keep current order.

Acceptance tests:

- invalid IDs are rejected
- duplicate IDs are deduped
- invalid scores/confidence values clamp
- unsupported "quiet" claim is stripped or replaced when no quiet evidence exists
- supported WiFi claim survives when `features` contains `wifi`
- fully invalid JSON falls back to deterministic order

## Phase 5: Clarification and Refinement UI

Primary files:

- `src/app/page.tsx`
- `src/app/eat-out/page.tsx`
- optional small component under `src/components/search/`

Steps:

1. Add compact clarification and refinement chip UI. Extract a reusable component if the same UI
   is needed in another page.
2. Home search behavior:
   - low confidence and not random: show the model's question and options below the search input
   - option click appends/applies the answer and reruns analysis
   - random/surprise bypasses the low-confidence block
3. Eat-out refine behavior:
   - analyze refinement as a patch first
   - if patch invalid, fall back to existing `analyzeEatOutQuery`
   - low-confidence patch shows clarification before changing filters
   - medium-confidence patch applies only safe constraints and shows chips
4. Maintain current temporary filter state:
   - `tempKeyword`
   - `tempCategoryId`
   - `tempOpenOnly`
   - `tempMinRating`
   - `tempMaxBudgetLevel`
   - `tempPartySize`
   - `tempSortBy`
   - `tempRequiredFeatures`
5. Add session goal state in the page:
   - original query
   - current constraints
   - soft preferences
   - rejected aspects
   - accepted refinements
6. Do not persist search-session goal across browser sessions in the first version.

Acceptance tests:

- low-confidence non-random query asks one question
- surprise/random query does not block on clarification
- "not ramen" removes ramen from current query constraints
- "open now" sets open-now filter
- "for 4 people" sets party size

## Phase 6: Feedback Aspects and Local Preference Editor

Primary files:

- `src/stores/restaurant-feedback.ts`
- `src/lib/recommendation/profile.ts`
- `src/lib/recommendation/types.ts`
- `src/app/settings/page.tsx`
- `src/components/restaurant/RestaurantCard.tsx`

Steps:

1. Add `FeedbackAspect` and aspect labels.
2. Extend `FeedbackEvent` with `aspects?: FeedbackAspect[]`.
3. Bump feedback store version.
4. Migration:
   - sanitize old events as today
   - default `aspects` to `[]`
   - preserve current feedback kinds and context
5. Change `addFeedback` to return the new event id.
6. Add `updateFeedbackAspects(eventId, aspects)`.
7. Add local preference overrides:
   - pinned preferred aspects
   - always-consider aspects
   - hidden aspects
8. Add aspect chips after feedback actions:
   - like: taste, price, ambience, service, solo, group, access
   - dislike: taste, price, distance, noise, crowd, service, dietary, not_my_mood
   - not interested: price, distance, cuisine/taste, not_my_mood, crowd
9. Extend profile derivation:
   - positive aspects get positive weighted scores
   - negative and not-interested aspects get negative weighted scores
   - recency weighting follows existing feedback weights
   - hidden aspects are omitted from summaries and prompts
   - pinned aspects are included even if score is weak
10. Settings card:
   - show usually prefer, avoid, always consider, recently rejected
   - pin and hide/delete aspect controls
   - clear recommendation data keeps current behavior

Acceptance tests:

- old feedback migrates without aspects
- aspect weights derive from like/dislike/not-interested
- hidden aspect is omitted from prompt summary
- pinned aspect appears in derived profile

## Phase 7: Random Pick Modes

Primary files:

- new `src/lib/recommendation/random-pick.ts`
- `src/stores/visited.ts`
- `src/app/eat-out/page.tsx`

Steps:

1. Add `RandomPickMode = 'safe' | 'balanced' | 'adventure'`.
2. Add a testable selector:

```ts
function pickRestaurantWithMode(params: {
  restaurants: Restaurant[];
  rankedResults: RankedRestaurantResult[];
  visitRecords: VisitRecord[];
  feedbackEvents: FeedbackEvent[];
  mode: RandomPickMode;
  random?: () => number;
}): Restaurant | null;
```

3. Score with:
   - normalized deterministic rank score
   - taste score from derived profile
   - novelty score for unvisited or uncommon cuisine/features
   - diversity bonus against recent visits/rejections
   - recent visit penalty
   - negative feedback penalty
4. Mode weights:
   - safe: high deterministic rank and rating, strong negative penalties
   - balanced: even relevance and novelty
   - adventure: larger novelty/diversity bonus, but never ignores recent negative feedback
5. Replace `weightedRandomPick` usage in eat-out random mode with the new selector.
6. Keep `weightedRandomPick` exported if other code still imports it.

Acceptance tests:

- recent visit reduces pick probability
- not-interested suppresses unless pool is tiny
- adventure boosts unseen cuisine
- safe favors rating/relevance
- injected random makes tests deterministic

## Phase 8: Tests and Fixtures

Add a fixture module such as `src/lib/llm/restaurant-fixtures.test-data.ts` with:

- multilingual queries:
  - "quiet cafe where I can work"
  - "新宿駅の近くで安くて一人で入りやすい店"
  - "今日は友達4人で行ける居酒屋"
  - "不要拉面，离车站近一点"
  - "surprise me but not expensive"
  - "something healthy and open now"
- mocked restaurant candidates with:
  - supported WiFi/non-smoking/private-room facts
  - missing ambience/noise/dietary facts
  - invalid candidate IDs for rerank tests
  - varied visits and feedback aspects

Implemented test files:

- `src/lib/llm/intent-parser.test.ts`
- `src/lib/llm/restaurant-shortlist.test.ts`
- `src/lib/api/request-parsers.test.ts`
- `src/lib/recommendation/profile.test.ts`
- `src/lib/recommendation/random-pick.test.ts`

Future useful test files:

- `src/lib/api/restaurants.test.ts` for mocked provider expansion and fallback behavior

Commands:

```bash
node --import ./scripts/register-ts-path-alias-loader.mjs --test src/lib/llm/intent-parser.test.ts
node --import ./scripts/register-ts-path-alias-loader.mjs --test src/lib/llm/restaurant-shortlist.test.ts
node --import ./scripts/register-ts-path-alias-loader.mjs --test src/lib/recommendation/random-pick.test.ts
pnpm openapi:validate
pnpm openapi:generate
pnpm typecheck
pnpm check
```

## Implementation Order

Recommended PR sequence:

1. Types, schemas, parsers, fixtures, and parser tests.
2. OpenAPI/provider expansion server support and API tests.
3. Eat-out page migration to v1 search and query expansion wiring.
4. Fact cards, grounded rerank validation, prompts, and rerank UI.
5. Clarification and conversational refinement patches.
6. Feedback aspects, derived local profile, and settings preference editor.
7. Random pick modes and tests.
8. Final manual verification, live dev deployment check, and README/API guide updates.

Each PR must preserve behavior with AI Search disabled.

## Verification Checklist

Before declaring implementation done:

- AI Search disabled:
  - home keyword search navigates normally
  - eat-out search returns deterministic results
  - random mode still picks a restaurant
- AI Search enabled:
  - vague query can ask one clarification
  - medium-confidence query shows chips and still searches
  - query expansion improves low-result searches without failing base results
  - AI rerank uses only valid candidate IDs
  - unsupported hallucinated reasons are replaced or omitted
- Local profile:
  - feedback aspects remain in localStorage only
  - settings editor can pin/hide inferred preferences
  - profile prompt summary excludes hidden preferences
- API:
  - OpenAPI validates
  - generated client updates are committed
  - cursor requests remain cursor-only
  - provider expansion has no live API dependency in unit tests
- Required commands:
  - `pnpm typecheck`
  - `pnpm check`

## Rollback Strategy

- If WebLLM fails, current runtime fallback keeps keyword search.
- If new intent parsing fails, return fallback mode and use the normalized query.
- If provider expansion causes API errors, ignore expansion and keep base results.
- If rerank validation rejects all entries, keep deterministic ranking.
- If feedback aspect migration encounters malformed data, preserve valid feedback events with empty
  aspects.

The rollback path should not require clearing user localStorage.
