# Golden Demo Client Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a source-controlled golden demo bundle that is automatically restored into the desktop demo stores on startup so one cross-module verification client is always available.

**Architecture:** Keep golden baseline data in code, add additive-merge restore helpers for persisted demo JSON stores, and make demo-mode estate engine runs persistent instead of process-only. Wire restore into desktop startup paths so the packaged app always repairs the golden scenario before the user starts testing.

**Tech Stack:** Next.js, Electron desktop shell, Node filesystem APIs, demo-mode JSON repositories, Vitest.

---

### Task 1: Add failing tests for golden restore behavior

**Files:**
- Create: `src/server/golden-demo/restore.test.ts`
- Modify: `src/desktop/browser-session.test.ts`
- Modify: `src/desktop/prepare-standalone.test.ts`

**Step 1: Write the failing test**

Add tests covering:
- additive restore inserts missing golden estate and assessment records
- additive restore overwrites modified golden records
- additive restore preserves unrelated non-golden records
- startup restore is invoked from the desktop startup path

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/server/golden-demo/restore.test.ts src/desktop/browser-session.test.ts src/desktop/prepare-standalone.test.ts`

Expected: FAIL because the restore module and startup integration do not exist yet.

**Step 3: Write minimal implementation**

Create the missing restore entrypoints with just enough behavior to satisfy the tests.

**Step 4: Run test to verify it passes**

Run the same command and confirm the new tests pass.

### Task 2: Create the golden demo bundle source data

**Files:**
- Create: `src/server/golden-demo/bundle.ts`
- Modify: `src/server/demo-data.ts`

**Step 1: Write the failing test**

Extend `src/server/golden-demo/restore.test.ts` to assert the bundle includes:
- a stable individual client
- a stable estate client
- linked case records
- individual-tax assessments
- estate child records
- estate engine runs

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/server/golden-demo/restore.test.ts`

Expected: FAIL because the golden bundle records are not defined.

**Step 3: Write minimal implementation**

Add a source-controlled bundle with stable IDs and enough baseline data to exercise:
- client pages
- case pages
- individual-tax reports
- estate dashboard
- valuation
- pre-death ITR12
- CGT
- estate duty
- filing pack

**Step 4: Run test to verify it passes**

Run the same test file and confirm the assertions pass.

### Task 3: Persist demo estate engine runs

**Files:**
- Modify: `src/modules/estates/engines/repository.ts`
- Create: `src/modules/estates/engines/repository.test.ts`

**Step 1: Write the failing test**

Add tests showing that demo-mode engine runs:
- read from a persisted JSON store
- survive process restarts
- can be seeded with golden approved runs

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/modules/estates/engines/repository.test.ts`

Expected: FAIL because demo-mode engine runs are memory-only.

**Step 3: Write minimal implementation**

Add a persisted demo engine-run store such as `demo-estate-engine-runs.json` and switch demo-mode repository reads and writes to that file.

**Step 4: Run test to verify it passes**

Run the same test file and confirm persistence behavior passes.

### Task 4: Implement additive golden restore helpers

**Files:**
- Create: `src/server/golden-demo/restore.ts`
- Create: `src/server/golden-demo/storage.ts`
- Modify: `src/modules/estates/repository.ts`
- Modify: `src/modules/individual-tax/repository.ts`
- Modify if needed: `src/modules/clients/client-service.ts`
- Modify if needed: `src/modules/cases/case-service.ts`

**Step 1: Write the failing test**

Expand `src/server/golden-demo/restore.test.ts` to verify:
- restore upserts golden estate data into the persisted estate store
- restore upserts golden individual-tax data into the persisted assessment store
- restore keeps unrelated records intact

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/server/golden-demo/restore.test.ts src/modules/estates/engines/repository.test.ts`

Expected: FAIL because the merge helpers and repository integration are incomplete.

**Step 3: Write minimal implementation**

Implement additive merge logic by stable ID for:
- estates and estate child collections
- individual-tax assessments
- estate engine runs

Keep non-golden records untouched.

**Step 4: Run test to verify it passes**

Run the same command and confirm the restore behavior passes.

### Task 5: Wire automatic restore into desktop startup paths

**Files:**
- Modify: `desktop/main.cjs`
- Modify: `desktop/prepare-standalone.cjs`
- Create if needed: `scripts/restore-golden-demo.cjs`

**Step 1: Write the failing test**

Extend desktop startup tests so they require golden restore to run before the app serves the local desktop workspace.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/desktop/browser-session.test.ts src/desktop/prepare-standalone.test.ts src/server/golden-demo/restore.test.ts`

Expected: FAIL because startup does not invoke restore yet.

**Step 3: Write minimal implementation**

Call the restore helper during demo-mode startup and standalone preparation, with soft-fail logging to `desktop-startup.log`.

**Step 4: Run test to verify it passes**

Run the same command and confirm startup restore is covered.

### Task 6: Verify the golden client end to end and refresh desktop runtime

**Files:**
- Modify if needed: `docs/plans/2026-03-13-golden-demo-client-design.md`

**Step 1: Run focused tests**

Run:
`npm.cmd run test -- src/server/golden-demo/restore.test.ts src/modules/estates/engines/repository.test.ts src/modules/individual-tax/repository.test.ts src/components/estates/phase2/estate-live-workspaces.test.tsx src/modules/estates/forms/service.test.ts`

**Step 2: Run lint and build**

Run:
- `npm.cmd run lint`
- `npm.cmd run build`

**Step 3: Refresh desktop runtime**

Run:
- `node desktop/prepare-standalone.cjs`

**Step 4: Relaunch and inspect desktop app**

Relaunch:
- `dist/desktop-refresh/win-unpacked/TaxOps ZA.exe`

Verify that the golden client bundle is visible and the golden estate can open valuation, pre-death ITR12, CGT, estate duty, and filing pack with seeded readiness.
