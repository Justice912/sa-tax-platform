---
phase: 06-logbook-ui-import-wizard-performance
plan: 03
subsystem: ui
tags: [react, tanstack-react-virtual, vitest, jsdom, logbook, import-wizard]

# Dependency graph
requires:
  - phase: 06-logbook-ui-import-wizard-performance
    provides: "06-01's mockScrollElementSize jsdom virtualization test recipe (src/test/virtualization-test-utils.tsx)"
  - phase: 04-import-pipeline
    provides: "parseImportFile, detectSarsElogbookLayout, applyColumnMapping, buildImportPreview -- worker-backed, DoS-guarded, unit-tested pipeline primitives this plan wires into UI, unchanged"
provides:
  - "LogbookImportWizard component: 5-phase (select -> parse -> detect/map -> preview -> commit) client wizard over the real Phase 4 import pipeline"
  - "Contract LogbookImportWizardProps { logbook, onCommit, onClose } for the 06-06 container to supply a Server Action as onCommit"
  - "Virtualized import-preview table (data-virtual-row) proven bounded (<200 nodes) at 5,000 rows"
affects: [06-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wizard mocks only the worker-crossing function (parseImportFile) in tests; detection/mapping/preview stay real to prove genuine pipeline wiring, not a stubbed happy path"
    - "Commit is delegated entirely to a parent-supplied onCommit callback -- the wizard component never imports a Server Action or touches persistence itself"

key-files:
  created:
    - src/components/individual-tax/tax-tools/logbook-import-wizard.tsx
    - src/components/individual-tax/tax-tools/logbook-import-wizard.test.tsx
  modified: []

key-decisions:
  - "Implemented the wizard's step state as 0|1|2 (select, map, preview) rather than a literal 0..4 range -- the plan's 'Step 3 (Commit)' is the Import button's async action on the preview screen itself, not a separate rendered screen, since onClose() fires immediately on a successful commit and there is nothing else to show"
  - "Preview-table virtualization tests must call mockScrollElementSize() whenever they assert on rendered row content (not just summary counts) -- without it jsdom reports a zero-size viewport and the virtualizer renders zero [data-virtual-row] nodes, which would silently make the invalid-row-text assertion pass-by-absence rather than genuinely prove anything"
  - "The 5,000-row PERF-02 fixture leaves odometer columns blank (parseNumericCell -> null) so validateOdometerContinuity's cross-row discontinuity check has nothing to compare across thousands of identical-date rows -- keeps the test focused on virtualization rather than incidentally generating thousands of continuity warnings"
  - "getByText assertions on the Valid:/Invalid: summary counts use ^...$-anchored regexes -- an unanchored /valid:\\s*N/i also matches 'Invalid: N' because 'Invalid' contains 'valid' as a substring (In-valid), which caused a real ambiguous-match test failure caught before commit"

requirements-completed: [PERF-02]

# Metrics
duration: ~14min
completed: 2026-07-05
---

# Phase 6 Plan 03: Logbook Import Wizard Summary

**Self-contained `LogbookImportWizard` client component driving the real Phase 4 pipeline (parseImportFile -> detectSarsElogbookLayout -> applyColumnMapping -> buildImportPreview) end-to-end, with a `@tanstack/react-virtual`-backed, bounded-DOM preview table and commit delegated entirely to a parent-supplied `onCommit` Server Action.**

## Performance

- **Duration:** ~14 min
- **Started:** ~2026-07-05T11:37:00+02:00 (approx, parallel wave-2 execution alongside 06-02/06-04/06-05)
- **Completed:** 2026-07-05T11:51:40+02:00
- **Tasks:** 2 completed
- **Files modified:** 2 (both new files)

## Accomplishments
- `LogbookImportWizard` replaces the naive `FileReader` + `.split(",")` upload path with the real, tested Phase 4 pipeline for both CSV and XLSX, including the official SARS eLogbook template
- SARS eLogbook column layout is auto-detected and shown as an editable, confidence-labeled suggestion; unrecognized layouts fall back to a fully manual column-mapping step gated on the 5 mandatory fields
- The preview step lists per-row valid/invalid status and errors, surfaces cross-row continuity errors/warnings distinctly, and blocks commit when there are zero valid rows or any continuity error
- The preview table is virtualized and proven to render a bounded (<200) DOM node count at 5,000 rows via the 06-01 `mockScrollElementSize` recipe
- Only `preview.rows.filter(status === "valid").map(row => row.trip)` ever reaches `onCommit`, alongside a `source` ("CSV"/"XLSX") derived from the file extension

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the 5-step wizard wired to the Phase 4 pipeline** - `8f4f7de` (feat)
2. **Task 2: Test the wizard end-to-end (CSV + SARS auto-detect + virtualized preview)** - `ba399ef` (test)

**Plan metadata:** (this commit) `docs(06-03): complete logbook import wizard plan`

## Files Created/Modified
- `src/components/individual-tax/tax-tools/logbook-import-wizard.tsx` - `LogbookImportWizard` client component; step state `0` (select+parse), `1` (detect/map), `2` (preview+commit); imports and calls `parseImportFile`, `detectSarsElogbookLayout`, `applyColumnMapping`, `buildImportPreview` directly; renders the preview rows through a `useVirtualizer` scroll container (`data-virtual-row`, `estimateSize: 36`, `overscan: 10`, `useFlushSync: false`); reuses the `fixed inset-0 z-50 bg-black/50 backdrop-blur-sm` modal chrome and the `Field`/`selectCls` helpers from `shared.tsx`
- `src/components/individual-tax/tax-tools/logbook-import-wizard.test.tsx` - 4 tests: SARS auto-detect happy path through to `onCommit("CSV")`; manual-mapping fallback with the Next button gated on all 5 mandatory selects; an unparseable-date row surfaced as invalid and excluded from the committed trips; a 5,000-row bounded-DOM virtualization proof

## Decisions Made
- The final `LogbookImportWizardProps` contract matches the plan's interface exactly: `{ logbook: ImportPreviewLogbookInput; onCommit: (validTrips: ImportRowResult["trip"][], source: "CSV" | "XLSX") => Promise<void>; onClose: () => void }` -- this is what the 06-06 container must supply.
- Step model collapsed to 3 rendered states (`0` select, `1` map, `2` preview) rather than a literal 5-value range: "parse" is a transient `isParsing` flag within step 0, and "commit" is the async action of the Import button within step 2 (the component calls `onClose()` immediately after a successful `onCommit`, so there is no separate post-commit screen to render).
- Worker boundary in tests: only `parseImportFile` is mocked via `vi.mock` (matching the existing `import-file.test.ts` convention of `vi.mock(...) ` + `vi.mocked(fn).mockResolvedValue(...)`); `detectSarsElogbookLayout`, `applyColumnMapping`, and `buildImportPreview` are the real, unmocked Phase 4 functions, so the tests genuinely exercise the wizard's wiring rather than a stubbed pipeline.
- `mockScrollElementSize()` is required in any test that inspects preview-row content (not just the `Valid:`/`Invalid:` summary counts) -- without it, jsdom's zero-size viewport makes `@tanstack/react-virtual` render zero `[data-virtual-row]` nodes, silently emptying the preview table.

## Deviations from Plan

None - plan executed exactly as written. Two issues were caught and fixed during Task 2's own test-writing/verification cycle before any commit (in-scope, not a deviation from a committed state):
1. An ambiguous `getByText(/valid:\s*N/i)` regex also matched `"Invalid: N"` (substring "valid: N" inside "Invalid: N") -- fixed by anchoring with `^...$` before the Task 2 commit.
2. The invalid-row-surfacing test initially omitted `mockScrollElementSize()`, so the virtualized preview rendered zero rows in jsdom and the row-error-text assertion could not have meaningfully passed -- fixed by wrapping that test in the mock/restore pair, consistent with the 06-01 recipe, before the Task 2 commit.

## Issues Encountered

None beyond the two test-authoring issues above, both resolved within Task 2's normal verify-before-commit cycle.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `LogbookImportWizard` is ready for 06-06 to mount, supplying `logbook` (the target `LogbookRecord`'s odometer/existingTrips shape) and an `onCommit` that wraps `importTripsToLogbook`/`getLogbookTravelResult` via `src/modules/logbook/actions.ts` (06-01).
- The virtualized-preview recipe (`mockScrollElementSize` + `data-virtual-row` + bounded-node assertion) has now been proven against a second real component (after 06-01's smoke test and, in parallel, 06-02's trip table), reinforcing it as the standard pattern for any further Phase 6/7 virtualized list.
- Open item for 06-06: this plan's component performs zero persistence itself and assumes the parent already has a resolved `clientId`/`logbookId`/`ImportPreviewLogbookInput`; 06-06 (or a sibling plan) owns wiring that resolution point per 06-RESEARCH.md Open Q1/Q2.

---
*Phase: 06-logbook-ui-import-wizard-performance*
*Completed: 2026-07-05*

## Self-Check: PASSED

Both created files confirmed present on disk; both task commits (`8f4f7de`, `ba399ef`) confirmed present in git history.
