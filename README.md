# pekopeko

Mobile-first meal picker built with Next.js 16, React 19, Mantine 9, and Zustand.

The app has two modes:

- `Eat Out` is the default. It shows the current location on a Leaflet map, supports cuisine-first restaurant search, random picks, a persistent results map, and map focus that follows the active restaurant while scrolling.
- `Cook` filters a local food database by mood, season, meal time, spice tolerance, and optional local semantic search, then uses a slot-style picker to choose a dish.

Locales: `zh-CN`, `ja`, `en`.

## Scripts

```bash
pnpm dev        # Turbopack dev server
pnpm build      # Production build (Webpack, required by Serwist)
pnpm start      # Start production server
pnpm typecheck  # TypeScript
pnpm check      # Biome check
pnpm lint       # Biome write mode (see package.json: biome check --write ./src)
pnpm format     # Biome format
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
NEXT_PUBLIC_ENABLE_LLM=true
```

`NEXT_PUBLIC_ENABLE_LLM` is optional. If omitted or set to `true`, the local LLM feature is available in Settings. Set it to `false` to hard-disable all LLM UI and runtime behavior.

3. Generate the Prisma client and apply the initial migration to a fresh local database:

```bash
pnpm prisma:generate
pnpm prisma:migrate:dev
```

4. Start the dev server:

```bash
pnpm dev
```

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
  - model runtime: `@mlc-ai/web-llm` with `SmolLM2-135M-Instruct-q0f16-MLC`
  - failure mode: always falls back to deterministic keyword search

## Local LLM Search

- `Cook` mode always supports local keyword filtering by dish name, tags, category, and description.
- When `AI Search` is enabled, the cook query can also infer mood, category, meal time, spicy cap, and recommended dish ids. Manual mood selection still overrides inferred mood.
- `Eat Out` always supports keyword search from the home screen.
- When `AI Search` is enabled, the eat-out query can infer `keyword`, `category`, and `openNow`, then routes into `/eat-out` with those query params.
- Model initialization is lazy. No worker starts and no model download begins until the user submits an AI-enabled search.
- Settings shows support/runtime state, cache presence, and a `Clear model cache` action.
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
