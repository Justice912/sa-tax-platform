# Estate Report PDF Actions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add direct PDF actions to estate valuation, CGT, and liquidation tabs and make filing-pack generation produce a real downloadable ZIP bundle.

**Architecture:** Extend the existing estate filing-pack route into the shared artifact-generation seam for both direct tab actions and filing-pack bundling. Add missing PDF renderers for CGT and Master liquidation reports, then expose open, print, and download actions through a reusable client component backed by the Electron desktop bridge.

**Tech Stack:** Next.js App Router, React 19, Electron, Playwright PDF generation, JSZip, TypeScript, local file storage

---

### Task 1: Add failing API tests for missing report outputs

**Files:**
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\app\api\reports\estates\[estateId]\filing-pack\route.test.ts`

**Step 1: Write the failing tests**

- Add a test for `artifactCode=SARS_CGT_DEATH&download=1` that expects a PDF response.
- Add a test for `artifactCode=MASTER_LD_ACCOUNT&download=1` that expects a PDF response.
- Add a test for `bundle=zip&download=1` that expects a ZIP response for the full filing pack.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- "src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts"`

Expected: FAIL because the route does not yet render those PDFs or return a ZIP download.

**Step 3: Write minimal implementation**

- Extend the route and renderers to satisfy the new binary responses.

**Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- "src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts"`

Expected: PASS

### Task 2: Add failing UI tests for direct PDF actions on workspace tabs

**Files:**
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\components\estates\phase2\estate-valuation-workspace.test.tsx`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\components\estates\phase2\estate-live-workspaces.test.tsx`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\components\estates\estate-supporting-pages.test.tsx`

**Step 1: Write the failing tests**

- Valuation workspace test should expect `Download PDF`, `Open PDF`, and `Print PDF`.
- CGT workspace test should expect the same action labels.
- Liquidation page or tracker test should expect the same action labels for the Master L&D output.
- Filing-pack status test should expect a real `Download Filing Pack ZIP` action instead of only a plain link.

**Step 2: Run tests to verify they fail**

Run: `npm.cmd run test -- "src/components/estates/phase2/estate-valuation-workspace.test.tsx" "src/components/estates/phase2/estate-live-workspaces.test.tsx" "src/components/estates/estate-supporting-pages.test.tsx"`

Expected: FAIL because those direct PDF actions are not yet rendered.

**Step 3: Write minimal implementation**

- Add shared report action UI and wire it into the affected tabs.

**Step 4: Run tests to verify they pass**

Run: `npm.cmd run test -- "src/components/estates/phase2/estate-valuation-workspace.test.tsx" "src/components/estates/phase2/estate-live-workspaces.test.tsx" "src/components/estates/estate-supporting-pages.test.tsx"`

Expected: PASS

### Task 3: Add failing desktop bridge coverage for download/save-as

**Files:**
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\desktop\desktop-file-actions.test.ts`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\desktop\file-actions.cjs`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\desktop\preload.cjs`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\desktop\main.cjs`

**Step 1: Write the failing test**

- Add a preload bridge test expecting `saveFileAs`.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- "src/desktop/desktop-file-actions.test.ts"`

Expected: FAIL because the desktop bridge does not yet expose save-as.

**Step 3: Write minimal implementation**

- Add the save-as bridge and the corresponding Electron handler.

**Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- "src/desktop/desktop-file-actions.test.ts"`

Expected: PASS

### Task 4: Implement missing report renderers and expanded Master mapping

**Files:**
- Create: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\components\reports\estates\cgt-death-report.tsx`
- Create: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\components\reports\estates\master-ld-account-report.tsx`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\modules\estates\forms\field-mapper.ts`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\modules\estates\forms\types.ts`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\app\api\reports\estates\[estateId]\filing-pack\route.ts`

**Step 1: Expand Master payload**

- Add liquidation entry and distribution detail to the Master L&D mapped output.

**Step 2: Add PDF renderers**

- Implement CGT report markup.
- Implement Master L&D report markup.

**Step 3: Wire renderers into the filing-pack route**

- Support PDF generation for `SARS_CGT_DEATH` and `MASTER_LD_ACCOUNT`.
- Support `renderFormat=pdf` override for valuation.

**Step 4: Re-run focused route tests**

Run: `npm.cmd run test -- "src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts"`

Expected: PASS

### Task 5: Add reusable direct report action component

**Files:**
- Create: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\components\estates\phase2\estate-report-actions.tsx`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\components\estates\phase2\estate-valuation-workspace.tsx`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\components\estates\phase2\estate-cgt-workspace.tsx`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\components\estates\estate-liquidation-tracker.tsx`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\components\estates\phase2\filing-pack-status.tsx`

**Step 1: Build the client report action component**

- Support `download`, `open`, and `print`.
- Use the shared filing-pack route with `artifactCode`, `renderFormat`, and `download` options.
- Use desktop `saveFileAs`, `openFile`, and `printFile`.

**Step 2: Mount it in all required tabs**

- Valuation tab for valuation PDF
- CGT tab for SARS CGT PDF
- Liquidation tab for Master L&D PDF
- Filing-pack tab for whole-pack ZIP download

**Step 3: Re-run focused component tests**

Run: `npm.cmd run test -- "src/components/estates/phase2/estate-valuation-workspace.test.tsx" "src/components/estates/phase2/estate-live-workspaces.test.tsx" "src/components/estates/estate-supporting-pages.test.tsx"`

Expected: PASS

### Task 6: Implement ZIP bundle generation for filing pack download

**Files:**
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\app\api\reports\estates\[estateId]\filing-pack\route.ts`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\package.json` if dependency packaging needs adjustment

**Step 1: Add ZIP bundle generation**

- Generate all filing-pack artifacts
- Add them plus the manifest JSON into a ZIP archive
- Return the ZIP as an attachment when `bundle=zip&download=1`

**Step 2: Re-run focused route tests**

Run: `npm.cmd run test -- "src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts"`

Expected: PASS

### Task 7: Verify the full slice and refresh the desktop app

**Files:**
- Verify only

**Step 1: Run focused tests**

Run: `npm.cmd run test -- "src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts" "src/components/estates/phase2/estate-tax-workspaces.test.tsx" "src/components/estates/phase2/estate-live-workspaces.test.tsx" "src/components/estates/phase2/estate-valuation-workspace.test.tsx" "src/components/estates/estate-supporting-pages.test.tsx" "src/desktop/desktop-file-actions.test.ts"`

Expected: PASS

**Step 2: Run quality gates**

Run: `npm.cmd run lint`

Expected: PASS

Run: `npm.cmd run build`

Expected: PASS

**Step 3: Refresh the desktop runtime**

Run: `node desktop/prepare-standalone.cjs`

Expected: PASS

Run: `npx.cmd electron-builder --win dir --config.win.signAndEditExecutable=false --config.directories.output=dist/desktop-refresh`

Expected: PASS

**Step 4: Relaunch desktop**

- Start `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\dist\desktop-refresh\win-unpacked\TaxOps ZA.exe`
