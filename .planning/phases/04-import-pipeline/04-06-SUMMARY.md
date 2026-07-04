---
phase: 04-import-pipeline
plan: 06
subsystem: import-pipeline
tags: [zod, vitest, web-worker, sars-elogbook, odometer-continuity, next.js, turbopack]

# Dependency graph
requires:
  - phase: 04-import-pipeline (plans 04-01 through 04-05)
    provides: "ParsedImportData/RawTripCandidate/ImportPreviewResult contracts, parseCsvText/parseCsvFile, parseXlsxArrayBuffer/xlsx.worker.ts, detectSarsElogbookLayout/applyColumnMapping, and importTripsToLogbook (04-02)"
provides:
  - "src/modules/logbook/import/validate-import.ts: buildImportPreview -- per-row tripInputSchema validation + one shared cross-row validateOdometerContinuity pass (IMP-05)"
  - "src/modules/logbook/import/import-file.ts: parseImportFile/assertImportFileWithinLimits/resolveImportFormat -- guarded client entry with CSV/XLSX routing incl. dedicated-worker XLSX parsing (IMP-04)"
  - "src/modules/logbook/import/import-pipeline.integration.test.ts: proof of the full file-bytes-to-persisted-trips chain for CSV and XLSX, a 10,000-row throughput check, and the manual-mapping fallback seam"
  - "The complete Phase 4 import pipeline surface Phase 6's wizard will call: parseImportFile -> detectSarsElogbookLayout/manual ColumnMapping -> applyColumnMapping -> buildImportPreview -> importTripsToLogbook"
affects: [06-import-wizard-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "buildImportPreview: two ordered passes -- per-row Zod safeParse producing valid/invalid ImportRowResult entries, then ONE validateOdometerContinuity call over existingTrips + only the VALID candidate trips, so a structurally garbage row can never poison the cross-row check"
    - "Client-side file entry guards run size + extension checks BEFORE any read/parse, and a row-count guard runs AFTER parse but before the data is returned to the caller (DoS guard sandwich)"
    - "Worker construction isolated in a single small helper (parseXlsxFileInWorker) so the rest of import-file.ts stays jsdom-testable; the XLSX worker path itself is proven instead via next build's bundling check and Phase 6's browser verification"

key-files:
  created:
    - src/modules/logbook/import/validate-import.ts
    - src/modules/logbook/import/validate-import.test.ts
    - src/modules/logbook/import/__fixtures__/broken-odometer-continuity.csv
    - src/modules/logbook/import/import-file.ts
    - src/modules/logbook/import/import-file.test.ts
    - src/modules/logbook/import/import-pipeline.integration.test.ts
  modified: []

key-decisions:
  - "TRIP_ODOMETER_REVERSED cannot be produced by a candidate CSV row surviving to the continuity check: tripInputSchema's own refine (odometerEnd >= odometerStart) is IDENTICAL to validateOdometerContinuity's per-trip reversed check, so a reversed candidate row always fails per-row validation first and is excluded before continuity ever runs. The fixture's reversed row demonstrates that exclusion directly; a hand-crafted existingTrips entry (simulating already-persisted data) is used to prove the shared checker still emits the exact TRIP_ODOMETER_REVERSED code over the merged set"
  - "Integration test reloads the committed logbook via logbookRepository.getLogbookById(created.id), not getLogbookForClientYear(clientId, year) -- the demo seed already has an unrelated client_001/2026 logbook for a different vehicle, so a clientId+year lookup would be ambiguous and could silently assert against the wrong record"
  - "Per-row null-field messages ('Unparseable or invalid date', 'Missing or non-numeric business kilometres') are returned as-is per the plan's literal wording, rather than prefixed with a path segment like other flattened Zod issues -- the message text itself names the field"

patterns-established:
  - "DoS guard sandwich for client-side file intake: guard before read (size/extension), guard after parse (row count) -- never validate business data until both guards pass"

requirements-completed: [IMP-04, IMP-05]

# Metrics
duration: 18min
completed: 2026-07-04
---

# Phase 04 Plan 06: Import Pipeline Closure -- Validation, Client Entry, and End-to-End Proof Summary

**Pre-commit preview report (`buildImportPreview`) that reuses Phase 2's `tripInputSchema` and `validateOdometerContinuity` verbatim, a guarded client-side file entry point (`parseImportFile`) with dedicated-worker XLSX routing, and an end-to-end integration test proving file bytes reach persisted trips for both CSV and XLSX including a 10,000-row throughput check -- closing out the Phase 4 import pipeline.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-07-04T08:18:00Z (approx.)
- **Completed:** 2026-07-04T08:36:19Z
- **Tasks:** 3
- **Files modified:** 6 (all new)

## Accomplishments
- `buildImportPreview` never drops a row: every candidate becomes exactly one `ImportRowResult`, either `valid` (carrying a ready-to-commit `trip`) or `invalid` (carrying human-readable, field-specific `errors[]`) -- proven with 8 Vitest cases including a fixture routed through the REAL upstream chain (`parseCsvText` -> `detectSarsElogbookLayout` -> `applyColumnMapping` -> `buildImportPreview`) asserting the EXACT Phase 2 codes (`BUSINESS_KM_EXCEEDS_TOTAL`, `TRIP_ODOMETER_REVERSED`, `TRIP_ODOMETER_DISCONTINUITY`, `CLOSING_ODOMETER_MISSING`) appear in the preview's `continuityErrors`/`continuityWarnings`
- Zero continuity math lives in `validate-import.ts` (grep-verified: no `TOLERANCE`/discontinuity logic) -- `validateOdometerContinuity` is imported and called exactly once
- `import-file.ts` guards fire before any read/parse (oversized file, `.xls`-with-save-as-message, unsupported extension) and a post-parse row-count guard rejects oversized row counts before data reaches the caller; CSV routes through PapaParse's own worker, XLSX routes through a dedicated `new Worker(new URL("./xlsx.worker.ts", ...))` per 04-01's CONFIRMED spike verdict -- 12 Vitest cases plus a green `next build` (Turbopack) proving the worker reference bundles
- `import-pipeline.integration.test.ts` proves the full chain end to end for both CSV (6 rows: 4 valid incl. a quoted comma-containing reason and a decimal-comma business-km cell, 1 invalid date, 1 negative km -> exactly 4 trips committed, exactly 1 `LOGBOOK_TRIPS_IMPORTED` audit entry) and XLSX (real `Date` cells -> correct ISO dates end-to-end), a 10,000-row CSV flowing through parse+map+preview in well under the 10-second guard budget (actual: ~400-700ms), and the manual-mapping fallback (non-SARS headers -> `null` detection -> hand-built `ColumnMapping` runs through the IDENTICAL `applyColumnMapping`/`buildImportPreview`/`importTripsToLogbook` chain)
- Full repo suite green after every task: 83 files / 415 tests, no Phase 1-3 regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: validate-import.ts -- preview report reusing Phase 2 validation** - `ce5d79c` (feat)
2. **Task 2: import-file.ts -- guarded client entry with worker routing** - `bb3cc0f` (feat)
3. **Task 3: End-to-end pipeline integration test + 10k-row throughput check** - `4d373ed` (test)

**Plan metadata:** (this commit) `docs(04-06): complete import-pipeline phase`

## Files Created/Modified
- `src/modules/logbook/import/validate-import.ts` - `buildImportPreview`: per-row `tripInputSchema.safeParse` + one shared `validateOdometerContinuity` cross-row pass
- `src/modules/logbook/import/validate-import.test.ts` - 8 Vitest cases: per-row counts/errors/trip carry-through, odometer-optional validity, Zod-issue flattening, and the fixture-driven shared-checker proof (all 4 Phase 2 codes)
- `src/modules/logbook/import/__fixtures__/broken-odometer-continuity.csv` - SARS-layout fixture: 2 valid rows (discontinuity + exceeds-total when summed) + 1 reversed-odometer row (excluded from continuity)
- `src/modules/logbook/import/import-file.ts` - `parseImportFile`, `assertImportFileWithinLimits`, `resolveImportFormat`; isolates worker construction in `parseXlsxFileInWorker`
- `src/modules/logbook/import/import-file.test.ts` - 12 Vitest cases: size/extension guards, format resolution, CSV routing (mocked `parse-csv`), post-parse row-count guard, guard-before-parse ordering
- `src/modules/logbook/import/import-pipeline.integration.test.ts` - 4 Vitest cases: full CSV chain incl. commit + audit-entry proof, full XLSX chain with real Date cells, 10k-row throughput, manual-mapping fallback

## Decisions Made
- `TRIP_ODOMETER_REVERSED` is structurally unreachable via a candidate CSV row surviving to `buildImportPreview`'s continuity pass, because `tripInputSchema`'s own refine (`odometerEnd >= odometerStart`) is identical to `validateOdometerContinuity`'s per-trip reversed check -- a reversed candidate is always caught and excluded at the per-row stage first. The fixture test proves that exclusion directly (the CSV's own reversed row never leaks the code), and a separately hand-crafted `existingTrips` entry (representing already-persisted data) proves the shared checker still emits the identical Phase 2 code over the full merged set. See Deviations below.
- Integration test reloads via `logbookRepository.getLogbookById(created.id)` rather than `getLogbookForClientYear(clientId, year)`, because the demo seed already ships an unrelated `client_001`/2026 logbook (different vehicle) that a clientId+year lookup would ambiguously match instead of the logbook this test just created.
- Per-row null-date/null-businessKm messages are returned as literal strings (matching the plan's exact wording) rather than prefixed with a Zod-style `path:` segment, since the message text itself names the field; only genuine Zod issues (e.g., a reversed-odometer refine failure) are flattened to `"${path}: ${message}"`.

## Deviations from Plan

### Auto-fixed Issues

None -- no bugs, missing critical functionality, or blocking issues required fixing.

### Test-design adaptation (documented per the established 04-02 precedent, not a Rule 1-4 violation)

**1. Reworked how `TRIP_ODOMETER_REVERSED` is exercised in the continuity-fixture test**
- **Found during:** Task 1, while designing the fixture and test asserting `continuityErrors` contains all three Phase 2 error/warning codes from a single CSV fixture
- **Issue:** The plan's literal wording implies the fixture's OWN rows should produce a `TRIP_ODOMETER_REVERSED` finding inside `continuityErrors`. Tracing the actual code paths shows this is impossible by construction: `tripInputSchema`'s refine (`odometerEnd >= odometerStart`) is exactly the same condition `validateOdometerContinuity`'s per-trip reversed check tests. Any CSV row with a genuinely reversed odometer reading fails the per-row Zod pass first (per the plan's own Task 1 instruction to use `tripInputSchema.safeParse` per row) and is therefore excluded from the `trips` array passed into `validateOdometerContinuity` -- it can never reach the continuity check to produce that code.
- **Resolution:** Kept the fixture's reversed row (proving per-row exclusion, itself an explicit must-have: "Invalid rows are EXCLUDED from the continuity input"), and additionally supplied a hand-crafted `existingTrips` entry (representing already-persisted data with a reversed reading -- a realistic scenario for legacy/migrated data) in the specific test asserting all three continuity codes. This still proves the must_have truth ("the SAME codes Phase 2's validator emits") end-to-end through the one shared `validateOdometerContinuity` call, without asserting something the actual, correct system behavior cannot produce.
- **Files affected:** `src/modules/logbook/import/validate-import.test.ts`, `src/modules/logbook/import/__fixtures__/broken-odometer-continuity.csv`
- **Verification:** All 8 tests pass; a dedicated test (`excludes the invalid row from the continuity input`) explicitly asserts `TRIP_ODOMETER_REVERSED` is ABSENT when only the fixture's own rows are used, and PRESENT (exactly once) when the existing-trip is merged in -- proving both halves of the behavior precisely.
- **Committed in:** `ce5d79c` (Task 1 commit)

---

**Total deviations:** 0 auto-fixed; 1 test-design adaptation to match verified actual behavior of the reused Phase 2 validators (no code behavior changed, no scope creep).
**Impact on plan:** None on delivered functionality -- `buildImportPreview` behaves exactly as specified (reuses Phase 2 validation verbatim, never reimplements it). Only the specific fixture/test construction proving the shared-checker guarantee was adjusted to reflect how the already-shipped `tripInputSchema` and `validateOdometerContinuity` actually interact.

## Issues Encountered

None beyond the deviation documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 (Import Pipeline) is now functionally complete: `parseImportFile` -> `detectSarsElogbookLayout`/manual `ColumnMapping` -> `applyColumnMapping` -> `buildImportPreview` -> `importTripsToLogbook` is proven end-to-end for CSV and XLSX, with DoS guards, worker-backed parsing, per-row validation, and cross-row continuity reuse all in place.
- Phase 6's import wizard can build purely against this five-function surface with no further pipeline-logic decisions -- only UI/UX work (file picker, mapping-confirmation screen, preview table, commit button) remains.
- `npm run build` (Turbopack, the project's real production build) is green; the pre-existing, unrelated `next build --webpack` Estates route-export failure (logged in `deferred-items.md` since 04-01) remains untouched and out of scope.
- Full suite: 83 files / 415 tests green.

---
*Phase: 04-import-pipeline*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 6 claimed source/fixture files verified present on disk; all 3 task commits (`ce5d79c`, `bb3cc0f`, `4d373ed`) verified present in `git log`.
