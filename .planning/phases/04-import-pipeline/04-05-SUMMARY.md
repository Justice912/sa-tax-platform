---
phase: 04-import-pipeline
plan: 05
subsystem: import-pipeline
tags: [tdd, vitest, sars-elogbook, column-mapping, date-fns]

# Dependency graph
requires:
  - phase: 04-import-pipeline (plan 04-01)
    provides: "ColumnMapping/DetectedMapping/RawTripCandidate contracts in types.ts and normalizeDateCell in parse-dates.ts"
provides:
  - "src/modules/logbook/import/detect-elogbook.ts: detectSarsElogbookLayout, SARS_ELOGBOOK_SIGNATURE -- fuzzy header-name detection of the official SARS eLogbook layout"
  - "src/modules/logbook/import/column-mapping.ts: applyColumnMapping, parseNumericCell -- single shared row-conversion path for both auto-detected and manual mappings"
affects: [04-06-import-ui-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Header matching always by normalized NAME (lowercase, trim, collapse whitespace, strip leading *), never by column position -- survives SARS template revisions and user column reordering"
    - "Ambiguity-as-null: two headers normalizing to the same field aborts detection rather than guessing which one to use"
    - "applyColumnMapping is the single conversion path for both DetectedMapping and manually-supplied ColumnMapping -- no separate code path for user-confirmed mappings"

key-files:
  created:
    - src/modules/logbook/import/detect-elogbook.ts
    - src/modules/logbook/import/detect-elogbook.test.ts
    - src/modules/logbook/import/column-mapping.ts
    - src/modules/logbook/import/column-mapping.test.ts
  modified: []

key-decisions:
  - "Ambiguity check (>1 header matching one field) applies to all seven mapped fields including optional odometer columns, not just the five mandatory ones -- consistent with 'never guess' intent even though the plan's explicit test case only covers 'from'"
  - "parseNumericCell strips whitespace first, then disambiguates comma meaning by dot presence (comma+dot -> comma is thousands separator; comma-only -> SA decimal comma) before final regex validation"

patterns-established:
  - "MappedField/MandatoryField type split in detect-elogbook.ts (5 mandatory + 2 optional fields) documents at the type level which fields gate detection and which are additive"

requirements-completed: [IMP-03]

# Metrics
duration: 8min
completed: 2026-07-04
---

# Phase 04 Plan 05: SARS eLogbook Detection + Column Mapping Summary

**Fuzzy header-name detection of the official SARS eLogbook column layout (any casing/order/leading-asterisk) that safely falls back to null on any ambiguity or missing mandatory column, plus a single shared row-conversion function used by both auto-detected and manually-supplied mappings.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-04T07:56:20Z
- **Completed:** 2026-07-04T08:00:04Z
- **Tasks:** 2 (of 3 planned -- Task 3/REFACTOR required no code changes, see Deviations)
- **Files modified:** 4 (2 new source files, 2 new test files)

## Accomplishments
- `detectSarsElogbookLayout` correctly identifies the canonical official SARS eLogbook headers (including `*Opening Km`/`*Closing Km` and the two Actual-cost columns, which are correctly ignored as non-trip fields) with "high" confidence
- Detection survives reordering, mixed casing, and padding whitespace on the exact same header set
- Secondary-alias matches (e.g. "Business Km" instead of "Total Business Km") still detect but downgrade confidence to "medium"
- Missing any mandatory field (date, business km, from, to, reason) or any duplicate/ambiguous header match returns `null` rather than a guessed mapping -- the corrupting failure mode is designed out
- `applyColumnMapping` converts raw string rows to typed `RawTripCandidate[]` via `normalizeDateCell` (SA dates, ISO dates, Excel-serial strings) and a new `parseNumericCell` helper (plain decimals, thousands-space, SA decimal-comma, comma-thousands+dot-decimal) -- never drops a row, nulls unconvertible cells instead
- 22 new Vitest cases covering every case in the plan's behavior table; full repo suite (78 files / 364 tests) green

## Task Commits

Each task was committed atomically:

1. **Task 1: RED -- failing detection + mapping test suites** - `3cadc5a` (test)
2. **Task 2: GREEN -- implement detect-elogbook.ts and column-mapping.ts** - `36feac7` (feat)
3. **Task 3: REFACTOR** - no commit (no code changes needed; see Deviations)

**Plan metadata:** (this commit) `docs(04-05): complete SARS eLogbook detection and column-mapping plan`

_TDD cycle: RED -> GREEN, REFACTOR was a no-op review (nothing to extract, see below)._

## Files Created/Modified
- `src/modules/logbook/import/detect-elogbook.ts` - `SARS_ELOGBOOK_SIGNATURE` alias table (primary alias first per field) and `detectSarsElogbookLayout`, matching by normalized header name with per-field ambiguity detection
- `src/modules/logbook/import/detect-elogbook.test.ts` - 9 tests covering canonical/reordered/recased headers, secondary-alias medium confidence, missing-mandatory-field null, missing-odometer detection, duplicate-header ambiguity null, unrelated headers null, empty list null
- `src/modules/logbook/import/column-mapping.ts` - `parseNumericCell` (decimal-comma/thousands-space/thousands-comma parsing) and `applyColumnMapping` (the single row-conversion path for both auto-detected and manual mappings)
- `src/modules/logbook/import/column-mapping.test.ts` - 13 tests covering SA date + decimal-comma + thousands-space conversion, unparseable-date row retention, empty-cell nulls, unmapped-odometer nulls, Excel-serial string dates, and N-in/N-out row preservation including a fully-garbage row

## Decisions Made
- Ambiguity detection (>1 matching header per field) is applied uniformly across all seven mapped fields (five mandatory + two optional odometer fields), not narrowly scoped to only the mandatory ones -- this is a stricter, safer reading of "ambiguity is never guessed away" than the plan's single explicit "from" duplicate test case required, and costs nothing since a duplicate odometer header is exactly as unsafe to guess as a duplicate mandatory-field header
- `parseNumericCell` resolves comma ambiguity by checking for a co-occurring dot: comma+dot means the comma is a thousands separator (international format); comma with no dot means it's the SA decimal separator -- matches the plan's explicit case table exactly

## Deviations from Plan

### Task 3 (REFACTOR) required no code changes

- **Found during:** Task 3
- **Reasoning:** The plan's refactor instruction was to "extract/share the header-normalization helper if duplicated between the two files." Only `detect-elogbook.ts` performs header normalization (lowercase/trim/strip-leading-asterisk/collapse-whitespace) via its internal `normalizeHeader` function; `column-mapping.ts` never normalizes header text -- it looks up cells directly by the original header strings stored in the `ColumnMapping` (by design, since mapping values must be the exact original headers for row-key lookup to work). There was no duplication to extract.
- Verified exported names match the must-haves exactly (`detectSarsElogbookLayout`, `SARS_ELOGBOOK_SIGNATURE`, `applyColumnMapping`, `parseNumericCell`) and both files import nothing beyond `./types` and `./parse-dates` (confirmed pure, no React/DOM imports).
- Ran `npm run test` (full suite): 78 files / 364 tests, all green -- nothing outside the module broke.
- No commit was made for Task 3 since no code changed, consistent with the plan's own instruction: "Commit only if refactoring changed code."

**Total deviations:** 0 auto-fixed (Rules 1-4 did not apply -- Task 3 was a verification-only no-op, not a deviation from correctness/scope)
**Impact on plan:** None. Plan executed exactly as specified; the only departure from the literal 3-commit structure is that the planned refactor step found nothing to do, which the plan itself anticipated ("2-3 atomic commits").

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04-06 can call `detectSarsElogbookLayout(headers)` to get a `DetectedMapping | null` suggestion (UI must still let the user confirm/edit), and `applyColumnMapping(rows, mapping)` to get `RawTripCandidate[]` regardless of whether `mapping` came from detection or manual user entry -- one code path, no further conversion logic needed downstream.
- Two parallel Wave 2 plans (04-03 parse-csv.ts, 04-04 parse-xlsx.ts/xlsx.worker.ts) were executing concurrently in the same repo during this plan's execution; no file overlap occurred (confirmed via `git status` before each commit -- only this plan's own four files were staged in any commit).
- Full test suite (78 files / 364 tests) passes; no build was run as part of this plan (pure-function TDD plan, no UI/route changes).

---
*Phase: 04-import-pipeline*
*Completed: 2026-07-04*

## Self-Check: PASSED

All created files verified present on disk (`detect-elogbook.ts`, `detect-elogbook.test.ts`, `column-mapping.ts`, `column-mapping.test.ts`, `04-05-SUMMARY.md`); both task commits (`3cadc5a`, `36feac7`) verified present in `git log`.
