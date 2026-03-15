# Deceased Estates Operational Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a new deceased estates operational workspace to the SA tax platform with estate intake, workflow tracking, asset/liability/beneficiary registers, a working L&D tracker, document checklist integration, and executor read-only access.

**Architecture:** Introduce a dedicated `estates` domain that fits the existing Next.js module/service/repository patterns, links each estate to existing client and document records, and stores enough structured operational data to support stage validation and a balanced L&D tracker. Keep phase 1 focused on workflow operations and read-only executor visibility, while leaving clean extension points for future tax, CGT, estate duty, post-death, and valuation engines.

**Tech Stack:** Next.js App Router, TypeScript, React server actions, Prisma, Zod, Vitest, Tailwind CSS, Electron desktop runtime, demo-mode JSON/file-backed storage where applicable.

---

### Task 1: Define estate types, enums, and validation schemas

**Files:**
- Create: `src/modules/estates/types.ts`
- Create: `src/modules/estates/validation.ts`
- Modify: `src/modules/shared/types.ts`
- Test: `src/modules/estates/validation.test.ts`

**Step 1: Write the failing test**
Add validation tests covering:
- estate core record fields
- stage enum values
- asset input validation
- liability input validation
- beneficiary input validation
- L&D entry validation
- executor access validation

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/modules/estates/validation.test.ts`
Expected: FAIL because the estates domain does not exist yet.

**Step 3: Write minimal implementation**
Create estate-specific TypeScript types and Zod schemas for the phase 1 operational model.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/modules/estates/validation.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/modules/estates/types.ts src/modules/estates/validation.ts src/modules/shared/types.ts src/modules/estates/validation.test.ts
git commit -m "feat: define deceased estate domain model"
```

### Task 2: Add estate storage and service foundations

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/modules/estates/repository.ts`
- Create: `src/modules/estates/service.ts`
- Modify: `src/server/demo-data.ts`
- Test: `src/modules/estates/service.test.ts`

**Step 1: Write the failing test**
Add service tests for:
- creating a new estate
- linking the estate to a client
- generating an estate reference
- loading estate detail with empty child collections

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/modules/estates/service.test.ts`
Expected: FAIL because there is no repository or service support for estates.

**Step 3: Write minimal implementation**
Add Prisma-ready schema shapes and a repository/service layer that works in both demo mode and the current app runtime. Seed at least one realistic sample estate in demo data.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/modules/estates/service.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add prisma/schema.prisma src/modules/estates/repository.ts src/modules/estates/service.ts src/server/demo-data.ts src/modules/estates/service.test.ts
git commit -m "feat: add estate repository and service foundation"
```

### Task 3: Implement checklist generation and stage validation

**Files:**
- Create: `src/modules/estates/checklist.ts`
- Create: `src/modules/estates/stage-validation.ts`
- Modify: `src/modules/estates/service.ts`
- Test: `src/modules/estates/stage-validation.test.ts`

**Step 1: Write the failing test**
Add tests asserting that:
- a new estate gets the expected initial checklist items
- advancing a stage fails with readable messages when required records are missing
- advancing a stage succeeds when prerequisites are satisfied

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/modules/estates/stage-validation.test.ts`
Expected: FAIL because checklist generation and stage validation do not exist.

**Step 3: Write minimal implementation**
Implement default checklist generation plus stage validation helpers and wire them into the estate service.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/modules/estates/stage-validation.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/modules/estates/checklist.ts src/modules/estates/stage-validation.ts src/modules/estates/service.ts src/modules/estates/stage-validation.test.ts
git commit -m "feat: add estate checklist and stage validation"
```

### Task 4: Build liquidation and distribution balancing logic

**Files:**
- Create: `src/modules/estates/liquidation.ts`
- Modify: `src/modules/estates/types.ts`
- Modify: `src/modules/estates/service.ts`
- Test: `src/modules/estates/liquidation.test.ts`

**Step 1: Write the failing test**
Add tests for:
- gross asset total calculation
- liability total calculation
- administration cost total calculation
- executor remuneration handling
- net distributable estate calculation
- beneficiary allocation balancing
- ready-state failure when the schedule does not balance

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/modules/estates/liquidation.test.ts`
Expected: FAIL because there is no liquidation logic yet.

**Step 3: Write minimal implementation**
Implement the operational L&D calculation helpers and expose the computed summary through the estate service.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/modules/estates/liquidation.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/modules/estates/liquidation.ts src/modules/estates/types.ts src/modules/estates/service.ts src/modules/estates/liquidation.test.ts
git commit -m "feat: add estate liquidation balancing logic"
```

### Task 5: Create the internal estate list and create-estate wizard

**Files:**
- Create: `src/components/estates/estate-create-wizard.tsx`
- Create: `src/components/estates/estate-list.tsx`
- Create: `src/components/estates/estate-create-wizard.test.tsx`
- Create: `src/app/(protected)/estates/page.tsx`
- Create: `src/app/(protected)/estates/new/page.tsx`
- Modify: `src/app/(protected)/dashboard/page.tsx`

**Step 1: Write the failing test**
Add UI tests for:
- list rendering with stage badges
- create-estate wizard step flow
- validation on core deceased and executor details
- successful save redirect to the estate dashboard

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/components/estates/estate-create-wizard.test.tsx`
Expected: FAIL because the pages and components do not exist.

**Step 3: Write minimal implementation**
Build the internal list page and intake wizard, then surface estate counts or quick links on the dashboard.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/components/estates/estate-create-wizard.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/components/estates/estate-create-wizard.tsx src/components/estates/estate-list.tsx src/components/estates/estate-create-wizard.test.tsx src/app/(protected)/estates/page.tsx src/app/(protected)/estates/new/page.tsx src/app/(protected)/dashboard/page.tsx
git commit -m "feat: add estate intake and list workflow"
```

### Task 6: Build the estate dashboard and navigation shell

**Files:**
- Create: `src/components/estates/estate-dashboard.tsx`
- Create: `src/components/estates/estate-stage-progress.tsx`
- Create: `src/components/estates/estate-checklist-panel.tsx`
- Create: `src/app/(protected)/estates/[estateId]/page.tsx`
- Test: `src/components/estates/estate-dashboard.test.tsx`

**Step 1: Write the failing test**
Add component tests for:
- progress bar rendering
- checklist completion rendering
- key balance summary cards
- quick action links
- recent timeline activity display

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/components/estates/estate-dashboard.test.tsx`
Expected: FAIL because the estate dashboard components do not exist.

**Step 3: Write minimal implementation**
Build the main estate dashboard as the internal control center with links to the detailed estate sub-pages.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/components/estates/estate-dashboard.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/components/estates/estate-dashboard.tsx src/components/estates/estate-stage-progress.tsx src/components/estates/estate-checklist-panel.tsx src/app/(protected)/estates/[estateId]/page.tsx src/components/estates/estate-dashboard.test.tsx
git commit -m "feat: add estate dashboard and progress shell"
```

### Task 7: Add asset, liability, and beneficiary registers

**Files:**
- Create: `src/components/estates/estate-asset-register.tsx`
- Create: `src/components/estates/estate-liability-register.tsx`
- Create: `src/components/estates/estate-beneficiary-register.tsx`
- Create: `src/app/(protected)/estates/[estateId]/assets/page.tsx`
- Create: `src/app/(protected)/estates/[estateId]/liabilities/page.tsx`
- Create: `src/app/(protected)/estates/[estateId]/beneficiaries/page.tsx`
- Test: `src/components/estates/estate-registers.test.tsx`

**Step 1: Write the failing test**
Add UI tests for:
- adding and listing assets
- adding and listing liabilities
- adding and listing beneficiaries
- empty states and inline totals

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/components/estates/estate-registers.test.tsx`
Expected: FAIL because the register components and pages do not exist.

**Step 3: Write minimal implementation**
Create the three operational registers and wire them to estate service actions.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/components/estates/estate-registers.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/components/estates/estate-asset-register.tsx src/components/estates/estate-liability-register.tsx src/components/estates/estate-beneficiary-register.tsx src/app/(protected)/estates/[estateId]/assets/page.tsx src/app/(protected)/estates/[estateId]/liabilities/page.tsx src/app/(protected)/estates/[estateId]/beneficiaries/page.tsx src/components/estates/estate-registers.test.tsx
git commit -m "feat: add estate operational registers"
```

### Task 8: Build the working L&D tracker page

**Files:**
- Create: `src/components/estates/estate-liquidation-tracker.tsx`
- Create: `src/components/estates/estate-distribution-table.tsx`
- Create: `src/app/(protected)/estates/[estateId]/liquidation/page.tsx`
- Test: `src/components/estates/estate-liquidation-tracker.test.tsx`

**Step 1: Write the failing test**
Add UI tests for:
- liquidation summary rendering
- administration cost entries
- executor remuneration display
- beneficiary distribution allocations
- balancing error display
- ready-state success display when the schedule balances

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/components/estates/estate-liquidation-tracker.test.tsx`
Expected: FAIL because the L&D tracker UI does not exist.

**Step 3: Write minimal implementation**
Build the operational liquidation tracker page using the balancing logic from the estate module and provide clear line-by-line totals.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/components/estates/estate-liquidation-tracker.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/components/estates/estate-liquidation-tracker.tsx src/components/estates/estate-distribution-table.tsx src/app/(protected)/estates/[estateId]/liquidation/page.tsx src/components/estates/estate-liquidation-tracker.test.tsx
git commit -m "feat: add estate liquidation tracker"
```

### Task 9: Add estate documents and timeline views

**Files:**
- Create: `src/components/estates/estate-documents.tsx`
- Create: `src/components/estates/estate-timeline.tsx`
- Create: `src/app/(protected)/estates/[estateId]/documents/page.tsx`
- Create: `src/app/(protected)/estates/[estateId]/timeline/page.tsx`
- Test: `src/components/estates/estate-supporting-pages.test.tsx`

**Step 1: Write the failing test**
Add UI tests for:
- document checklist grouping
- linked document rendering
- timeline event rendering
- stage transition history display

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/components/estates/estate-supporting-pages.test.tsx`
Expected: FAIL because the documents and timeline pages do not exist.

**Step 3: Write minimal implementation**
Build estate-specific document and timeline views that reuse current document and activity patterns where possible.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/components/estates/estate-supporting-pages.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/components/estates/estate-documents.tsx src/components/estates/estate-timeline.tsx src/app/(protected)/estates/[estateId]/documents/page.tsx src/app/(protected)/estates/[estateId]/timeline/page.tsx src/components/estates/estate-supporting-pages.test.tsx
git commit -m "feat: add estate documents and timeline pages"
```

### Task 10: Add executor read-only access

**Files:**
- Create: `src/components/estates/executor-estate-dashboard.tsx`
- Create: `src/app/executor/estates/[accessToken]/page.tsx`
- Modify: `src/modules/estates/service.ts`
- Test: `src/components/estates/executor-estate-dashboard.test.tsx`
- Test: `src/modules/estates/service.test.ts`

**Step 1: Write the failing test**
Add tests asserting that:
- executor token access can load an estate
- executor output is read-only
- internal notes and staff-only details are excluded
- estate progress and high-level balances are shown

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/components/estates/executor-estate-dashboard.test.tsx src/modules/estates/service.test.ts`
Expected: FAIL because executor access and projection do not exist.

**Step 3: Write minimal implementation**
Add token-backed read-only estate access and a dedicated executor dashboard serializer and page.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/components/estates/executor-estate-dashboard.test.tsx src/modules/estates/service.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/components/estates/executor-estate-dashboard.tsx src/app/executor/estates/[accessToken]/page.tsx src/modules/estates/service.ts src/components/estates/executor-estate-dashboard.test.tsx src/modules/estates/service.test.ts
git commit -m "feat: add executor read-only estate access"
```

### Task 11: Full verification and desktop readiness

**Files:**
- Review: `src/modules/estates/**/*.ts`
- Review: `src/components/estates/**/*.tsx`
- Review: `src/app/(protected)/estates/**/*.tsx`
- Review: `src/app/executor/estates/**/*.tsx`
- Review: `prisma/schema.prisma`

**Step 1: Run targeted estate tests**
Run: `npm.cmd run test -- src/modules/estates/validation.test.ts src/modules/estates/service.test.ts src/modules/estates/stage-validation.test.ts src/modules/estates/liquidation.test.ts src/components/estates/estate-create-wizard.test.tsx src/components/estates/estate-dashboard.test.tsx src/components/estates/estate-registers.test.tsx src/components/estates/estate-liquidation-tracker.test.tsx src/components/estates/estate-supporting-pages.test.tsx src/components/estates/executor-estate-dashboard.test.tsx`
Expected: PASS

**Step 2: Run full test suite**
Run: `npm.cmd run test`
Expected: PASS

**Step 3: Run lint**
Run: `npm.cmd run lint`
Expected: PASS

**Step 4: Run production build**
Run: `npm.cmd run build`
Expected: PASS

**Step 5: Prepare desktop runtime refresh**
Run: `npm.cmd run desktop:bundle`
Expected: PASS

**Step 6: Commit**
```bash
git add prisma/schema.prisma src/modules/estates src/components/estates src/app/(protected)/estates src/app/executor/estates src/server/demo-data.ts src/modules/shared/types.ts
git commit -m "feat: add deceased estates operational workspace"
```
