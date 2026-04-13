# pekopeko

Mobile-first meal picker built with Next.js 16, React 19, Mantine 9, and Zustand.

The app has two modes:

- `Eat Out` is the default. It shows the current location on a Leaflet map, supports cuisine-first restaurant search, random picks, a persistent results map, and map focus that follows the active restaurant while scrolling.
- `Cook` filters a local food database by mood, season, meal time, and spice tolerance, then uses a slot-style picker to choose a dish.

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
GOOGLE_MAPS_SERVER_KEY=
HOTPEPPER_API_KEY=
AMAP_SERVER_KEY=
```

3. Start the dev server:

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
    picker/               # Slot-style food picker
    restaurant/           # Cards and Leaflet map
    filters/              # Mood/season/meal-time UI
    layout/               # App shell, providers, bottom nav
  data/                   # Static food/category metadata
  lib/                    # Filtering, time/season logic, map adapters
  stores/                 # Zustand stores
  types/                  # Shared types
  i18n/                   # next-intl config and message files
```

## Engineering Notes

- `useSearchParams()` on Next.js 16 must be wrapped in `Suspense`.
- `react-leaflet` components are dynamically imported with `ssr: false`.
- `pnpm build` uses `--webpack` because Serwist does not build correctly with Turbopack.
- UI copy is mostly inline locale ternaries in TSX; multilingual food names live in the data layer.
