# Estate Filing Pack Print Actions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-artifact generate, open, and print actions to the estate filing-pack workspace for PDF and Word artifacts in the desktop app.

**Architecture:** Extend the existing filing-pack route with a single-artifact generation mode, expose local file paths from the storage layer, and add a client-side artifact action component that uses new Electron IPC handlers to open or print the generated local file. Keep the current full-pack generation flow intact.

**Tech Stack:** Next.js App Router, React 19, Vitest, Electron, TypeScript, local file storage

---

### Task 1: Add failing route coverage for single-artifact generation

**Files:**
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\app\api\reports\estates\[estateId]\filing-pack\route.test.ts`

**Step 1: Write the failing test**

- Add a test that calls the filing-pack route with `artifactCode=BUSINESS_VALUATION_REPORT`.
- Assert that:
  - the response is `200`
  - the response contains a single artifact result
  - the artifact includes `localFilePath`
  - the artifact output format remains `docx`

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- "src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts"`

Expected: FAIL because the route does not yet support `artifactCode` or `localFilePath`.

**Step 3: Write minimal implementation**

- Update the route and storage helper seams enough to support the new response contract.

**Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- "src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts"`

Expected: PASS

### Task 2: Add failing UI coverage for per-artifact action controls

**Files:**
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\components\estates\phase2\estate-tax-workspaces.test.tsx`
- Create: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\components\estates\phase2\filing-pack-artifact-actions.tsx`

**Step 1: Write the failing test**

- Add a filing-pack workspace test that expects:
  - an `Open` action on each artifact row
  - a `Print PDF` label for PDF artifacts
  - a `Print Word` label for Word artifacts

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- "src/components/estates/phase2/estate-tax-workspaces.test.tsx"`

Expected: FAIL because the UI does not yet render those controls.

**Step 3: Write minimal implementation**

- Add a client component for artifact actions.
- Render it from the filing-pack status card rows.

**Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- "src/components/estates/phase2/estate-tax-workspaces.test.tsx"`

Expected: PASS

### Task 3: Add failing desktop bridge coverage for file open and print

**Files:**
- Create: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\desktop\desktop-file-actions.test.ts`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\desktop\preload.cjs`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\desktop\main.cjs`

**Step 1: Write the failing test**

- Add desktop-focused tests around helper functions that:
  - validate open-file intent
  - validate print-file intent
  - reject empty or malformed paths

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- "src/desktop/desktop-file-actions.test.ts"`

Expected: FAIL because no desktop file-action helpers or IPC handlers exist yet.

**Step 3: Write minimal implementation**

- Add helper functions for sanitised desktop file actions.
- Wire them into Electron IPC and preload.

**Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- "src/desktop/desktop-file-actions.test.ts"`

Expected: PASS

### Task 4: Implement storage-path resolution and route support

**Files:**
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\modules\documents\storage-provider.ts`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\app\api\reports\estates\[estateId]\filing-pack\route.ts`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\modules\estates\forms\types.ts`

**Step 1: Add storage helpers**

- Export a helper to resolve the storage root.
- Export a helper to resolve a storage key to a local file path.

**Step 2: Add route query handling**

- Parse `artifactCode`.
- Generate either the single artifact or the full pack based on that parameter.

**Step 3: Return artifact metadata**

- Include `localFilePath` for stored artifacts.
- Preserve existing whole-pack response fields.

**Step 4: Re-run focused tests**

Run: `npm.cmd run test -- "src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts"`

Expected: PASS

### Task 5: Implement the per-artifact filing-pack action component

**Files:**
- Create: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\components\estates\phase2\filing-pack-artifact-actions.tsx`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\src\components\estates\phase2\filing-pack-status.tsx`

**Step 1: Add client action component**

- Implement a client component that:
  - calls the single-artifact API
  - tracks loading and error state
  - calls desktop `openFile` or `printFile` after generation

**Step 2: Render action component in artifact rows**

- Replace the static row layout with artifact-level actions.

**Step 3: Re-run focused UI tests**

Run: `npm.cmd run test -- "src/components/estates/phase2/estate-tax-workspaces.test.tsx"`

Expected: PASS

### Task 6: Implement Electron file actions

**Files:**
- Create: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\desktop\file-actions.cjs`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\desktop\main.cjs`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\desktop\preload.cjs`
- Modify: `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\package.json`

**Step 1: Add helper module**

- Implement small helpers that:
  - validate non-empty file paths
  - open a file with the OS shell
  - print a file via PowerShell `Start-Process -Verb Print`

**Step 2: Wire IPC handlers**

- Expose `taxops:open-file` and `taxops:print-file`.

**Step 3: Expose preload bridge**

- Add `openFile()` and `printFile()` to `window.taxOpsDesktop`.

**Step 4: Ensure packaging includes the new helper**

- Add the helper file to Electron build `files`.

**Step 5: Re-run desktop tests**

Run: `npm.cmd run test -- "src/desktop/desktop-file-actions.test.ts"`

Expected: PASS

### Task 7: Verify the full slice and refresh the local desktop runtime

**Files:**
- Verify only

**Step 1: Run focused tests**

Run: `npm.cmd run test -- "src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts" "src/components/estates/phase2/estate-tax-workspaces.test.tsx" "src/desktop/desktop-file-actions.test.ts"`

Expected: PASS

**Step 2: Run broader quality gates**

Run: `npm.cmd run lint`

Expected: PASS

Run: `npm.cmd run build`

Expected: PASS

**Step 3: Refresh the desktop runtime**

Run: `node desktop/prepare-standalone.cjs`

Expected: PASS

Run: `npx.cmd electron-builder --win dir --config.win.signAndEditExecutable=false --config.directories.output=dist/desktop-refresh`

Expected: PASS

**Step 4: Relaunch the desktop app**

- Start the rebuilt runtime from `C:\Users\HP\Accounting-Pro-A.M.E\sa-tax-platform\dist\desktop-refresh\win-unpacked\TaxOps ZA.exe`

