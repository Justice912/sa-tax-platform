---
phase: 04-import-pipeline
plan: 03
subsystem: import-pipeline
tags: [papaparse, csv, web-worker, gitattributes]

# Dependency graph
requires:
  - phase: 04-import-pipeline (plan 01)
    provides: ParsedImportData contract (types.ts) this parser returns
provides:
  - "src/modules/logbook/import/parse-csv.ts: parseCsvText (sync) and parseCsvFile (PapaParse worker:true) both returning ParsedImportData"
  - "Committed CSV fixtures (quoted-fields.csv, semicolon-delimited.csv) covering IMP-01's named edge cases"
  - ".gitattributes pattern for pinning byte-exact text fixtures against core.autocrlf corruption"
affects: [04-06-import-ui-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSV_PARSE_CONFIG is a single shared base object consumed by both parseCsvText and parseCsvFile, so sync/worker behavior cannot drift apart"
    - "One shared mapParseResult helper converts PapaParse's ParseResult<T> to the pipeline's ParsedImportData shape for both entry points"
    - "Text fixtures whose exact byte content (specific line-ending characters) is part of the test contract are pinned via .gitattributes '-text' rather than relying on the platform's core.autocrlf setting"

key-files:
  created:
    - src/modules/logbook/import/parse-csv.ts
    - src/modules/logbook/import/parse-csv.test.ts
    - src/modules/logbook/import/__fixtures__/quoted-fields.csv
    - src/modules/logbook/import/__fixtures__/semicolon-delimited.csv
    - .gitattributes
  modified: []

key-decisions:
  - "CSV fixtures pinned as -text (binary) in .gitattributes because this environment's global core.autocrlf=true both stripped the fixtures' required CRLF record separators to LF at commit time, and re-expanded every LF (including the one deliberately embedded inside a quoted field) back to CRLF on checkout -- silently defeating the embedded-newline-inside-quotes test case"
  - "Fixtures loaded via fs.readFileSync(path.join(__dirname, ...)) rather than a Vite '?raw' import -- avoids an ambient .d.ts type-shim dependency and is unaffected by bundler/test-runner config drift"

requirements-completed: [IMP-01, IMP-04]

# Metrics
duration: 22min
completed: 2026-07-04
---

# Phase 04 Plan 03: CSV Parser Summary

**PapaParse-backed CSV parsing layer with a shared config powering both a synchronous text parser and a worker-backed file parser, proven against quoted-comma, escaped-quote, embedded-newline, CRLF, and semicolon-auto-detection fixtures -- with the fixtures pinned against Windows autocrlf corruption via `.gitattributes`.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-04T07:59:00Z (approx.)
- **Completed:** 2026-07-04T08:09:04Z
- **Tasks:** 2
- **Files modified:** 5 (4 new import-module files, 1 new repo-root `.gitattributes`)

## Accomplishments
- `parse-csv.ts` ships `parseCsvText` (sync, for tests/small strings) and `parseCsvFile` (PapaParse `worker: true`, for real user files up to 10,000+ rows -- IMP-04 CSV path), both funneled through one shared `CSV_PARSE_CONFIG` and one shared `mapParseResult` helper so the two paths cannot drift apart
- Delimiter auto-detection proven end-to-end: a semicolon-delimited fixture (SA/EU-locale Excel export style) parses with the correct header set and no caller hint, and a decimal-comma number cell (`123,5`) survives as the literal string
- Quoted-field edge cases proven against a CRLF fixture: a comma inside quotes stays one field, an escaped `""` becomes a literal `"`, and a newline embedded inside a quoted field does not split the row -- all while DD/MM/YYYY date strings pass through untouched (conversion is 04-05/04-06's job)
- Ragged rows (field-count mismatches) still return all rows plus a row-indexed entry in `errors`, per IMP-01's "no silent drops" requirement
- 14 new Vitest cases, full suite green (79 files / 378 tests) after this plan's commits

## Task Commits

Each task was committed atomically:

1. **Task 1: parse-csv.ts -- sync text parse + worker-backed File parse** - `13f7408` (feat)
2. **Task 2: CSV fixtures + edge-case tests** - `a4fecf2` (test)
3. **Deviation fix: pin CSV fixtures as binary to stop autocrlf corruption** - `135a359` (fix)

**Plan metadata:** (this commit) `docs(04-03): complete csv-parser plan`

## Files Created/Modified
- `src/modules/logbook/import/parse-csv.ts` - `parseCsvText`/`parseCsvFile`, shared `CSV_PARSE_CONFIG` and `mapParseResult`
- `src/modules/logbook/import/parse-csv.test.ts` - 14 Vitest cases: quoted fixture (row count, header trim, quoted comma, escaped quote, embedded newline, date strings, no errors), semicolon fixture (auto-detect, decimal-comma), ragged rows, header-only input, empty-string input
- `src/modules/logbook/import/__fixtures__/quoted-fields.csv` - CRLF-delimited, SARS-like headers, quoted comma / escaped quote / embedded-newline rows, DD/MM/YYYY dates
- `src/modules/logbook/import/__fixtures__/semicolon-delimited.csv` - semicolon-delimited, decimal-comma number cell
- `.gitattributes` - `-text` rule scoped to these two fixture paths only

## Decisions Made
- Fixtures pinned as binary via `.gitattributes` rather than adjusting `core.autocrlf` (a user/global git setting that must not be touched) -- see Deviations
- `fs.readFileSync` fixture loading over Vite `?raw` imports, per the plan's own documented fallback, to avoid an ambient-type-shim dependency
- No new dependencies added; `papaparse`/`@types/papaparse` already installed by plan 04-01

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] core.autocrlf silently corrupted the CSV fixtures' required byte-exact content**
- **Found during:** Task 2, first `npx vitest run` pass after committing the fixtures -- the "embedded newline inside quotes" assertion failed
- **Issue:** This environment's global `core.autocrlf=true` normalized the fixtures on `git add`/commit (CRLF record separators collapsed to LF in the stored blob -- verified via `git show HEAD:...`, directly violating the plan's own CRLF must-have), and then re-expanded *every* LF back to CRLF on working-tree checkout, including the one bare `\n` deliberately embedded inside a quoted field to test that PapaParse doesn't split on it. This made the embedded-newline case indistinguishable from a CRLF record separator, defeating the test's purpose.
- **Fix:** Added `.gitattributes` scoping `src/modules/logbook/import/__fixtures__/*.csv` as `-text` (binary), so these two files are never subject to line-ending conversion regardless of platform or `core.autocrlf`. Regenerated both fixtures and ran `git add --renormalize` to force git to re-derive their blobs from the corrected working-tree bytes. Did not touch `core.autocrlf` itself (a global git config setting, out of scope to change).
- **Files modified:** `.gitattributes` (new), `src/modules/logbook/import/__fixtures__/quoted-fields.csv`, `src/modules/logbook/import/__fixtures__/semicolon-delimited.csv`
- **Verification:** `git show HEAD:.../quoted-fields.csv` confirmed the committed blob now contains the exact intended bytes (CRLF separators, bare LF inside the quoted field); `npx vitest run src/modules/logbook/import/parse-csv.test.ts` went from 13/14 to 14/14 passing; full suite re-run green afterward
- **Committed in:** `135a359`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix to make the plan's own required CRLF/embedded-newline test case verifiable at all in this environment. No scope creep -- change is scoped to exactly the two fixture files this plan introduces.

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `parseCsvText`/`parseCsvFile` are ready for plan 04-06's import orchestrator to call directly; `parseCsvFile`'s worker path needs no further wiring since PapaParse manages its own worker internally (unlike the XLSX path, which depends on 04-01's confirmed dedicated-worker bundling verdict)
- The `.gitattributes` `-text` pattern established here is reusable for any future byte-exact fixture (e.g., if 04-04's XLSX plan needs binary `.xlsx` fixtures, though those are inherently binary and likely already safe from text-mode conversion)
- No blockers for 04-05 (column-mapping/detection, run in parallel) or 04-06 (orchestrator wiring)

---
*Phase: 04-import-pipeline*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 6 claimed files verified present on disk; all 3 commit hashes (`13f7408`, `a4fecf2`, `135a359`) verified present in `git log`.
