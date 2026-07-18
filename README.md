# LifeOS — Phase 1 + Phase 2 (Gym + Revision)

A local-first, offline-first PWA (Next.js 16 App Router + TypeScript + Tailwind v4 +
Dexie/IndexedDB + Framer Motion + Recharts). Every feature writes to real IndexedDB —
no mock data, no server.

## What's actually real right now

### Core infrastructure
- **Full local database** (`src/lib/db`) — Dexie/IndexedDB schema covering every entity:
  settings, daily goals, hobbies, gym exercises + set logs, workout sessions,
  protein/water/step logs, LeetCode problems, spaced/weekly/monthly revision lists,
  journal entries, and knowledge-base notes. Verified by `npm run test:db` (Node +
  fake-indexeddb smoke test that writes and reads every table).
- **PWA shell** — manifest, generated icon set, service worker (`public/sw.js`) doing
  app-shell precaching + stale-while-revalidate for full offline use.
- **Design system** — dark-first token set in `src/app/globals.css` (three accent hues:
  periwinkle/focus, coral/energy, violet/calm), a `ProgressRing` component reused as
  the single recurring visual motif, and shared primitives in `src/components/ui`.

### Today tab
Real end-to-end: 7-day date strip (past editable, future locked), a dynamic checklist
driven by goals/hobbies scheduled for that weekday, a streak ring from actual completion
history, and an autosaving markdown reflection + system-design-topic field.

### Settings tab
Real: edits persist to the settings table; genuine whole-database JSON export/import/reset.

### Fitness tab — Gym planner (Phase 2, built)
- **Exercise editor** — bottom-sheet with Mon–Sun weekday tabs; add, edit, reorder (up/down),
  and archive exercises per day. Writes to `exercises` table.
- **Active workout logging** (`/fitness/workout`) — three-phase route:
  pre-start preview → live set logging → completion summary.
  Each set writes an `ExerciseSetLog`; PR detection auto-updates `Exercise.currentPR`
  and `Exercise.bestPR`; on finish, `WorkoutSession` is written with
  `durationMinutes`, `totalVolumeKg`, and `newPRCount`.
- Fitness page shows resume/done session banners and routes back into the active session.

### Placement tab — Revision engine (Phase 2, built)
- **Review session** (`/placement/review`) — card-by-card review with reveal-then-rate
  UX; Easy/Hard/Forgot buttons update `SpacedRevision.stage` and `dueDate` per
  `SPACED_REPETITION_INTERVALS_DAYS = [1, 3, 7, 14, 30]`.
- **Auto-generation** — `ensureWeeklyRevisionList()` and `ensureMonthlyRevisionList()`
  run on Placement page mount (idempotent); build rollup lists from all problems
  that have revision entries.
- **Revision list sheet** — bottom-sheet with "This week" / "This month" tabs; toggle-
  to-complete checkboxes, progress bar, live from IndexedDB.
- **Due-today card** on Placement page is tappable (highlighted periwinkle) when items
  are due; routes to `/placement/review`.
- Bug fixed: `add-problem-sheet.tsx` was using `toISOString().slice(0,10)` for `dueDate`
  — replaced with `toLocalISODate()` to avoid midnight timezone shifts.

### Notes / Analytics tabs
Dashboard shells with live IndexedDB queries and working quick-actions; honest empty
states. Deeper depth is next.

## What's intentionally not built yet, and why

1. **LeetCode live sync.** Requires a proxy server to avoid CORS — LeetCode's GraphQL
   endpoint can't be called from the browser directly, and the API is unofficial.
   `Problem.source: "leetcode_sync"` and `leetcodeSlug` are ready in the schema.
   Manual add works today. **Infra decision needed before building.**
2. **Android Health Connect.** Native Android API — can't be called from a browser PWA.
   Real path is a Capacitor/TWA shell. The `stepReadings` table and UI are ready.
3. **Push notifications (closed-app).** Requires a backend to hold subscriptions.
   `public/sw.js` already has the `push` event handler wired.
4. **PR charts / Analytics depth.** `ExerciseSetLog` and `WorkoutSession` data now
   exists; Recharts is installed. Adding volume-over-time and PR progression charts
   is purely UI work with no infra dependency.
5. **Notes depth** — full markdown editor, search, tag filtering.

## Ground rules (read before changing anything)

1. **Local-first.** No cloud DB, no server. The only planned exception is the LeetCode proxy.
2. **No boolean IndexedDB indexes.** `archived`, `pinned`, `completed`, etc. are never
   indexed. Filter with `.toArray().filter(...)` in JS — see `use-today-data.ts` and
   `use-exercise-editor.ts` for the established pattern.
3. **Design tokens** live in `src/app/globals.css` as CSS custom properties consumed via
   Tailwind v4's `@theme inline`. Reuse `ProgressRing` for any new streak/ring visual.
4. **Feature code** → `src/features/<name>/` (hooks + components). Routes → `src/app/<name>/page.tsx`.
5. **Local dates** → always use `src/lib/date.ts` helpers (`toLocalISODate`, `todayISODate`).
   Never `date.toISOString().slice(0,10)` — that shifts near midnight in non-UTC timezones.

## Verification loop

Run all four after any change; keep them 100% clean:

```bash
npm run test:db       # Dexie schema smoke test via fake-indexeddb
npx tsc --noEmit      # type check
npm run build         # production build
npx eslint .          # currently 0 errors, 0 warnings
```

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also used for PWA testing)
npm run test:db    # schema smoke test, runs in Node via fake-indexeddb
```

## Folder structure

```
src/
  app/                        # routes — one folder per bottom-nav tab
    fitness/workout/page.tsx  # active workout logging (Phase 2)
    placement/review/page.tsx # spaced revision review session (Phase 2)
  components/ui/              # design-system primitives (Card, ProgressRing, Button…)
  components/layout/
  features/<name>/            # feature-owned hooks + components
    fitness/
      use-exercise-editor.ts  # exercise CRUD (Phase 2)
      exercise-editor-sheet.tsx
      set-logger.tsx
      use-fitness-data.ts     # + workout session lifecycle (Phase 2)
    placement/
      use-revision-engine.ts  # review logic + auto-generation (Phase 2)
      weekly-revision-sheet.tsx
  lib/db/                     # Dexie schema + shared types
  lib/date.ts                 # local-timezone-safe date helpers
public/
  manifest.json, sw.js, icons/
scripts/
  db-smoke-test.ts
```

## Next up

- **LeetCode sync** — infra decision needed (see below)
- **Analytics depth** — PR progression charts, volume-over-time using existing `ExerciseSetLog` / `WorkoutSession` data + Recharts (zero infra, pure UI)
- **Notes depth** — markdown editor, search, tag filtering
