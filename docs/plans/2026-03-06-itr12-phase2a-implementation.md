# ITR12 Phase 2a Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build ITR12 workflow and 2026 core calculation scaffolds with review-required controls and repository abstraction.

**Architecture:** Add a dedicated `itr12` module with typed repository interface, demo adapter, workflow state machine, and calculation line-item engine; expose via new protected routes.

**Tech Stack:** Next.js App Router, TypeScript, Zod, Prisma schema placeholders, Vitest.

---

### Task 1: Add failing tests for ITR12 domain logic

**Files:**
- Create: `src/modules/itr12/workflow-service.test.ts`
- Create: `src/modules/itr12/calculation-service.test.ts`
- Create: `src/modules/itr12/validation.test.ts`

**Step 1: Write failing workflow transition tests**
- Assert valid transition path from `INTAKE` to `DATA_COLLECTION`.
- Assert invalid transition directly to `READY_FOR_SUBMISSION`.
- Assert transition metadata includes actor and summary.

**Step 2: Write failing calculation scaffold tests**
- Assert taxable income and credits summary structure.
- Assert net liability/refund line item is generated.
- Assert each line item includes review-required metadata.

**Step 3: Write failing validation tests**
- Assert required base fields for ITR12 input payload.
- Assert invalid assessment period/date format rejection.

**Step 4: Run tests and confirm failures**
- Run: `npm run test`
- Expected: new ITR12 tests fail because implementations do not exist yet.

### Task 2: Implement ITR12 module

**Files:**
- Create: `src/modules/itr12/types.ts`
- Create: `src/modules/itr12/repository.ts`
- Create: `src/modules/itr12/workflow-service.ts`
- Create: `src/modules/itr12/calculation-service.ts`
- Create: `src/modules/itr12/validation.ts`
- Modify: `src/server/demo-data.ts`

**Step 1: Define strongly typed ITR12 entities and state enums**
- Include workflow state, calculation input/output, assumptions, workpapers.

**Step 2: Implement workflow transition service**
- Add transition graph guardrails and metadata capture.

**Step 3: Implement core calculation scaffold service**
- Build line-item output blocks for core set and summary totals.
- Mark all outputs review-required with source placeholders.

**Step 4: Implement repository interface + demo adapter**
- Provide list/get functions for ITR12 workspaces using demo data.

**Step 5: Implement Zod validation schemas**
- ITR12 profile, workpaper, and calculation input schemas.

**Step 6: Run tests and confirm pass**
- Run: `npm run test`
- Expected: ITR12 tests pass.

### Task 3: Add UI routes and integration

**Files:**
- Create: `src/app/(protected)/itr12/page.tsx`
- Create: `src/app/(protected)/itr12/[caseId]/page.tsx`
- Create: `src/app/(protected)/itr12/[caseId]/workpapers/page.tsx`
- Create: `src/app/(protected)/itr12/[caseId]/calculation/page.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `middleware.ts`

**Step 1: Add ITR12 navigation entry**
- Add sidebar route to new module.

**Step 2: Build list page**
- Show ITR12 case cards/table, workflow state, due date, assigned role.

**Step 3: Build detail page**
- Show workflow timeline, review gate status, assumptions summary.

**Step 4: Build workpapers page**
- Show structured schedules and review state placeholders.

**Step 5: Build calculation page**
- Render line-item outputs with source and assumptions metadata.

**Step 6: Protect routes in middleware**
- Include `/itr12/:path*` matcher.

### Task 4: Extend Prisma schema and seed placeholders

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`

**Step 1: Add ITR12 placeholder models and relations**
- `ITR12Profile`, `ITR12Workpaper`, `ITR12CalculationRun`, `ITR12CalculationLineItem`, `ITR12Assumption`, `ITR12ReviewChecklist`.

**Step 2: Add sample 2026 ITR12 placeholder records in seed**
- Include one sample individual case with scaffold entries.

### Task 5: Verification and docs update

**Files:**
- Modify: `README.md`

**Step 1: Update README with ITR12 phase additions**
- Include routes, scope, and review-required caveats.

**Step 2: Run lint/tests/build**
- Run: `npm run lint`
- Run: `npm run test`
- Run: `npm run build`
- Expected: all commands succeed.

**Step 3: Summarize delivered scope and next handoff**
- Mark Phase 2b target: repository swap to Prisma implementations.
