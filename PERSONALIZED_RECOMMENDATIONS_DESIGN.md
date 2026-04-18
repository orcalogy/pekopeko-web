# Personalized Recommendations Design

## Summary

This design adds local-only, cross-platform restaurant personalization without introducing user accounts or server-side preference storage.

The same product behavior should exist in both the Next.js app and the Flutter app:

- factual visit history
- explicit feedback on visited and unvisited restaurants
- deterministic personalized ranking
- optional LLM-assisted shortlist rerank and explanation
- identical semantics for local persistence, decay, and suppression

The backend remains stateless with respect to user preferences. It only provides normalized restaurant data and stable identifiers.

## Goals

- Improve restaurant recommendations using past behavior and explicit feedback.
- Keep behavior aligned across web and Flutter.
- Preserve full offline/local privacy for taste data.
- Make ranking understandable, testable, and mostly deterministic.
- Use LLM for interpretation and rerank only, not as the primary scoring engine.

## Non-Goals

- Server-side storage of preferences, feedback, or profiles.
- Cross-device sync by default.
- Full collaborative filtering or population-level recommendation.
- Long-form conversational memory.
- Letting the LLM infer missing restaurant attributes that are not present in candidate data.

## Design Principles

1. Visit history is not the same as positive preference.
2. Explicit negative feedback must be supported.
3. Deterministic scoring owns most of the ranking.
4. LLM is optional and must degrade cleanly.
5. Platform parity is defined by shared data contracts and fixtures, not by one repo copying another.

## Canonical Restaurant Identity

The canonical identifier for local recommendation state is `restaurant_key`, not provider-specific `id`.

Rationale:

- `restaurant_key` is already the opaque backend-owned identifier for normalized restaurant records.
- provider `id` can differ across providers and merged results.
- feedback and suppression should attach to the normalized place, not to a transient provider id.

Both clients should still keep `id` for compatibility, but recommendation state should key off `restaurant_key`.

## Product Surface

### Visit

`Visited` means the user went there or chose to record that they did.

Effects:

- increases historical familiarity
- adds factual data to the taste profile
- adds recency penalty for repeat recommendations

It does not automatically mean the user liked the restaurant.

### Positive Feedback

`liked_after_visit`

Effects:

- strong positive preference
- should shape cuisine, feature, budget, and distance preferences
- long-lived signal with slow decay

### Negative Feedback

`disliked_after_visit`

Effects:

- strong negative preference
- should reduce ranking of similar restaurants
- long-lived signal with slow decay

### Lightweight Dismissal

`not_interested`

Effects:

- temporary or medium-strength negative signal
- can suppress exact restaurants for a cooldown window
- should not permanently mark an entire cuisine as disliked after one dismissal

### Optional Save Signal

`saved`

Effects:

- mild positive signal
- can be used later for shortlist prioritization

## Shared Local Data Contract

### RestaurantRef

Minimal stable reference stored in user data.

```ts
type RestaurantRef = {
  restaurantKey: string;
  providerId?: string;
  name: string;
};
```

### RestaurantPreferenceSnapshot

Captured when the user visits or gives feedback.

```ts
type RestaurantPreferenceSnapshot = {
  cuisineType?: string;
  features?: string[];
  priceLevel?: number;
  distance?: number;
  source?: 'google' | 'hotpepper' | 'amap' | 'hybrid';
};
```

### VisitRecord

```ts
type VisitRecord = {
  restaurantKey: string;
  providerId?: string;
  name: string;
  visits: number[];
  snapshot?: RestaurantPreferenceSnapshot;
};
```

### FeedbackEvent

```ts
type FeedbackKind =
  | 'liked_after_visit'
  | 'disliked_after_visit'
  | 'not_interested'
  | 'saved';

type FeedbackEvent = {
  id: string;
  restaurantKey: string;
  providerId?: string;
  kind: FeedbackKind;
  createdAt: number;
  snapshot?: RestaurantPreferenceSnapshot;
  context?: {
    queryKeyword?: string;
    categoryId?: string;
    openNow?: boolean;
    partySize?: number;
  };
};
```

### DerivedTasteProfile

This is computed locally from visits plus feedback. It is not the source of truth.

```ts
type DerivedTasteProfile = {
  totalVisits: number;
  totalFeedbackEvents: number;
  topCuisines: string[];
  avoidedCuisines: string[];
  topFeatures: string[];
  avoidedFeatures: string[];
  preferredPriceLevel?: 1 | 2 | 3 | 4;
  typicalDistanceMeters?: number;
  noveltyPreference: 'low' | 'medium' | 'high';
  suppression: {
    restaurantKeys: string[];
  };
};
```

## Ranking Pipeline

### Step 1: Candidate retrieval

Retrieve nearby candidates using the existing backend search flow.

### Step 2: Hard filters

Apply hard constraints first:

- open now
- budget ceiling
- party size
- required features
- any manual client filter

Hard filters must be identical across clients.

### Step 3: Deterministic base score

Each candidate gets a deterministic score composed from:

- query match
- category/cuisine match
- distance fit
- budget fit
- quality hint such as rating when available
- visit recency penalty
- positive affinity bonus
- negative affinity penalty
- diversity/novelty adjustment
- exact restaurant suppression

The exact weights do not need to be mathematically identical across UI layers if the shared fixtures remain stable, but the intended behavior must match.

### Step 4: Shortlist

Take the top N deterministic results, typically 10 to 20.

### Step 5: Optional LLM rerank

If local LLM is enabled and healthy:

- send only the shortlisted candidates
- include the goal summary plus compact taste profile summary
- ask for ordered candidate ids plus short reasons

If LLM is unavailable or returns invalid output:

- keep deterministic order
- do not block the recommendation flow

## LLM Responsibilities

LLM may be used for:

- natural-language intent parsing
- shortlist rerank
- short user-facing explanations

LLM must not:

- invent missing restaurant facts
- override hard filters
- rank candidates outside the provided shortlist
- store user memory outside local app storage

## Shared Explanation Contract

When an explanation is shown, it should be tied to a small set of reason codes, even if the displayed text is generated.

Suggested reason codes:

- `query_match`
- `preferred_cuisine`
- `preferred_feature`
- `budget_fit`
- `distance_fit`
- `novel_pick`
- `not_recently_visited`
- `popular_high_rating`
- `suppressed_due_to_feedback`

Both clients should be able to show either generated text or localized templated text from the same reason codes.

## Persistence Rules

- Keep visit history and feedback in separate local stores.
- Persist snapshots with visits and feedback to avoid losing preference context when the restaurant is no longer in memory.
- Use schema versioning and migration in both clients.
- Support deletion of all local recommendation data from Settings.

## Suggested Decay Rules

- recent visits: strong short-term penalty
- `liked_after_visit`: slow decay
- `disliked_after_visit`: slow decay
- `not_interested`: medium decay plus per-restaurant suppression window

Suggested initial suppression:

- exact restaurant suppression after `not_interested`: 14 to 30 days
- exact restaurant suppression after repeated `disliked_after_visit`: longer or indefinite until cleared

## Platform Parity Requirements

These must stay aligned:

- data shapes
- feedback semantics
- suppression windows
- deterministic ranking rules
- reason codes
- fallback behavior when LLM is disabled

These may differ:

- UI layout
- animation
- local storage implementation details
- exact model runtime implementation

## Optional Import/Export

Because there is no server-side storage, optional profile export/import is the only way to move preference data between web and Flutter.

Out of scope for the first implementation, but the stored schemas should make this possible later.

## Testing Strategy

Maintain shared JSON fixtures for:

- visit and feedback migrations
- derived taste profile output
- deterministic ranking scenarios
- suppression behavior
- LLM rerank prompt input formatting

The fixtures should be consumed by tests in both repos.
