---
phase: 04-import-pipeline
plan: 04
subsystem: import-pipeline
tags: [sheetjs, xlsx, web-worker, next.js, turbopack, webpack, vitest]

# Dependency graph
requires:
  - phase: 04-import-pipeline
    provides: "04-01's ParsedImportData/types.ts contracts, normalizeDateCell dispatcher, and the CONFIRMED worker-bundling spike verdict this plan branches on"
provides:
  - "src/modules/logbook/import/parse-xlsx.ts: parseXlsxArrayBuffer -- pure SheetJS wrapper (ArrayBuffer -> ParsedImportData), cellDates + UTC-getter date normalization, XlsxWorkerResponse envelope type"
  - "src/modules/logbook/import/xlsx.worker.ts: thin dedicated-worker entry delegating to parseXlsxArrayBuffer, posting a typed message envelope"
  - "13 passing Vitest cases proving the real-Date round-trip, the raw-serial two-stage conversion, and empty/corrupt-buffer edge handling -- all via in-memory generated workbooks, no committed binaries"
affects: [04-05-column-detection, 04-06-import-ui-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "XLSX cell normalization funnels through the same string-shape contract as CSV (ParsedImportData) so detection/mapping/validation stay format-agnostic"
    - "Date cells normalized via UTC getters (getUTCFullYear/getUTCMonth/getUTCDate), matching SheetJS's own Date.UTC-based datenum/numdate epoch math -- timezone-independent, verified directly against the installed xlsx build rather than assumed"
    - "Header list derived positionally from sheet_to_json(sheet, {header:1}), then rows built by indexing the same array positionally -- avoids sheet_to_json's default object-keyed mode, which silently drops all-empty columns and can key-mismatch on untrimmed header whitespace"
    - "Parse failures (unreadable workbook, no sheets) return a row:-1 errors entry instead of throwing, consistent with parse-csv.ts's error-as-data convention"

key-files:
  created:
    - src/modules/logbook/import/parse-xlsx.ts
    - src/modules/logbook/import/xlsx.worker.ts
    - src/modules/logbook/import/parse-xlsx.test.ts
  modified: []

key-decisions:
  - "UTC getters confirmed correct (not local getters) for converting SheetJS Date cells to ISO strings -- traced xlsx.js's datenum/numdate source directly (dnthresh = Date.UTC(1899,11,30)), confirming the round-trip is timezone-independent; no local-getter fallback needed despite the plan flagging that as a possible outcome"
  - "Headers and rows both derived positionally from sheet_to_json(sheet, {header:1, defval:''}) rather than the default object-keyed sheet_to_json(sheet, {defval:''}) -- sidesteps a latent header-key mismatch (trimmed header list vs. sheet_to_json's untrimmed object keys) and guarantees all-empty columns are never dropped"
  - "The plan's 'empty workbook, no sheets' scenario is exercised via a corrupt/truncated ZIP buffer, not a genuinely sheetless XLSX.write() output -- confirmed empirically that XLSX.write() throws 'Workbook is empty' for a zero-sheet book_new(), so that specific construction is unreachable; the truncated-ZIP buffer exercises the same catch-and-return-error code path"

requirements-completed: [IMP-02, IMP-04]

# Metrics
duration: 15min
completed: 2026-07-04
---

# Phase 04 Plan 04: XLSX Parsing Layer + Dedicated Worker Summary

**Pure SheetJS wrapper (`parseXlsxArrayBuffer`) turning an ArrayBuffer into the same `ParsedImportData` shape the CSV parser produces, with Excel serial/real dates converted via UTC getters traced against SheetJS's own epoch math, plus a thin `xlsx.worker.ts` dedicated-worker entry confirmed to bundle cleanly under both Turbopack and webpack.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-04T07:58:00Z
- **Completed:** 2026-07-04T08:10:35Z
- **Tasks:** 2
- **Files modified:** 3 (all new)

## Accomplishments
- `parseXlsxArrayBuffer` reads the first sheet via `XLSX.read(buffer, { type: "array", cellDates: true })` and normalizes every cell to a string, matching the CSV parser's `ParsedImportData` output exactly
- Real Excel Date cells convert to correct ISO dates across two different months (March and November), proving no day/month transposition -- the core IMP-02 assertion
- Raw (unformatted) serial-number date cells are preserved as numeric strings and independently verified to convert correctly via `normalizeDateCell`'s two-stage path
- `xlsx.worker.ts` thin entry (try/catch delegate posting a typed `XlsxWorkerResponse` envelope) satisfies IMP-04's off-main-thread requirement for large XLSX files, per 04-01's CONFIRMED worker-bundling spike verdict
- 13 new Vitest cases pass, all using in-memory generated workbooks (`XLSX.utils.aoa_to_sheet` + `XLSX.write`) -- no binary fixtures committed
- Full suite (80 files / 391 tests) and `npx next build` (Turbopack) both verified green after this plan's changes

## Task Commits

Each task was committed atomically:

1. **Task 1: parse-xlsx.ts pure parser + xlsx.worker.ts thin entry** - `df77e3a` (feat)
2. **Task 2: XLSX tests with programmatically generated workbook fixtures** - `7aba7ff` (test)

**Plan metadata:** (this commit) `docs(04-04): complete xlsx-parser-worker plan`

## Files Created/Modified
- `src/modules/logbook/import/parse-xlsx.ts` - `parseXlsxArrayBuffer` pure function + `XlsxWorkerResponse` envelope type
- `src/modules/logbook/import/xlsx.worker.ts` - thin dedicated-worker entry (`self.onmessage` -> `parseXlsxArrayBuffer` -> `self.postMessage`)
- `src/modules/logbook/import/parse-xlsx.test.ts` - 13 Vitest cases: real-Date round-trip (two months), raw-serial two-stage conversion, text-date passthrough, empty cells, mixed numeric/boolean types, empty-sheet workbook, corrupt-buffer error path

## Decisions Made
- Confirmed via direct inspection of `xlsx.js`'s `datenum`/`numdate` source (both built on `Date.UTC(1899, 11, 30, ...)`) that UTC getters are the correct, timezone-independent choice for converting SheetJS `Date` cells to ISO strings -- verified empirically too (Africa/Johannesburg, UTC+2, both getter styles agreed on the test fixtures, but source inspection confirms UTC getters are correct in general, not by coincidence of a 2-hour offset)
- Headers and data rows both built via positional indexing into `sheet_to_json(sheet, { header: 1, defval: "" })`'s array-of-arrays output, rather than the plan's literally-quoted two-call approach (`header:1` for headers + default object-keyed `sheet_to_json` for rows) -- the positional approach avoids a latent bug where a header's trimmed display string could fail to key-match `sheet_to_json`'s untrimmed internal keys. This is a strict implementation-detail improvement on the plan's prose; the resulting `ParsedImportData` shape and all specified test assertions are unchanged.
- Used a truncated-ZIP corrupt buffer (not a sheetless `XLSX.write()` output, which throws at write time and is therefore unconstructable) to exercise the "surfaces the error entry rather than throwing" test case for the empty/unreadable-workbook scenario

## Deviations from Plan

None affecting behavior or scope - plan executed as written. One implementation-detail refinement (see "Decisions Made" above: positional header/row indexing instead of the plan's literal object-keyed row-building snippet) was applied proactively during Task 1 to avoid a latent header-whitespace bug before it could surface as a real defect; this falls under Rule 1 (auto-fix bugs) but was caught during implementation rather than after a failing test, so it is recorded here as a decision rather than a reactive fix.

## Issues Encountered

- A `git stash -u` / `git stash pop` performed mid-task to isolate a baseline `tsc --noEmit` comparison hit a merge conflict on `.planning/STATE.md` (concurrently being updated by the parallel 04-03/04-05 agents). Resolved safely: confirmed the stash's untracked-file portion (this plan's `parse-xlsx.ts`/`xlsx.worker.ts`) had already been restored to the working tree intact (diffed byte-identical against the stash), then dropped the now-stale stash entry rather than popping it, avoiding any risk of overwriting the other agents' STATE.md progress. No data was lost; no files from this plan were affected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04-06's import orchestrator can `new Worker(new URL("./xlsx.worker.ts", import.meta.url))` and type its `onmessage` handler against the exported `XlsxWorkerResponse` envelope.
- CSV (`parse-csv.ts`, plan 04-03) and XLSX (`parse-xlsx.ts`, this plan) both emit the identical `ParsedImportData` shape -- plans 04-05 (detection/mapping) and 04-06 (UI wiring) can consume either format-agnostically.
- No blockers for remaining Wave 2/3 plans.

---
*Phase: 04-import-pipeline*
*Completed: 2026-07-04*

## Self-Check: PASSED

All created files verified present on disk (`parse-xlsx.ts`, `xlsx.worker.ts`, `parse-xlsx.test.ts`); both task commits (`df77e3a`, `7aba7ff`) verified present in `git log`.
