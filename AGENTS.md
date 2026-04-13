@AGENTS.md

# pekopeko - Project Guide

## Quick Reference

```bash
pnpm dev              # Dev server (Turbopack)
pnpm build            # Production build (Webpack, required by Serwist)
pnpm typecheck        # tsc --noEmit
pnpm check            # Biome lint (no auto-fix)
pnpm lint             # Biome lint + format (auto-fix)
```

Always run `pnpm typecheck` and `pnpm check` before declaring work done.

## Tech Stack & Versions

| Tool | Version | Notes |
|------|---------|-------|
| Next.js | 16.x | App Router. **Read `node_modules/next/dist/docs/` for API changes.** |
| React | 19.2 | `useRef` requires an initial argument (`useRef<T>(null)` or `useRef<T>(undefined)`) |
| Mantine | v9 | `Collapse` uses `expanded` prop (not `in` or `opened`). Import from `@mantine/core`. |
| TypeScript | 5.x | Strict mode enabled |
| Zustand | 5.x | `persist` middleware for localStorage |
| Framer Motion | 12.x | Animations and page transitions |
| Biome | 2.4 | Linter + formatter. Schema differs from 2.0 — `organizeImports` lives under `assist.actions` |
| Leaflet | 1.9 | Map rendering with OpenStreetMap tiles. No API key needed. |
| react-leaflet | 5.x | React wrapper for Leaflet. Must be dynamically imported with `ssr: false`. |
| Serwist | 9.x | PWA service worker. Build **must** use `--webpack` flag (Turbopack unsupported) |
| next-intl | 4.x | i18n: zh-CN, ja, en |
| pnpm | 10.x | Package manager |

## Architecture

- **No user accounts** — all state in localStorage via Zustand persist
- **Two modes**: Cook (local food DB) and Eat Out (map API search)
- **Three locales**: zh-CN (primary), ja, en — food names are multilingual in data, UI text uses inline ternaries
- **Map providers**: Japan uses HotPepper + Google Places merged (dual-source, parallel query, coordinate-matched merge); China uses Amap (高德); elsewhere uses Google only — auto-detected by reverse geocoding
- **Map rendering**: Leaflet + OpenStreetMap tiles (free, no client-side API key). `RestaurantMap` is dynamically imported with `ssr: false`.
- **API keys server-side only** — proxied through `/api/places/nearby` and `/api/geocode/reverse`

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    page.tsx              # Home: mode switch, cook picker, eat-out categories
    eat-out/page.tsx      # Restaurant search results (requires Suspense for useSearchParams)
    settings/page.tsx     # User preferences
    api/places/nearby/    # Proxy: nearby restaurant search
    api/geocode/reverse/  # Proxy: reverse geocode for region detection
    sw.ts                 # Serwist service worker entry
  components/
    picker/FoodPicker.tsx # Slot-reel random picker animation
    food/FoodCard.tsx     # Cook-mode result card
    restaurant/           # RestaurantCard, RestaurantMap (Leaflet)
    filters/              # MoodSelector, MealTimeIndicator, SeasonBadge
    layout/               # AppShell, BottomNav, Providers
  data/                   # Static food DB (~223 entries), categories, moods, seasons
  lib/
    food-filter.ts        # filterFoods(), pickRandom(), pickWeightedRandom()
    time-utils.ts         # getCurrentMealTime()
    season-utils.ts       # getCurrentSeason(lat) — hemisphere-aware
    map/                  # google.ts, amap.ts, hotpepper.ts, merge.ts, provider.ts
  stores/                 # Zustand: preferences, app-state, location, visited
  types/                  # Food, Restaurant, FilterOptions, MapProvider
  i18n/                   # next-intl config + message JSON files
```

## Key Patterns

### i18n — Inline Ternary Style
UI text uses inline locale ternaries (not message keys) for brevity:
```tsx
{locale === 'zh-CN' ? '开始' : locale === 'ja' ? '始める' : 'Start'}
```
Food data has multilingual names built into the objects: `food.name[locale]`.

### Navigation
Use Next.js `useRouter` from `next/navigation` for all navigation. **Never use `window.location.href`** — it breaks SPA state and causes bfcache issues on back navigation.

### Map API Locale Sync
Client passes `locale` param to `/api/places/nearby`. The API route maps it to `languageCode` for Google Places. Restaurant names, addresses, types, and hours come back in the user's language.

### `useSearchParams()` Requires Suspense
Next.js 16 requires a `<Suspense>` boundary around any component using `useSearchParams()`. See `eat-out/page.tsx` for the pattern.

### Service Worker Types
`tsconfig.json` includes `"webworker"` in the `lib` array. The SW file (`sw.ts`) uses a manual `declare const self` for the `__SW_MANIFEST` type.

## Gotchas

- **Biome v2.4 schema**: `organizeImports` is under `assist.actions.source`, not top-level. `files.ignore` is now `files.includes` + `experimentalScannerIgnores`.
- **Biome suppress in JSX**: `{/* biome-ignore ... */}` as a JSX expression sibling doesn't suppress rules on child elements. Use `// biome-ignore` inside callback functions instead, or restructure to avoid the issue.
- **Mantine v9 breaking changes**: Many prop renames from v7. Always verify props against the `.d.ts` files when unsure.
- **React 19 `useRef`**: `useRef<T>()` with no argument is a type error. Always pass an initial value.
- **Build flag**: `pnpm build` uses `--webpack` (not Turbopack) because Serwist requires Webpack for SW bundling. Dev uses `--turbopack`.
- **Cookie Store API**: Use `window.cookieStore.set()` instead of `document.cookie` to avoid Biome's `noDocumentCookie` rule.
