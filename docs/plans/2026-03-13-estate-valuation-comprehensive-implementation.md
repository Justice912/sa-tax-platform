# Estate Valuation Authoritative DOCX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the live valuation-page crash, replace the old valuation output with an authoritative `.docx` report matching the approved sample, and keep the in-app report as a close preview of the same canonical payload.

**Architecture:** The valuation engine will emit a canonical report payload with full section coverage for valuation logic, tax commentary, appendices, and sign-off data. The valuation page will stop crashing on query-string error handling, the in-app preview will render from the canonical payload, and the filing-pack layer will generate a real `.docx` artifact for business valuation reports while preserving downstream estate-engine compatibility.

**Tech Stack:** Next.js server actions and routes, React server components, Vitest, Playwright PDF dependency already present, new `.docx` generation dependency if required, desktop standalone packaging, JSON-backed demo storage.

---

### Task 1: Lock the valuation-page crash regression

**Files:**
- Modify: `src/app/(protected)/estates/[estateId]/valuation/page.tsx`
- Test: `src/app/(protected)/estates/[estateId]/valuation/page.test.tsx`

**Step 1: Write the failing test**

- Add a test proving the page does not throw when `searchParams.error` contains `%` or already-decoded text.
- Add a test proving the workspace receives the error message as inline state.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/app/(protected)/estates/[estateId]/valuation/page.test.tsx`

Expected: FAIL because the current page still calls `decodeURIComponent`.

**Step 3: Write minimal implementation**

- Remove the unsafe double-decode behavior.
- Keep redirect-based error handling intact.

**Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- src/app/(protected)/estates/[estateId]/valuation/page.test.tsx`

Expected: PASS

### Task 2: Lock the authoritative valuation report contract

**Files:**
- Modify: `src/modules/estates/engines/valuation/types.ts`
- Test: `src/modules/estates/engines/valuation/service.test.ts`
- Test: `src/components/reports/estates/valuation-report.test.tsx`

**Step 1: Write the failing tests**

- Add service tests that expect the valuation output to include:
  - executive summary
  - company overview
  - economic context
  - historical financial analysis
  - DCF, earnings, and NAV sections
  - reconciliation and sensitivity
  - CGT, estate duty, and section 9HA commentary
  - disclaimer, appendices, glossary, and signature sections
- Add renderer tests that expect the in-app report preview to show those sections.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/modules/estates/engines/valuation/service.test.ts src/components/reports/estates/valuation-report.test.tsx`

Expected: FAIL because the current canonical payload is incomplete.

**Step 3: Write minimal implementation**

- Expand types to define the canonical report payload and preserve legacy compatibility.

**Step 4: Run test to verify partial progress**

Run the same command and confirm failures move from missing types to missing behavior.

### Task 3: Lock the `.docx` generation contract

**Files:**
- Modify: `src/app/api/reports/estates/[estateId]/filing-pack/route.ts`
- Modify: `src/modules/estates/forms/service.ts`
- Test: `src/modules/estates/forms/service.test.ts`
- Test: `src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts`

**Step 1: Write the failing tests**

- Add a forms/filing-pack test that expects `BUSINESS_VALUATION_REPORT` to produce a `.docx` artifact definition with the correct content type.
- Add a route test that expects the artifact save path and MIME type to be Word, not PDF/JSON.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/modules/estates/forms/service.test.ts src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts`

Expected: FAIL because the current implementation has no `.docx` path.

**Step 3: Write minimal implementation**

- Add the artifact/output-format seam required for Word generation.

**Step 4: Run test to verify partial progress**

Run the same command and confirm failures move to missing report-generation details.

### Task 4: Expand valuation input and validation for the sample report

**Files:**
- Modify: `src/modules/estates/engines/valuation/validation.ts`
- Modify: `src/components/estates/phase2/estate-valuation-workspace.tsx`
- Test: `src/components/estates/phase2/estate-valuation-workspace.test.tsx`

**Step 1: Write the failing tests**

- Add workspace tests for the new input groups needed by the sample document:
  - mandate details
  - company particulars
  - economic context
  - ratio and balance-sheet tables
  - method-specific narrative/notes
  - sensitivity rows
  - tax and disclaimer sections
- Add a regression test that unused methods do not trigger validation failures.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/components/estates/phase2/estate-valuation-workspace.test.tsx src/modules/estates/engines/valuation/service.test.ts`

Expected: FAIL because current inputs are incomplete.

**Step 3: Write minimal implementation**

- Extend the form and schema for the approved document inputs.
- Keep validation conditional on enabled methods only.

**Step 4: Run test to verify it passes**

Run the same command and confirm the new tests pass.

### Task 5: Build the canonical calculation payload

**Files:**
- Modify: `src/modules/estates/engines/valuation/calculation.ts`
- Modify: `src/modules/estates/engines/valuation/service.ts`
- Modify: `src/modules/estates/engines/valuation/report-transformer.ts`
- Test: `src/modules/estates/engines/valuation/service.test.ts`

**Step 1: Write or refine failing tests**

- Add assertions for:
  - methodology weighting
  - sensitivity scenarios
  - ratio and balance-sheet carry-through
  - CGT and estate duty commentary inputs
  - signature/disclaimer/appendix content

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/modules/estates/engines/valuation/service.test.ts`

Expected: FAIL with missing calculation or report fields.

**Step 3: Write minimal implementation**

- Extend calculation helpers for DCF, earnings, NAV, reconciliation, and sensitivity.
- Transform the results plus narrative inputs into the canonical report payload.
- Continue writing concluded value back to the linked estate asset.

**Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- src/modules/estates/engines/valuation/service.test.ts`

Expected: PASS

### Task 6: Rebuild the in-app preview from the canonical report

**Files:**
- Modify: `src/components/reports/estates/valuation-report.tsx`
- Test: `src/components/reports/estates/valuation-report.test.tsx`

**Step 1: Write the failing preview tests**

- Assert the preview renders section headings and key tables aligned with the authoritative report structure.
- Preserve one legacy rendering test for old stored reports.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/components/reports/estates/valuation-report.test.tsx`

Expected: FAIL because the preview still reflects the older structure.

**Step 3: Write minimal implementation**

- Rebuild the preview component against the canonical payload.
- Keep legacy fallback behavior for older stored runs.

**Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- src/components/reports/estates/valuation-report.test.tsx`

Expected: PASS

### Task 7: Implement authoritative `.docx` generation

**Files:**
- Create: `src/modules/estates/forms/valuation-docx.ts`
- Create or add asset: `src/modules/estates/forms/templates/*`
- Modify: `src/app/api/reports/estates/[estateId]/filing-pack/route.ts`
- Test: `src/modules/estates/forms/valuation-docx.test.ts`
- Test: `src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts`

**Step 1: Write the failing tests**

- Add tests for:
  - `.docx` buffer generation from canonical valuation payload
  - proper file extension and MIME type
  - expected key text/section titles being present in the generated document XML

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/modules/estates/forms/valuation-docx.test.ts src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts`

Expected: FAIL because no Word generator exists.

**Step 3: Write minimal implementation**

- Implement the `.docx` generator using the approved sample structure.
- Wire the filing-pack route so `BUSINESS_VALUATION_REPORT` saves Word output instead of PDF.

**Step 4: Run test to verify it passes**

Run the same command and confirm PASS.

### Task 8: Upgrade field mapping and filing-pack integration

**Files:**
- Modify: `src/modules/estates/forms/field-mapper.ts`
- Modify: `src/modules/estates/forms/service.ts`
- Test: `src/components/reports/estates/field-mapping.test.tsx`
- Test: `src/modules/estates/forms/service.test.ts`

**Step 1: Write the failing tests**

- Add tests that expect the forms layer to preserve the canonical valuation payload without collapsing it back to the old summary report.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/components/reports/estates/field-mapping.test.tsx src/modules/estates/forms/service.test.ts`

Expected: FAIL if the old mapping assumptions remain.

**Step 3: Write minimal implementation**

- Update field mapping and filing-pack artifact assembly to use the new canonical payload cleanly.

**Step 4: Run test to verify it passes**

Run the same command and confirm PASS.

### Task 9: Upgrade the golden demo valuation baseline

**Files:**
- Modify: `desktop/golden-demo-bundle.json`
- Test: `src/desktop/golden-demo-restore.test.ts`
- Test: `src/modules/estates/engines/repository.test.ts`

**Step 1: Write the failing tests**

- Add a test proving the restored golden business valuation run contains the canonical report structure instead of the legacy snapshot.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/desktop/golden-demo-restore.test.ts src/modules/estates/engines/repository.test.ts`

Expected: FAIL because the current golden bundle still contains legacy valuation output.

**Step 3: Write minimal implementation**

- Replace the golden valuation run snapshot with the canonical one.
- Keep additive restore behavior unchanged.

**Step 4: Run test to verify it passes**

Run the same command and confirm PASS.

### Task 10: Full targeted verification

**Files:**
- No code changes

**Step 1: Run the targeted suite**

Run:

`npm.cmd run test -- src/app/(protected)/estates/[estateId]/valuation/page.test.tsx src/modules/estates/engines/valuation/service.test.ts src/components/estates/phase2/estate-valuation-workspace.test.tsx src/components/reports/estates/valuation-report.test.tsx src/components/reports/estates/field-mapping.test.tsx src/modules/estates/forms/service.test.ts src/modules/estates/forms/valuation-docx.test.ts src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts src/desktop/golden-demo-restore.test.ts`

Expected: PASS

**Step 2: Fix any failures and rerun**

### Task 11: Lint, build, and desktop refresh

**Files:**
- No code changes unless verification fails

**Step 1: Run lint**

Run: `npm.cmd run lint`

**Step 2: Run build**

Run: `npm.cmd run build`

**Step 3: Refresh desktop runtime**

Run:

- `node desktop/prepare-standalone.cjs`
- `npm.cmd run desktop:bundle`

**Step 4: Relaunch local desktop executable**

Relaunch:

- `dist/desktop-refresh/win-unpacked/TaxOps ZA.exe`

### Task 12: Final live verification

**Files:**
- No code changes unless live verification fails

**Step 1: Check startup log**

Inspect:

- `C:\Users\HP\AppData\Roaming\sa-tax-platform\desktop-startup.log`

Expected:

- no fresh valuation-page `URI malformed` crash
- no fresh valuation-action `911440072` maintainable-earnings crash after the rebuild

**Step 2: Confirm current desktop data reflects the upgraded demo report**

Inspect:

- `C:\Users\HP\AppData\Roaming\sa-tax-platform\storage\demo-estate-engine-runs.json`

Expected:

- business valuation run now stores canonical report data

**Step 3: Report exact evidence**

- test counts
- lint result
- build result
- desktop bundle result
- log status
