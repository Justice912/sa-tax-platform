---
phase: 04-import-pipeline
plan: 01
subsystem: import-pipeline
tags: [papaparse, xlsx, sheetjs, date-fns, web-worker, next.js, turbopack, webpack]

# Dependency graph
requires:
  - phase: 02-logbook-domain-module
    provides: LogbookTripRecord/LogbookWarning contracts the new import types.ts aligns with
provides:
  - "src/modules/logbook/import/types.ts: ParsedImportData, ColumnMapping, DetectedMapping, RawTripCandidate, ImportRowResult, ImportPreviewResult, MAX_IMPORT_FILE_BYTES, MAX_IMPORT_ROWS"
  - "src/modules/logbook/import/parse-dates.ts: parseSaDateString, excelSerialDateToIso, normalizeDateCell"
  - "papaparse + xlsx (SheetJS CDN build) installed dependencies"
  - "Recorded worker-bundling verdict: CONFIRMED under both Turbopack (build) and webpack (dev bundler)"
affects: [04-02-logbook-import-service, 04-03-csv-parser, 04-04-xlsx-parser-worker, 04-05-column-detection, 04-06-import-ui-wiring]

# Tech tracking
tech-stack:
  added: ["papaparse ^5.5.4", "@types/papaparse ^5.5.2", "xlsx 0.20.3 (cdn.sheetjs.com, not npm registry)"]
  patterns:
    - "Import pipeline contracts (types.ts) precede all parser/detection implementation -- interface-first ordering for Wave 2"
    - "Date normalization funnels through a single dispatcher (normalizeDateCell) so CSV string cells, XLSX serial numbers, and native Date objects all resolve to the same ISO YYYY-MM-DD shape"
    - "date-fns parse() results are formatted with format() (local-time-safe), never .toISOString() (UTC-shifting) -- see Deviations"

key-files:
  created:
    - src/modules/logbook/import/types.ts
    - src/modules/logbook/import/parse-dates.ts
    - src/modules/logbook/import/parse-dates.test.ts
    - .planning/phases/04-import-pipeline/deferred-items.md
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "xlsx installed from https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz, not the npm registry (0.18.5 has unpatched high-severity CVEs) -- package-lock.json confirmed resolving to the CDN URL with integrity hash"
  - "parseSaDateString/normalizeDateCell use date-fns format() rather than .toISOString() to avoid a UTC-shift timezone bug when converting locally-parsed dates to ISO strings"
  - "Worker bundling spike verdict: CONFIRMED for both bundlers -- Wave 2/3 plans (04-04, 04-06) proceed with a dedicated xlsx.worker.ts and new Worker(new URL(...)) instantiation, no fallback needed"
  - "A pre-existing, unrelated next build --webpack failure (Estates filing-pack route's non-standard export) was isolated as NOT caused by worker code and logged to deferred-items.md rather than fixed (out of scope for this phase)"

patterns-established:
  - "Excel serial-date plausible-range guard (20000-80000) rejects arbitrary numbers being silently treated as dates"
  - "ISO date strings passed through normalizeDateCell/parseSaDateString are round-trip validated (calendar-impossible dates like 2026-02-30 rejected), not just regex-matched"

requirements-completed: [IMP-01, IMP-02, IMP-04]

# Metrics
duration: 25min
completed: 2026-07-04
---

# Phase 04 Plan 01: Import Pipeline Foundation Summary

**Installed PapaParse + SheetJS xlsx (CDN build), shipped the shared import type contracts and SA/Excel date-parsing utilities, and confirmed via a live spike that `new Worker(new URL(...))` bundles cleanly under both Turbopack (`next build`) and webpack (`next build --webpack`) on this repo's exact Next.js 16.1.6 setup.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-04T07:25:20Z
- **Completed:** 2026-07-04T07:50:37Z
- **Tasks:** 3
- **Files modified:** 6 (2 dependency files, 3 new import/ module files, 1 new deferred-items log)

## Accomplishments
- PapaParse and SheetJS `xlsx` (correctly sourced from `cdn.sheetjs.com`, avoiding the CVE-laden npm registry version) installed and verified importable
- `src/modules/logbook/import/types.ts` ships every contract Wave 2/3 plans build against (`ParsedImportData`, `ColumnMapping`, `DetectedMapping`, `RawTripCandidate`, `ImportRowResult`, `ImportPreviewResult`, `MAX_IMPORT_FILE_BYTES`, `MAX_IMPORT_ROWS`)
- `parse-dates.ts` correctly parses DD/MM/YYYY-first SA-format dates and Excel serial dates, with 17 passing Vitest cases including the ambiguous-date regression case (`05/06/2026` → 5 June, never June 5th)
- **Worker-bundling spike verdict (blocks Wave 2/3 worker work): CONFIRMED under both bundlers.** See "Worker Bundling Spike Verdict" below — this is the load-bearing finding for 04-04 and 04-06.

## Worker Bundling Spike Verdict (read this before starting 04-04 / 04-06)

**CONFIRMED: `new Worker(new URL("./xlsx.worker.ts", import.meta.url))` bundles and runs correctly under both bundlers this repo uses (`next dev --webpack` and `next build`/Turbopack). Proceed with the dedicated `xlsx.worker.ts` (plan 04-04) and worker instantiation in `import-file.ts` (plan 04-06) as originally planned — no fallback required.**

Evidence:
1. Created transient `src/modules/logbook/import/echo.worker.ts` (`onmessage` → `postMessage(echo:...)`) and a transient client page `src/app/dev/worker-spike/page.tsx` instantiating it via `new Worker(new URL("../../../modules/logbook/import/echo.worker.ts", import.meta.url))`.
2. `npx next build` (Turbopack, the project's actual `npm run build` command): **exit 0**, zero "Failed to compile" occurrences, `/dev/worker-spike` emitted as a static route (`○ /dev/worker-spike` in the build's route table).
3. `npx next build --webpack` (matches `npm run dev`'s bundler): the core "Creating an optimized production build ... ✓ Compiled successfully" phase — which is where a genuine worker-bundling failure would surface — passed cleanly with the spike present, and `/dev/worker-spike` again appeared as a compiled static route.
4. The overall `--webpack` run's exit code was 1, due to a **separate, unrelated, pre-existing** failure at Next.js's post-compile TypeScript route-export check (see "Deviations" below) — not a worker-bundling problem. This was rigorously isolated (not assumed):
   - Reproduced identically with the spike files entirely removed (baseline run) — proves the failure predates and is unrelated to this task's work.
   - A diagnostic-only, immediately-reverted patch to the unrelated file made the identical `--webpack` build pass with exit 0 and zero "Failed to compile" — conclusively isolating the worker code as not implicated.
5. Spike files (`echo.worker.ts`, `src/app/dev/worker-spike/page.tsx`) deleted after the verdict was recorded; `git status` confirmed clean before each task commit.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install PapaParse and SheetJS xlsx (CDN tarball)** - `f2b5780` (chore)
2. **Task 2: Import pipeline type contracts + SA/Excel date parsing utilities** - `69236c1` (feat)
3. **Task 3: Worker bundling spike** - `e76cb0c` (chore — deferred-items.md log; spike files themselves were deleted per the task's own instruction, so no persistent worker-file diff)

**Plan metadata:** (this commit) `docs(04-01): complete import-pipeline foundation plan`

## Files Created/Modified
- `src/modules/logbook/import/types.ts` - All Phase 4 import pipeline type contracts and DoS-guard constants
- `src/modules/logbook/import/parse-dates.ts` - `parseSaDateString`, `excelSerialDateToIso`, `normalizeDateCell`
- `src/modules/logbook/import/parse-dates.test.ts` - 17 Vitest cases covering DD/MM ambiguity, calendar-impossible dates, Excel serial reference values, and dispatcher behavior
- `.planning/phases/04-import-pipeline/deferred-items.md` - Logged the pre-existing, unrelated `next build --webpack` failure discovered during the Task 3 spike
- `package.json` / `package-lock.json` - `papaparse`, `@types/papaparse`, `xlsx` (from `cdn.sheetjs.com`)

## Decisions Made
- xlsx sourced strictly from the SheetJS CDN tarball, never `npm install xlsx` (registry version has unpatched CVEs) — confirmed via lockfile inspection
- Date-fns `format()` used instead of `.toISOString()` for locally-parsed dates to avoid a UTC-shift bug (see Deviations)
- Worker bundling confirmed safe under both bundlers — no fallback to PapaParse-worker-only/chunked-main-thread XLSX parsing needed for 04-04/04-06

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Timezone bug in SA-format date parsing**
- **Found during:** Task 2 (parse-dates.ts implementation, running the co-located test suite)
- **Issue:** The initial implementation used `date-fns`'s `parse(str, "dd/MM/yyyy", new Date())` (which returns a Date at local-time midnight) and then formatted it via `.toISOString().slice(0, 10)` (which converts to UTC first). On any UTC+ timezone (matching this environment), this silently shifted the resulting date back by one day — e.g. `05/06/2026` initially produced `2026-06-04` instead of `2026-06-05`, caught immediately by the plan's own required test case.
- **Fix:** Switched to `date-fns`'s `format(parsedDate, "yyyy-MM-dd")`, which formats in local time consistently with how `parse()` constructed the Date, eliminating the UTC conversion shift. The Excel-serial and ISO-passthrough paths were unaffected (they already compute/validate in UTC explicitly).
- **Files modified:** `src/modules/logbook/import/parse-dates.ts`
- **Verification:** All 17 tests in `parse-dates.test.ts` pass, including the DD/MM-ambiguity case and single-digit-day/month case that initially failed
- **Committed in:** `69236c1` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary correctness fix caught by the plan's own required test cases; no scope creep. The underlying contract (DD/MM/YYYY-first parsing, ISO output) is unchanged from the plan.

## Issues Encountered

- **Pre-existing, unrelated `next build --webpack` failure discovered during Task 3's spike:** `src/app/api/reports/estates/[estateId]/filing-pack/route.ts` exports a plain helper function (`sanitizeSegment`) alongside its route handlers, which Next.js's generated route-export type validation rejects — but only when running `next build --webpack`, not the project's actual `next build` (Turbopack) command. This is unrelated to Phase 4 and was out of scope to fix (SCOPE BOUNDARY). Rigorously isolated as pre-existing (reproduces with zero Phase 4 files present) and as not implicating worker bundling (a diagnostic-only, reverted patch of the unrelated export made the same build pass cleanly). Logged to `.planning/phases/04-import-pipeline/deferred-items.md` for whichever future phase owns that route file.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All Wave 2 plans (CSV parser, XLSX parser, detection/mapping) can now `import type { ... } from "@/modules/logbook/import/types"` and `import { normalizeDateCell } from "@/modules/logbook/import/parse-dates"` without further contract decisions.
- The worker-bundling question is resolved with a recorded, evidence-based CONFIRMED verdict — 04-04 (xlsx.worker.ts) and 04-06 (worker instantiation in import-file.ts) can proceed directly with the dedicated-worker approach, no fallback path needed.
- Full test suite (76 files / 342 tests) passes; `npx next build` (Turbopack, the project's actual build command) exits 0 with the repo left buildable after spike cleanup.
- One pre-existing, unrelated build issue (Estates filing-pack route under `--webpack` specifically) is flagged in `deferred-items.md` for a future phase to address — does not block Phase 4 work.

---
*Phase: 04-import-pipeline*
*Completed: 2026-07-04*

## Self-Check: PASSED

All created files verified present on disk; all 3 task commits (`f2b5780`, `69236c1`, `e76cb0c`) verified present in `git log`.
