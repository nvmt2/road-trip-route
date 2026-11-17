# Road Trip Route MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobile web app: current location + category (food/sights) + N (3–5) → N good open places ordered for driving → one button opens Google Maps directions.

**Architecture:** Next.js App Router. Pure routing logic in `lib/route.ts` (unit-tested). Server-only Places client in `lib/places.ts` called by API route `app/api/route/route.ts`; key read from `process.env.GOOGLE_MAPS_API_KEY`. Client page calls the API route and renders the list + Maps link.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Vitest, Google Places API (New) Text Search, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-17-road-trip-route-mvp-design.md`

## Global Constraints
- API key only in env `GOOGLE_MAPS_API_KEY`; never sent to the browser, never committed (`.env*` in `.gitignore`).
- Filters: `openNow: true`, `minRating: 4.3`, locationBias circle radius 5000 m, `languageCode: "vi"`.
- Ranking: `userRatingCount` descending, take top N. N ∈ {3,4,5}, default 4.
- Order: nearest-neighbor by haversine distance starting at user location.
- Maps link: `https://www.google.com/maps/dir/?api=1`, `travelmode=driving`.
- UI copy in Vietnamese, mobile-first, tap targets ≥ 48px. No parking criterion.
- Repo: public `nvmt2/road-trip-route`. Deploy: Vercel.

## Review Focus
- Fewer than N results → return what exists; 0 results → friendly "Không tìm thấy chỗ nào đang mở quanh đây" message, no Maps button.
- Geolocation denied/unavailable → clear message, no crash.
- Missing `GOOGLE_MAPS_API_KEY` → API returns 500 `{error}` without leaking details; UI shows error.
- Google returns non-200 → API returns 502 `{error}`.
- Invalid request body (bad lat/lng, unknown category, N outside 3–5) → 400.

---

### Task 1: Scaffold + pure route logic

**Files:** Create project via `create-next-app` in repo root; `lib/route.ts`; `lib/route.test.ts`; `vitest.config.ts`.

**Interfaces — Produces:**
```ts
export type LatLng = { lat: number; lng: number };
export type Place = { id: string; name: string; address: string; rating: number; ratingCount: number; location: LatLng };
export function haversineKm(a: LatLng, b: LatLng): number;
export function pickTop(places: Place[], n: number): Place[];          // sort ratingCount desc, slice n
export function orderNearestNeighbor(start: LatLng, places: Place[]): Place[];
export function buildMapsUrl(origin: LatLng, ordered: Place[]): string; // ordered.length >= 1
```

- [ ] Scaffold: `npx create-next-app@15 . --ts --app --eslint --no-tailwind --no-src-dir --import-alias "@/*" --use-npm`, add `vitest`, script `"test": "vitest run"`.
- [ ] Tests: `haversineKm` Hanoi(21.0285,105.8542)→HCMC(10.8231,106.6297) ≈ 1137 km (±15); `pickTop` returns highest ratingCount first and length ≤ n; `orderNearestNeighbor` with start (0,0) and places at lng 3,1,2 returns order 1,2,3; `buildMapsUrl` with 3 places: `destination` = last place lat,lng, `destination_place_id` = last id, `waypoints` = first two joined by `|`, `waypoint_place_ids` likewise, contains `travelmode=driving` and `origin=lat,lng`; with 1 place: no `waypoints` param.
- [ ] Run `npm test` → FAIL. Implement. Run → PASS.
- [ ] Commit `feat: route ordering and maps url`.

### Task 2: Places client + API route

**Files:** `lib/places.ts`, `lib/places.test.ts`, `app/api/route/route.ts`, `app/api/route/route.test.ts`.

**Interfaces — Consumes:** Task 1 types/functions. **Produces:**
```ts
export type Category = "food" | "sights";
export async function searchPlaces(center: LatLng, category: Category, apiKey: string, fetchFn?: typeof fetch): Promise<Place[]>;
// POST /api/route  body {lat, lng, category, count}  → 200 {places: Place[], mapsUrl: string|null} | 400/500/502 {error: string}
```
- Request: `POST https://places.googleapis.com/v1/places:searchText`, headers `X-Goog-Api-Key`, `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location`. Body: food → `textQuery "quán ăn ngon địa phương", includedType "restaurant"`; sights → `textQuery "điểm tham quan", includedType "tourist_attraction"`; plus `openNow, minRating, pageSize: 20, languageCode, locationBias.circle`. Drop places missing `location`.
- [ ] Tests (fetch mocked): request body contains `openNow:true`, `minRating:4.3`, radius 5000 and correct includedType per category; response mapped to `Place`; non-200 throws. Route: invalid body → 400; missing env → 500; searchPlaces throws → 502; success → places ordered + mapsUrl; 0 results → `{places: [], mapsUrl: null}`.
- [ ] Run → FAIL. Implement. Run → PASS. Commit `feat: places search api route`.

### Task 3: Mobile UI

**Files:** `app/page.tsx` (client component), `app/page.module.css`, `app/layout.tsx` (title "Road Trip Route", lang vi).

- Two big category buttons "🍜 Ăn uống" / "🏛️ Tham quan", segmented 3/4/5 (default 4), button "Tìm tuyến". On submit: `navigator.geolocation.getCurrentPosition` → POST `/api/route` → numbered list (name, rating ★, số review, address) + big link "Mở Google Maps 🚗" (`target=_blank`). States: loading, geolocation error, API error, empty.
- [ ] Verify: `npm run build` passes; `npm run dev`, Playwright at iPhone viewport with mocked geolocation and `page.route('/api/route')` mocked → list renders and Maps link href equals mocked mapsUrl; denied geolocation shows error text. Screenshot.
- [ ] Commit `feat: mobile ui`.

### Task 4: Publish

- [ ] `.env.example` with `GOOGLE_MAPS_API_KEY=`; README (VI): what it is, local run, Vercel deploy steps, Google Cloud key steps (enable Places API (New), restrict key to Places API).
- [ ] `npm test && npm run build` pass. Commit. Create public repo `nvmt2/road-trip-route`, push `main`.
- [ ] Hand Toi Vercel steps: Import repo → env `GOOGLE_MAPS_API_KEY` → Deploy.
