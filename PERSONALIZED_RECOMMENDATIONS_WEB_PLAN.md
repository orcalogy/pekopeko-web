# Web Plan: Personalized Recommendations

## Objective

Implement the local-only recommendation design in the Next.js app without introducing server-side user preference storage.

This work should leave the web app behaviorally aligned with the Flutter app and also define the reference fixtures that Flutter will implement against.

## Current State

- The frontend stores only visit history in `src/stores/visited.ts`.
- Visit history is richer than Flutter because it already stores a local snapshot with cuisine, features, price, and distance.
- The current AI layer supports semantic intent parsing and shortlist rerank.
- The taste profile and rerank layer are web-only today.
- The compatibility route strips `restaurant_key` before the current frontend sees results.

## Target State

- Frontend restaurant state includes canonical `restaurantKey`.
- Visits remain factual history.
- Explicit local feedback is added.
- Deterministic personalized scoring is applied before optional AI rerank.
- Shared fixtures are introduced so Flutter can match behavior.

## Phase 1: Canonical Identity

### Goal

Make `restaurant_key` available to the web client everywhere restaurant actions are recorded.

### Tasks

1. Extend `src/types/restaurant.ts`.
   Add `restaurantKey?: string` or a required `restaurantKey: string` if migration is manageable.

2. Update compatibility adapters in `src/lib/api/restaurants.ts`.
   `toCompatibilityRestaurant()` currently discards `restaurantKey`. Preserve it in the compatibility payload consumed by the frontend.

3. Update any restaurant fetch path that assumes the client only sees provider `id`.
   Check `src/app/api/places/nearby/route.ts`, `src/app/eat-out/page.tsx`, and any other caller expecting the compatibility shape.

4. Keep `id` for compatibility, but move local recommendation writes to `restaurantKey`.

### Exit Criteria

- Restaurant cards and local actions have access to `restaurantKey`.
- No local recommendation state depends on provider-specific `id` as the primary key.

## Phase 2: Separate Visits From Feedback

### Goal

Add an explicit local feedback store instead of overloading visits.

### Tasks

1. Add `src/stores/restaurant-feedback.ts`.
   Include:
   - schema versioning
   - add/remove/clear helpers
   - event types: `liked_after_visit`, `disliked_after_visit`, `not_interested`, optional `saved`
   - snapshot capture fields aligned with the shared design

2. Keep `src/stores/visited.ts` focused on factual history.
   Preserve current snapshot fields and add `restaurantKey`.

3. Add migrations for existing visited data.
   Preserve old records keyed by `id` where possible, then upgrade future writes to `restaurantKey`.

4. Update settings UI to clear both visited and feedback stores.

### Exit Criteria

- Visits and feedback are stored separately.
- Both stores are versioned and migratable.

## Phase 3: Deterministic Preference Engine

### Goal

Introduce a deterministic recommendation layer that both clients can match.

### Tasks

1. Add a new module such as `src/lib/recommendation/profile.ts`.
   Derive a `DerivedTasteProfile` from visits plus feedback.

2. Add a new module such as `src/lib/recommendation/scoring.ts`.
   Implement:
   - affinity scoring
   - negative preference penalties
   - recent-visit penalties
   - exact restaurant suppression
   - novelty adjustment

3. Add a new module such as `src/lib/recommendation/reasons.ts`.
   Produce reason codes from the deterministic score inputs.

4. Refactor current web-only taste profile logic in `src/lib/llm/restaurant-taste-profile.ts`.
   Either replace it or make it a formatting layer over the new derived profile.

### Exit Criteria

- A pure deterministic scorer exists.
- The scorer does not require LLM to produce personalized order.

## Phase 4: Shortlist Formatting And AI Rerank

### Goal

Keep the current AI rerank approach, but feed it richer local preference context.

### Tasks

1. Update `src/lib/llm/restaurant-shortlist.ts`.
   Include:
   - canonical id or `restaurantKey`
   - positive/negative feedback summary
   - exact suppression state if relevant
   - deterministic reasons when useful

2. Update `src/lib/llm/prompts.ts`.
   Replace the current "less recently visited" framing with:
   - hard constraints must remain satisfied
   - prefer profile matches
   - avoid recent negatives and dismissed items
   - keep reasons short and concrete

3. Update `src/lib/llm/use-semantic-search.ts` and `src/app/eat-out/page.tsx`.
   Run rerank only on deterministic top-N results.

4. Keep deterministic order as the fallback path if rerank fails.

### Exit Criteria

- AI rerank is an enhancement on top of deterministic ranking, not a replacement for it.

## Phase 5: UI Surface

### Goal

Expose recommendation feedback clearly without cluttering the current flow.

### Tasks

1. Update `src/components/restaurant/RestaurantCard.tsx`.
   Add actions for:
   - like after visit
   - dislike after visit
   - not interested

2. Keep `mark visited` separate from positive feedback.

3. Show recommendation reasons using:
   - deterministic reason codes rendered locally
   - optional AI explanation text when rerank is used

4. Add local settings controls to:
   - clear feedback
   - clear visits
   - clear all recommendation data

### Exit Criteria

- Users can express both positive and negative preference.
- UI terminology distinguishes visit history from taste preference.

## Phase 6: Shared Fixtures

### Goal

Make the behavior portable to Flutter.

### Tasks

1. Add fixture files under a shared directory such as `test/fixtures/recommendation/`.
   Suggested fixtures:
   - `visit_migration.json`
   - `feedback_events.json`
   - `taste_profile_cases.json`
   - `ranking_cases.json`
   - `suppression_cases.json`

2. Add tests for pure logic modules.

3. Keep the fixture format implementation-agnostic so Flutter can consume the same data.

### Exit Criteria

- The recommendation logic is testable outside the React UI.
- Flutter can implement the same behavior against the same fixtures.

## File-Level Worklist

- `src/types/restaurant.ts`
- `src/lib/api/restaurants.ts`
- `src/app/api/places/nearby/route.ts`
- `src/stores/visited.ts`
- `src/stores/restaurant-feedback.ts`
- `src/lib/recommendation/profile.ts`
- `src/lib/recommendation/scoring.ts`
- `src/lib/recommendation/reasons.ts`
- `src/lib/llm/restaurant-shortlist.ts`
- `src/lib/llm/restaurant-taste-profile.ts`
- `src/lib/llm/prompts.ts`
- `src/lib/llm/use-semantic-search.ts`
- `src/app/eat-out/page.tsx`
- `src/components/restaurant/RestaurantCard.tsx`
- `src/app/settings/page.tsx`
- `test/fixtures/recommendation/*`

## Suggested Delivery Order

1. Canonical identity
2. Feedback store
3. Deterministic profile and scoring
4. UI actions
5. AI rerank integration
6. Shared fixtures and regression tests

## Verification

- `pnpm typecheck`
- `pnpm check`
- focused tests for pure recommendation modules when added

## Risks

- Existing visited records are keyed by `id`, so migration must be tolerant.
- The compatibility route currently strips `restaurant_key`, so identity work must land early.
- If reason rendering depends only on generated text, parity with Flutter will drift. Prefer shared reason codes.
