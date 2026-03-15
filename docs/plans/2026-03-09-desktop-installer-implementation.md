# Desktop Installer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a Windows-installable TaxOps ZA desktop app that launches the bundled Next standalone server automatically.

**Architecture:** Extend Electron main-process runtime to support two modes: external URL for dev and bundled standalone server for packaged/local production. Add Electron Builder NSIS configuration to produce `.exe` installer artifacts from the existing desktop shell.

**Tech Stack:** Electron, Electron Builder, Next.js standalone output, Node child process orchestration, Vitest.

---

### Task 1: Add TDD coverage for packaged runtime path resolution

**Files:**
- Create: `src/desktop/runtime-paths.test.ts`
- Create: `desktop/runtime-paths.cjs`

**Step 1: Write the failing test**
- Add tests for `resolveStandalonePaths` with unpackaged and packaged scenarios.

**Step 2: Run test to verify it fails**
- Run: `npm run test -- src/desktop/runtime-paths.test.ts`
- Expected: FAIL due to missing module/export.

**Step 3: Write minimal implementation**
- Implement `resolveStandalonePaths` with deterministic path resolution.

**Step 4: Run test to verify it passes**
- Run: `npm run test -- src/desktop/runtime-paths.test.ts`
- Expected: PASS.

### Task 2: Wire Electron main runtime to start bundled server

**Files:**
- Modify: `desktop/main.cjs`
- Modify: `desktop/run-desktop-prod.cjs`

**Step 1: Write/update failing test**
- Add assertions for `resolveDesktopServerMode` in test file and verify fail.

**Step 2: Run test to verify it fails**
- Run: `npm run test -- src/desktop/runtime-paths.test.ts`
- Expected: FAIL due to missing function.

**Step 3: Write minimal implementation**
- Add mode resolution helper and update main process startup logic.
- Spawn local server when no `APP_URL`.

**Step 4: Run test to verify it passes**
- Run: `npm run test -- src/desktop/runtime-paths.test.ts`
- Expected: PASS.

### Task 3: Add installer build configuration and scripts

**Files:**
- Modify: `package.json`
- Modify: `README.md`

**Step 1: Write failing verification expectation**
- Run missing command `npm run desktop:dist` and observe failure.

**Step 2: Implement**
- Add `electron-builder` dev dependency and scripts:
  - `desktop:bundle`
  - `desktop:dist`
- Add `build` config for NSIS output and resource inclusion.

**Step 3: Verify**
- Run: `npm run desktop:dist` and confirm artifacts in output directory.

### Task 4: Full verification before completion

**Files:**
- Modify docs as needed

**Step 1: Run full checks**
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run desktop:bundle`

**Step 2: Confirm evidence and summarize**
- Record output status and any residual packaging caveats.

