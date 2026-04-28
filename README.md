# pekopeko

Mobile-first meal picker built with Next.js 16, React 19, Mantine 9, and Zustand.

The app has two modes:

- `Eat Out` is the default. It shows the current location on a Leaflet map, supports cuisine-first restaurant search, random picks, a persistent results map, and map focus that follows the active restaurant while scrolling.
- `Cook` filters a local food database by mood, season, meal time, spice tolerance, and optional local semantic search, then uses a slot-style picker to choose a dish.

Locales: `zh-CN`, `ja`, `en`.

## Design Docs

- `docs/llm-restaurant-design.md` describes the local LLM restaurant intelligence design and first-pass behavior.
- `docs/llm-restaurant-implementation.md` records implementation phases, validation rules, tests, and deferred work.

## Scripts

```bash
pnpm dev        # Turbopack dev server
pnpm build      # Production build (Webpack, required by Serwist)
pnpm start      # Start production server
pnpm typecheck  # TypeScript
pnpm check      # Biome check
pnpm lint       # Biome write mode (see package.json: biome check --write ./src)
pnpm format     # Biome format
pnpm openapi:validate        # Validate the OpenAPI schema
pnpm openapi:generate:ts     # Generate the TypeScript client with openapi-generator
pnpm openapi:generate        # Validate + generate the TypeScript client
pnpm test:db:registry        # Live Prisma DB test for registry identity/supersession
pnpm test:db:search-session  # Live Prisma DB test for session-backed pagination
```

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env.local` with the server-side keys you need:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pekopeko?schema=public
GOOGLE_MAPS_SERVER_KEY=
HOTPEPPER_API_KEY=
AMAP_SERVER_KEY=
SEARCH_CURSOR_SECRET=
NEXT_PUBLIC_ENABLE_LLM=true
```

`NEXT_PUBLIC_ENABLE_LLM` is optional. If omitted or set to `true`, the local LLM feature is available in Settings. Set it to `false` to hard-disable all LLM UI and runtime behavior.

3. Generate the Prisma client and apply the initial migration to a fresh local database:

```bash
pnpm prisma:generate
pnpm prisma:migrate:dev
```

If the database already exists and you only need to apply the checked-in migrations non-interactively, use:

```bash
pnpm prisma:migrate:deploy
```

4. Start the dev server:

```bash
pnpm dev
```

## API Contract

`openapi/pekopeko-api.yaml` is the source of truth for `/api/v1`.

- The schema is validated with `pnpm openapi:validate`.
- TypeScript client/models are generated into `src/generated/api`.
- Dart client generation is intentionally not maintained in this repository.
- The generated TypeScript output is intentionally excluded from Biome checks.

The current `v1` contract is schema-first and intentionally stricter than the old ad hoc JSON:

- request and response fields use camelCase
- search pagination uses short-lived server-backed opaque cursor tokens for stable multi-page traversal
- search exposes structured `providerStatuses`
- restaurant details return `{ restaurant, freshness, providerStatuses }`
- capabilities publish search enums, feature codes, and category metadata

Before freezing `v1`, use [API_V1_CHECKLIST.md](API_V1_CHECKLIST.md) as the release checklist for the contract and restaurant registry.
For client-integration rules, see [API_CLIENT_GUIDE.md](API_CLIENT_GUIDE.md).

## Live Provider Verification

With `.env.local` populated and the Prisma migration applied, the most useful end-to-end check is the v1 search API because it returns both `restaurantKey` and `providerRefs`.

Start the app:

```bash
pnpm dev
```

Then verify the three core behaviors:

1. Same venue merges into one hybrid result with both provider refs:

```bash
curl -s -H 'content-type: application/json' -H 'accept-language: ja' \
  -d '{"locale":"ja","provider":"auto","location":{"lat":35.6905484,"lng":139.7017888},"radiusM":400,"query":{"keyword":"good spoon Handmade Cheese&Pizzeria ルミネ新宿店"},"sort":{"by":"distance","direction":"asc"}}' \
  http://127.0.0.1:3000/api/v1/restaurants/search
```

Expected shape:
- one `results[]` entry
- `source: "hybrid"`
- `providerRefs` contains both `google` and `hotpepper`

2. Descriptor-heavy Google and HotPepper names still merge when the underlying address matches:

```bash
curl -s -H 'content-type: application/json' -H 'accept-language: ja' \
  -d '{"locale":"ja","provider":"auto","location":{"lat":35.6905484,"lng":139.7017888},"radiusM":300,"query":{"keyword":"じぶんどき 新宿東口駅前店"},"sort":{"by":"distance","direction":"asc"}}' \
  http://127.0.0.1:3000/api/v1/restaurants/search
```

Expected shape:
- one `results[]` entry
- `source: "hybrid"`
- `providerRefs` contains both providers even though Google may prepend a descriptor like `全席個室`

3. Same-brand nearby branches stay separate and get different `restaurant_key` values:

```bash
curl -s -H 'content-type: application/json' -H 'accept-language: ja' \
  -d '{"locale":"ja","provider":"auto","location":{"lat":35.690921,"lng":139.700258},"radiusM":800,"query":{"keyword":"サイゼリヤ"},"sort":{"by":"distance","direction":"asc"}}' \
  http://127.0.0.1:3000/api/v1/restaurants/search
```

Expected shape:
- multiple `results[]` entries
- each branch keeps its own `restaurantKey`
- no cross-branch key reuse just because the chain shares one website host

If you want a clean dev-only rerun of the registry tests, truncating `restaurant_aliases` and `restaurants` is fine before repeating the queries.

## Product Notes

- No accounts. State is stored in localStorage through Zustand `persist`.
- Japan uses HotPepper + Google Places merged together.
- China uses Amap.
- Other regions use Google Places.
- Region/provider selection is inferred from reverse geocoding.
- Maps use Leaflet + OpenStreetMap tiles. API keys stay server-side behind app routes.
- Search radius uses a non-linear preset scale tuned for walking and short vehicle trips:
  `300m, 500m, 750m, 1km, 1.5km, 2km, 3km, 4km, 5km, 6km, 8km, 10km`.
- Local semantic search is optional and default-off:
  - app-level kill switch: `NEXT_PUBLIC_ENABLE_LLM=false`
  - user-level toggle: Settings > `AI Search`
  - model runtime: `@mlc-ai/web-llm` with `Qwen3.5-0.8B-q0f16-MLC`
  - default model record: injected through `src/lib/llm/model-config.ts`
  - failure mode: always falls back to deterministic keyword search

## Local LLM Search

- `Cook` mode always supports local keyword filtering by dish name, tags, category, and description.
- When `AI Search` is enabled, the cook query can also infer mood, category, meal time, spicy cap, and recommended dish ids. Manual mood selection still overrides inferred mood.
- `Eat Out` always supports keyword search from the home screen.
- When `AI Search` is enabled, the eat-out query can infer `keyword`, `category`, and `openNow`, then routes into `/eat-out` with those query params.
- Model initialization is lazy. No worker starts and no model download begins until the user submits an AI-enabled search.
- The Qwen3.5 default uses a custom WebLLM app config for engine creation and model cache checks.
- Settings shows support/runtime state, cache presence, and a `Clear model cache` action. Legacy default model preferences migrate to the current default while custom model ids are preserved.
- Service worker runtime caching keeps downloaded model artifacts reusable across sessions.

## Project Structure

```text
src/
  app/
    page.tsx              # Home screen
    eat-out/page.tsx      # Restaurant search/results
    settings/page.tsx     # Preferences
    api/places/nearby/    # Restaurant search proxy
    api/geocode/reverse/  # Region/provider detection
    api/places/photo/     # Google photo proxy
    sw.ts                 # Serwist service worker entry
  components/
    food/                 # Cook-mode result UI
    search/               # Shared text / semantic search input
    picker/               # Slot-style food picker
    restaurant/           # Cards and Leaflet map
    filters/              # Mood/season/meal-time UI
    layout/               # App shell, providers, bottom nav
  data/                   # Static food/category metadata
  lib/                    # Filtering, time/season logic, LLM runtime, map adapters
  db/                     # Prisma client bootstrap
  stores/                 # Zustand stores, including LLM runtime status
  workers/                # WebLLM dedicated worker
  types/                  # Shared types
  i18n/                   # next-intl config and message files
prisma/                   # Prisma schema and SQL migrations
```

## Engineering Notes

- `useSearchParams()` on Next.js 16 must be wrapped in `Suspense`.
- `react-leaflet` components are dynamically imported with `ssr: false`.
- `pnpm build` uses `--webpack` because Serwist does not build correctly with Turbopack.
- UI copy is mostly inline locale ternaries in TSX; multilingual food names live in the data layer.
- The LLM worker is created with `new Worker(new URL(..., import.meta.url), { type: "module" })`.
- WebLLM support is checked in the browser at runtime through WebGPU detection before exposing the feature as usable.
- The production build currently emits a warning that one generated Next.js chunk is larger than Serwist's default precache threshold; the build still succeeds and model assets are runtime-cached rather than precached.
