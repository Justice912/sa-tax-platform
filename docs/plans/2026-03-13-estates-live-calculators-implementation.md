# Estates Live Calculators Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Phase 2 estates workspaces operational so users can run valuation, pre-death, CGT-on-death, estate-duty, and filing-pack workflows directly from the desktop app.

**Architecture:** Reuse the existing estate engine services and add a thin workspace layer: server actions, live form components, dependency-state helpers, and result presentation. Keep calculations in the existing services and calculation modules instead of duplicating tax logic in the UI.

**Tech Stack:** Next.js app router, server actions, React server components, Vitest, existing estate engine services.

---

### Task 1: Write live workspace tests

**Files:**
- Create: `src/components/estates/phase2/estate-live-workspaces.test.tsx`
- Modify: `src/components/estates/phase2/estate-valuation-workspace.test.tsx`

**Step 1: Write the failing tests**

Add tests for:
- Pre-death workspace input fields and latest-run summary
- CGT workspace asset list and run summary
- Estate-duty workspace deduction fields and dependency readiness
- Filing-pack workspace readiness breakdown
- Valuation method label showing `NAV`

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/components/estates/phase2/estate-live-workspaces.test.tsx src/components/estates/phase2/estate-valuation-workspace.test.tsx`

**Step 3: Write minimal implementation**

Create the missing workspace components and update valuation labels.

**Step 4: Run test to verify it passes**

Run the same command and confirm the new workspace tests pass.

### Task 2: Add shared Phase 2 workspace helpers

**Files:**
- Modify: `src/modules/estates/phase2/workspace-helpers.ts`
- Test: `src/components/estates/phase2/estate-live-workspaces.test.tsx`

**Step 1: Write the failing test**

Add assertions covering derived estate-duty dependency states and valuation method labels.

**Step 2: Run test to verify it fails**

Run the targeted workspace test file.

**Step 3: Write minimal implementation**

Add helper functions to:
- Format valuation methodology labels
- Resolve the latest dependency state for valuation and CGT runs

**Step 4: Run test to verify it passes**

Run the targeted workspace test file again.

### Task 3: Build live workspace components

**Files:**
- Create: `src/components/estates/phase2/estate-pre-death-workspace.tsx`
- Create: `src/components/estates/phase2/estate-cgt-workspace.tsx`
- Create: `src/components/estates/phase2/estate-duty-workspace.tsx`
- Create: `src/components/estates/phase2/estate-filing-pack-workspace.tsx`
- Modify: `src/components/estates/phase2/estate-valuation-workspace.tsx`
- Test: `src/components/estates/phase2/estate-live-workspaces.test.tsx`

**Step 1: Write the failing test**

Expand the workspace tests to cover the specific labels and result sections each component must render.

**Step 2: Run test to verify it fails**

Run the targeted workspace test file.

**Step 3: Write minimal implementation**

Implement the components as form-first server-rendered UIs that accept:
- estate
- latest run
- derived summaries
- submit action

**Step 4: Run test to verify it passes**

Run the targeted workspace test file again.

### Task 4: Wire server actions into Phase 2 pages

**Files:**
- Modify: `src/app/(protected)/estates/[estateId]/valuation/page.tsx`
- Modify: `src/app/(protected)/estates/[estateId]/tax/pre-death/page.tsx`
- Modify: `src/app/(protected)/estates/[estateId]/tax/cgt/page.tsx`
- Modify: `src/app/(protected)/estates/[estateId]/tax/estate-duty/page.tsx`
- Modify: `src/app/(protected)/estates/[estateId]/filing-pack/page.tsx`

**Step 1: Write the failing test**

Use the workspace component tests to drive the page wiring indirectly by requiring the necessary props and summaries.

**Step 2: Run test to verify it fails**

Run the targeted workspace tests plus the existing engine/workspace tests.

**Step 3: Write minimal implementation**

Add server actions that call:
- `estateValuationService.createValuationRun`
- `estatePreDeathService.createPreDeathRun`
- `estateCgtService.createCgtRun`
- `estateDutyService.createEstateDutyRun`

Revalidate the estate, engine workspace, and filing-pack routes after each successful run.

**Step 4: Run test to verify it passes**

Run the targeted workspace tests and the affected engine tests.

### Task 5: Verify and refresh desktop runtime

**Files:**
- Modify if needed: `desktop/*`

**Step 1: Run focused tests**

Run:
`npm.cmd run test -- src/components/estates/phase2/estate-live-workspaces.test.tsx src/components/estates/phase2/estate-valuation-workspace.test.tsx src/modules/estates/engines/valuation/service.test.ts src/modules/estates/engines/pre-death/service.test.ts src/modules/estates/engines/cgt/service.test.ts src/modules/estates/engines/estate-duty/service.test.ts src/modules/estates/forms/service.test.ts`

**Step 2: Run lint and build**

Run:
- `npm.cmd run lint`
- `npm.cmd run build`

**Step 3: Refresh desktop runtime**

Run:
- `node desktop/prepare-standalone.cjs`
- Rebuild the Electron shell if desktop launcher files changed

**Step 4: Relaunch the desktop app**

Relaunch `dist/desktop-refresh/win-unpacked/TaxOps ZA.exe` and verify the current runtime serves the live workspaces.
