# Plan: Toggleable LLM-Enhanced Search

## Implementation Status

Status as of 2026-04-13:

- Phases 1 through 5 are implemented in the app.
- `@mlc-ai/web-llm` is integrated behind both the app-level flag and the user toggle.
- The shipped model default is `Qwen3-0.6B-q4f16_1-MLC`.
- Cook mode now supports semantic intent parsing plus deterministic keyword fallback.
- Eat-out home search now supports semantic parsing into `keyword`, `category`, and `openNow`, then routes into `/eat-out`.
- Settings now exposes support state, runtime state, model cache state, and a clear-cache action.
- Service worker runtime caching now covers remote model assets.
- Verification passed: `pnpm typecheck`, `pnpm check`, and `pnpm build`.

What remains optional rather than blocking:

- refine-in-place semantic search on `src/app/eat-out/page.tsx`
- richer explanation text for inferred cook-mode intent
- deeper temporary restaurant filter inference for budget/rating

## Review Summary

The previous draft was directionally useful, but it needed four corrections before it could guide implementation:

1. The LLM toggle was treated as a settings detail instead of a product requirement.
2. It mixed up "text search" and "LLM search", which made the off state unclear.
3. It placed the eat-out search input on `src/app/eat-out/page.tsx` "above the category grid", but that grid actually lives on `src/app/page.tsx`.
4. A few schemas did not match the current codebase. Example: `Mood` uses `sad`, not `down`.

This revised plan makes the LLM layer explicitly optional and aligns the integration with the current routes, stores, and filter model.

---

## Product Requirements

### Hard requirements

- The LLM feature must be toggleable on/off by the user.
- The default state is **off**.
- When off, the app must not initialize the WebLLM worker, download model files, or show LLM-specific loading UI.
- Existing structured filters remain the source of truth. LLM output can suggest or prefill filters, but should not replace the manual controls.
- The app must remain fully useful with LLM disabled.

### Recommended gating model

Use two layers of gating:

1. **App-level availability flag**
   - Example: `NEXT_PUBLIC_ENABLE_LLM=true`
   - Purpose: ship a hard kill switch for the whole feature.
   - If false, hide all AI-specific settings and never import the LLM runtime.
2. **User preference toggle**
   - Persisted in `usePreferences` as `llmEnabled`.
   - Default `false`.
   - If false, the UI stays in deterministic text-search mode only.

This gives us both a product toggle and an operational kill switch.

---

## Core UX Decision

The LLM toggle should control the **semantic interpretation layer**, not whether users get a text box at all.

### Recommended behavior

- Keep a text search input available in both modes.
- When LLM is off, the input uses deterministic keyword matching only.
- When LLM is on, the same input upgrades to semantic parsing plus keyword fallback.

This is the cleanest design for this app because:

- it keeps the off state useful instead of feeling like a feature removal,
- it makes Phase 1 shippable before WebLLM is added,
- it avoids UI jumping when users flip the toggle,
- it preserves the current filter-first workflow.

If product wants the input hidden entirely when AI is off, that can still be done, but the plan below assumes the stronger architecture: **text input always available, LLM optional**.

---

## Current-App Fit

### Cook mode

Current flow:

- `src/app/page.tsx`
- `MoodSelector`
- `filterFoods()`
- `FoodPicker`

LLM integration should sit on top of that existing flow:

- free-text input narrows intent,
- parsed intent maps into `FilterOptions`,
- `filterFoods()` stays the filtering engine,
- `FoodPicker` still decides the final recommendation.

### Eat-out mode

Current flow is split across two screens:

- `src/app/page.tsx`
  - location preview
  - surprise button
  - cuisine grid
- `src/app/eat-out/page.tsx`
  - results list
  - filter drawer
  - map

So the first search box for eat-out belongs on **`src/app/page.tsx`**, above or near the surprise/category actions. The results route should then read a new `keyword` search param and use it when calling `/api/places/nearby`.

Optional later refinement: add a second search box on `src/app/eat-out/page.tsx` for in-place query edits, but that should be phase 2 for eat-out, not the initial integration point.

---

## Architecture Overview

```text
User types text
    |
    v
SmartSearchInput
    |
    +--> LLM unavailable or disabled
    |      -> keyword fallback only
    |
    +--> LLM enabled
           -> lazy-init worker + model
           -> parse intent as JSON
           -> map intent to existing app filters / route params
           -> if parsing fails, fall back to keyword search
```

### Runtime rules

- No LLM imports or worker initialization until both:
  - app-level flag says available, and
  - user toggle says enabled
- No model download until the user first interacts with the AI-capable search flow
- Turning the toggle off must:
  - cancel in-flight inference,
  - stop using semantic parsing immediately,
  - keep deterministic text search working
- Turning the toggle off should **not** auto-delete cached model files; that should be a separate "clear model cache" action in Settings

---

## Data Contracts

### Cook-mode structured output

Use the actual current enums from the repo:

```ts
type Mood = "happy" | "sad" | "tired" | "stressed" | "adventurous" | "comfort";
type MealTime = "breakfast" | "lunch" | "afternoon" | "dinner" | "latenight";
type Category =
  | "chinese"
  | "japanese"
  | "korean"
  | "western"
  | "southeast-asian"
  | "fastfood"
  | "hotpot"
  | "bbq"
  | "noodles"
  | "dessert"
  | "cafe"
  | "seafood";
```

Recommended JSON shape:

```json
{
  "mood": "comfort",
  "category": "noodles",
  "maxSpicy": 1,
  "mealTime": "dinner",
  "cookableOnly": true,
  "recommendedIds": ["ramen-tonkotsu"]
}
```

Only include fields the model can infer confidently.

### Eat-out structured output

For v1, keep this narrower than the previous draft:

```json
{
  "keyword": "ramen",
  "category": "japanese",
  "openNow": true
}
```

Reason for narrowing scope:

- `minRating`, `maxBudgetLevel`, and `partySize` currently live in persisted preferences.
- LLM-driven writes into those persisted sliders would be surprising and sticky.
- V1 should avoid silently changing persistent preferences from a transient natural-language query.

If budget/rating inference is added later, it should be wired as temporary per-search state, not written straight into long-lived user preferences.

---

## Model Selection

**Primary model: `Qwen3-0.6B-q4f16_1-MLC`**

Why it still fits:

- small enough to be plausible for opt-in download,
- good Chinese/Japanese/English coverage,
- JSON mode support,
- workable first model for client-side experimentation.

Keep the model ID configurable in Settings, but do not make model switching part of the first implementation slice.

---

## File Plan

### New files

```text
src/
  workers/
    llm.worker.ts
  components/
    search/
      SmartSearchInput.tsx
  lib/
    llm/
      availability.ts         # app-level LLM feature flag helpers
      engine.ts               # lazy worker/model lifecycle
      prompts.ts              # cook/eat-out system prompts
      types.ts                # intent/result/status types
      use-semantic-search.ts  # hook that upgrades keyword search when enabled
      food-catalog.ts         # condensed food context for cook mode
      keyword-fallback.ts     # deterministic fallback for both modes
      intent-parser.ts        # validates/parses model JSON into app-safe shapes
  stores/
    llm.ts                    # runtime download/inference status
```

### Existing files to modify

| File | Planned change |
| --- | --- |
| `src/stores/preferences.ts` | Add `llmEnabled` and `llmModel` |
| `src/app/settings/page.tsx` | Add AI settings card with enable switch, availability status, cache controls |
| `src/app/page.tsx` | Add cook-mode input and eat-out home input |
| `src/app/eat-out/page.tsx` | Read `keyword` param and pass it into restaurant fetches |
| `src/app/sw.ts` | Add runtime caching for model/WASM assets |

### Notes on store design

- `usePreferences` is the right place for the persisted on/off toggle.
- `usePreferences` currently has no explicit `version` / `migrate`. Adding LLM preferences will still work with defaults, but this is a good time to add versioning so future settings migrations are explicit.
- Runtime download state should stay out of `usePreferences`; it belongs in a separate `useLlmStore`.

---

## Search UX Plan

### Cook mode on `src/app/page.tsx`

Place `SmartSearchInput` above `MoodSelector`.

Behavior:

- Always visible
- LLM off:
  - filters foods via keyword match on `name`, `tags`, `subcategory`, maybe `description`
- LLM on:
  - parses intent into `FilterOptions`
  - feeds those into `filterFoods()`
  - can optionally surface `recommendedIds`
- Manual mood chips remain editable and override model output

To make hidden filters legible, show a short "applied intent" row under the search box when semantic parsing adds filters such as category or spicy level.

### Eat-out home on `src/app/page.tsx`

Place `SmartSearchInput` in the eat-out panel, above the surprise button and cuisine grid.

Behavior:

- User types free text like "cheap ramen nearby" or "late-night cafe"
- LLM off:
  - treat input as plain restaurant keyword
  - navigate to `/eat-out?keyword=...`
- LLM on:
  - infer `keyword`, optional `category`, optional `openNow`
  - navigate to `/eat-out?keyword=...&category=...`

### Eat-out results on `src/app/eat-out/page.tsx`

Initial scope:

- read `keyword` from `useSearchParams()`
- include it in the `/api/places/nearby` request
- keep existing sliders and toggles as-is

Optional later scope:

- add the same search input at the top of the results page for refinement without going back

---

## WebLLM Worker Plan

### Worker

`src/workers/llm.worker.ts`

```ts
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (event) => handler.onmessage(event);
```

### Engine manager

`src/lib/llm/engine.ts`

Responsibilities:

- lazy-create worker only when enabled,
- load the chosen model,
- expose progress,
- keep a singleton per session,
- support abort / supersede behavior for new queries,
- expose a teardown path when disabling LLM for the current session.

Important constraint: the engine module must not cause eager worker creation just by being imported.

---

## Graceful Degradation

| Scenario | Expected behavior |
| --- | --- |
| App-level flag off | No AI settings, no worker, deterministic text search only |
| User toggle off | Deterministic text search only |
| Toggle on, model not downloaded | Show download state only after user interaction; keep keyword fallback usable |
| Toggle on, model ready | Full semantic parsing |
| No WebGPU / poor support | Either allow slower fallback if acceptable, or mark AI unavailable and stay deterministic |
| Malformed JSON | Ignore semantic result and use keyword fallback |
| Worker crash / OOM | Disable semantic parsing for the session, show a brief notification, keep text search alive |

The key rule is that **failure of the LLM layer must never remove the text-search path**.

---

## Implementation Phases

### Phase 1: Deterministic text search + toggle scaffolding

- Add `SmartSearchInput` without any LLM dependency
- Implement `keyword-fallback.ts`
- Wire cook-mode text search into `filterFoods()`
- Add eat-out home text search that navigates with `keyword` query param
- Update `src/app/eat-out/page.tsx` to read `keyword` and pass it to `/api/places/nearby`
- Add app-level availability helper
- Add `llmEnabled` and `llmModel` preferences, defaulting to off

This phase should ship real value on its own and prove the UX before model work starts.

### Phase 2: WebLLM runtime behind the toggle

- `pnpm add @mlc-ai/web-llm`
- Add worker, engine manager, and runtime store
- Ensure absolutely no model init/download occurs while disabled
- Add Settings UI for enable/disable, support status, and cache visibility

### Phase 3: Cook-mode semantic parsing

- Build cook-mode prompt using the real `Mood`, `MealTime`, and category enums
- Add condensed food catalog context
- Parse model output into `FilterOptions`
- Reflect inferred mood in `MoodSelector`
- Show applied-intent chips for non-visible inferred filters

### Phase 4: Eat-out semantic parsing

- Build restaurant intent prompt
- Parse `keyword`, `category`, `openNow`
- Navigate from home page into `/eat-out` using inferred params
- Keep existing manual filters unchanged

### Phase 5: PWA and cache polish

- Add SW runtime caching for model/WASM assets
- Add "clear model cache" in Settings
- Verify behavior after refresh and offline reuse

### Phase 6: Optional follow-ups

- Add refine-in-place search on `src/app/eat-out/page.tsx`
- Add richer cook-mode explanation text
- Revisit temporary restaurant filters for budget/rating if the product needs deeper intent mapping

---

## Verification Checklist

1. `pnpm typecheck`
2. `pnpm check`
3. With app-level flag off, confirm no AI settings or model activity appear
4. With app-level flag on and user toggle off, confirm text search works and no worker/model starts
5. Enable LLM and confirm first interaction triggers lazy model initialization
6. Disable LLM again and confirm search immediately falls back to deterministic mode
7. Cook mode: confirm semantic parsing updates candidate filtering without breaking manual mood overrides
8. Eat-out mode: confirm `keyword` and `category` route params produce expected nearby results
9. Break JSON parsing intentionally and confirm fallback still works
10. Run `pnpm build` and confirm webpack/Serwist still bundle correctly

---

## Bottom Line

The safest implementation path is:

- ship deterministic text search first,
- treat LLM as an opt-in enhancement layer,
- keep the feature off by default,
- gate it both globally and per user,
- never let LLM failures remove the underlying search UX.
