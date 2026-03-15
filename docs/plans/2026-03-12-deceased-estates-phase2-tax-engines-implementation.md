# Deceased Estates Phase 2 Tax Engines Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Phase 2 deceased-estates engine platform with multi-year database-managed rule packs, integrated valuation/tax engines, and formal SARS/Master filing-pack generation.

**Architecture:** Extend the existing `estates` domain with a shared year-pack configuration layer and a unified engine-run framework that powers business valuation, pre-death ITR12, CGT on death, estate duty, post-death IT-AE, and formal filing-pack generation. Reuse the current `individual-tax`, `itr12`, `documents`, `audit`, report-route, and protected-route patterns so Phase 2 feels native to the existing app instead of becoming a second product inside the repo.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, React server actions, Zod, Vitest, Playwright, Tailwind CSS, existing report/PDF route patterns, Electron desktop runtime

---

### Task 1: Add year-pack schema, types, and validation

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Create: `src/modules/estates/year-packs/types.ts`
- Create: `src/modules/estates/year-packs/validation.ts`
- Create: `src/modules/estates/year-packs/service.ts`
- Test: `src/modules/estates/year-packs/validation.test.ts`
- Test: `src/modules/estates/year-packs/service.test.ts`

**Step 1: Write the failing tests**
Add tests for:
- validating a multi-year tax-year-pack payload
- loading only approved year packs
- resolving the latest approved version for a selected tax year
- rejecting missing form-template metadata for a year pack

**Step 2: Run tests to verify they fail**
Run: `npm.cmd run test -- src/modules/estates/year-packs/validation.test.ts src/modules/estates/year-packs/service.test.ts`
Expected: FAIL because the year-pack module does not exist yet.

**Step 3: Write minimal implementation**
Add Prisma models plus the initial service/validation layer for approved year packs and form-template metadata.

**Step 4: Run tests to verify they pass**
Run: `npm.cmd run test -- src/modules/estates/year-packs/validation.test.ts src/modules/estates/year-packs/service.test.ts`
Expected: PASS

### Task 2: Add the shared estate engine-run framework

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/modules/estates/engines/types.ts`
- Create: `src/modules/estates/engines/validation.ts`
- Create: `src/modules/estates/engines/repository.ts`
- Create: `src/modules/estates/engines/service.ts`
- Test: `src/modules/estates/engines/service.test.ts`

**Step 1: Write the failing tests**
Add tests for:
- creating an engine run with a year-pack reference
- saving structured inputs and outputs
- marking a run as review-required by default
- approving a run
- rejecting approval when upstream dependencies are stale or draft

**Step 2: Run tests to verify they fail**
Run: `npm.cmd run test -- src/modules/estates/engines/service.test.ts`
Expected: FAIL because the shared engine-run layer does not exist.

**Step 3: Write minimal implementation**
Create the common engine-run repository/service and dependency-state helpers.

**Step 4: Run tests to verify they pass**
Run: `npm.cmd run test -- src/modules/estates/engines/service.test.ts`
Expected: PASS

### Task 3: Build the business valuation engine

**Files:**
- Create: `src/modules/estates/engines/valuation/types.ts`
- Create: `src/modules/estates/engines/valuation/validation.ts`
- Create: `src/modules/estates/engines/valuation/calculation.ts`
- Create: `src/modules/estates/engines/valuation/service.ts`
- Create: `src/modules/estates/engines/valuation/report-transformer.ts`
- Test: `src/modules/estates/engines/valuation/calculation.test.ts`
- Test: `src/modules/estates/engines/valuation/service.test.ts`

**Step 1: Write the failing tests**
Add tests for:
- sole-proprietor valuation
- company/shareholding valuation
- method/assumption capture
- valuation summary report transformation
- dependency output for downstream CGT use

**Step 2: Run tests to verify they fail**
Run: `npm.cmd run test -- src/modules/estates/engines/valuation/calculation.test.ts src/modules/estates/engines/valuation/service.test.ts`
Expected: FAIL because the valuation engine does not exist.

**Step 3: Write minimal implementation**
Build the valuation engine and persist its normalized output through the shared engine-run layer.

**Step 4: Run tests to verify they pass**
Run: `npm.cmd run test -- src/modules/estates/engines/valuation/calculation.test.ts src/modules/estates/engines/valuation/service.test.ts`
Expected: PASS

### Task 4: Build the pre-death ITR12 engine

**Files:**
- Create: `src/modules/estates/engines/pre-death/types.ts`
- Create: `src/modules/estates/engines/pre-death/validation.ts`
- Create: `src/modules/estates/engines/pre-death/service.ts`
- Create: `src/modules/estates/engines/pre-death/transformer.ts`
- Modify: `src/modules/individual-tax/service.ts`
- Modify: `src/modules/individual-tax/rulepack-registry.ts`
- Test: `src/modules/estates/engines/pre-death/service.test.ts`

**Step 1: Write the failing tests**
Add tests for:
- selecting the correct year pack from database-backed configuration
- translating estate/deceased data into a pre-death taxpayer run
- truncating income periods to the date of death
- persisting an estate-linked pre-death ITR12 run

**Step 2: Run tests to verify they fail**
Run: `npm.cmd run test -- src/modules/estates/engines/pre-death/service.test.ts`
Expected: FAIL because the estate pre-death adapter does not exist.

**Step 3: Write minimal implementation**
Build the estate pre-death adapter around the current individual-tax logic while moving year resolution away from hard-coded annual files.

**Step 4: Run tests to verify they pass**
Run: `npm.cmd run test -- src/modules/estates/engines/pre-death/service.test.ts`
Expected: PASS

### Task 5: Build the CGT on death engine

**Files:**
- Create: `src/modules/estates/engines/cgt/types.ts`
- Create: `src/modules/estates/engines/cgt/validation.ts`
- Create: `src/modules/estates/engines/cgt/calculation.ts`
- Create: `src/modules/estates/engines/cgt/service.ts`
- Test: `src/modules/estates/engines/cgt/calculation.test.ts`
- Test: `src/modules/estates/engines/cgt/service.test.ts`

**Step 1: Write the failing tests**
Add tests for:
- deemed disposal at date of death
- primary residence handling
- spouse rollover handling
- pre-valuation-date asset support
- warnings for missing base cost and valuation inputs

**Step 2: Run tests to verify they fail**
Run: `npm.cmd run test -- src/modules/estates/engines/cgt/calculation.test.ts src/modules/estates/engines/cgt/service.test.ts`
Expected: FAIL because the CGT-on-death engine does not exist.

**Step 3: Write minimal implementation**
Implement the CGT engine with multi-year year-pack lookup and estate-asset integration.

**Step 4: Run tests to verify they pass**
Run: `npm.cmd run test -- src/modules/estates/engines/cgt/calculation.test.ts src/modules/estates/engines/cgt/service.test.ts`
Expected: PASS

### Task 6: Build the estate-duty engine

**Files:**
- Create: `src/modules/estates/engines/estate-duty/types.ts`
- Create: `src/modules/estates/engines/estate-duty/validation.ts`
- Create: `src/modules/estates/engines/estate-duty/calculation.ts`
- Create: `src/modules/estates/engines/estate-duty/service.ts`
- Test: `src/modules/estates/engines/estate-duty/calculation.test.ts`
- Test: `src/modules/estates/engines/estate-duty/service.test.ts`

**Step 1: Write the failing tests**
Add tests for:
- gross estate calculation
- section 4 deduction handling
- spouse deduction handling
- abatement application by year pack
- dependency on approved CGT/valuation outputs where required

**Step 2: Run tests to verify they fail**
Run: `npm.cmd run test -- src/modules/estates/engines/estate-duty/calculation.test.ts src/modules/estates/engines/estate-duty/service.test.ts`
Expected: FAIL because the estate-duty engine does not exist.

**Step 3: Write minimal implementation**
Implement estate-duty schedules and dutiable-estate calculations against the shared engine-run model.

**Step 4: Run tests to verify they pass**
Run: `npm.cmd run test -- src/modules/estates/engines/estate-duty/calculation.test.ts src/modules/estates/engines/estate-duty/service.test.ts`
Expected: PASS

### Task 7: Build the post-death IT-AE engine

**Files:**
- Create: `src/modules/estates/engines/post-death/types.ts`
- Create: `src/modules/estates/engines/post-death/validation.ts`
- Create: `src/modules/estates/engines/post-death/calculation.ts`
- Create: `src/modules/estates/engines/post-death/service.ts`
- Test: `src/modules/estates/engines/post-death/calculation.test.ts`
- Test: `src/modules/estates/engines/post-death/service.test.ts`

**Step 1: Write the failing tests**
Add tests for:
- estate-income taxation by approved year pack
- trust-rate or estate-rate handling as configured
- deduction handling
- warning generation for missing post-death income schedules

**Step 2: Run tests to verify they fail**
Run: `npm.cmd run test -- src/modules/estates/engines/post-death/calculation.test.ts src/modules/estates/engines/post-death/service.test.ts`
Expected: FAIL because the IT-AE engine does not exist.

**Step 3: Write minimal implementation**
Build the post-death calculation engine and persist its results through the shared engine-run service.

**Step 4: Run tests to verify they pass**
Run: `npm.cmd run test -- src/modules/estates/engines/post-death/calculation.test.ts src/modules/estates/engines/post-death/service.test.ts`
Expected: PASS

### Task 8: Build formal SARS/Master output generation

**Files:**
- Create: `src/modules/estates/forms/types.ts`
- Create: `src/modules/estates/forms/service.ts`
- Create: `src/modules/estates/forms/field-mapper.ts`
- Create: `src/components/reports/estates/estate-duty-rev267.tsx`
- Create: `src/components/reports/estates/pre-death-summary.tsx`
- Create: `src/components/reports/estates/post-death-summary.tsx`
- Create: `src/components/reports/estates/valuation-report.tsx`
- Create: `src/app/api/reports/estates/[estateId]/filing-pack/route.ts`
- Test: `src/modules/estates/forms/service.test.ts`
- Test: `src/components/reports/estates/field-mapping.test.tsx`

**Step 1: Write the failing tests**
Add tests for:
- selecting the correct year-pack form template version
- mapping engine output fields into formal output structures
- blocking generation when required upstream runs are draft or missing
- generating a filing-pack manifest with all expected artifacts

**Step 2: Run tests to verify they fail**
Run: `npm.cmd run test -- src/modules/estates/forms/service.test.ts src/components/reports/estates/field-mapping.test.tsx`
Expected: FAIL because the estate formal-output layer does not exist.

**Step 3: Write minimal implementation**
Create the formal-output service and filing-pack route using the current report-component and route patterns.

**Step 4: Run tests to verify they pass**
Run: `npm.cmd run test -- src/modules/estates/forms/service.test.ts src/components/reports/estates/field-mapping.test.tsx`
Expected: PASS

### Task 9: Add Phase 2 estate pages and staff workflows

**Files:**
- Create: `src/app/(protected)/estates/[estateId]/valuation/page.tsx`
- Create: `src/app/(protected)/estates/[estateId]/tax/pre-death/page.tsx`
- Create: `src/app/(protected)/estates/[estateId]/tax/cgt/page.tsx`
- Create: `src/app/(protected)/estates/[estateId]/tax/estate-duty/page.tsx`
- Create: `src/app/(protected)/estates/[estateId]/tax/post-death/page.tsx`
- Create: `src/app/(protected)/estates/[estateId]/filing-pack/page.tsx`
- Create: `src/components/estates/phase2/estate-tax-nav.tsx`
- Create: `src/components/estates/phase2/engine-review-panel.tsx`
- Create: `src/components/estates/phase2/filing-pack-status.tsx`
- Test: `src/components/estates/phase2/estate-tax-workspaces.test.tsx`

**Step 1: Write the failing tests**
Add tests for:
- Phase 2 route navigation from an estate
- dependency-state visibility in each workspace
- approval status rendering
- filing-pack readiness status

**Step 2: Run tests to verify they fail**
Run: `npm.cmd run test -- src/components/estates/phase2/estate-tax-workspaces.test.tsx`
Expected: FAIL because the Phase 2 pages and components do not exist.

**Step 3: Write minimal implementation**
Add the estate Phase 2 pages and reuse the current estate-shell navigation patterns.

**Step 4: Run tests to verify they pass**
Run: `npm.cmd run test -- src/components/estates/phase2/estate-tax-workspaces.test.tsx`
Expected: PASS

### Task 10: Add full-pack integration, audit, and reproducibility checks

**Files:**
- Modify: `src/modules/audit/audit-writer.ts`
- Modify: `src/modules/documents/document-service.ts`
- Create: `src/modules/estates/engines/reproducibility.test.ts`
- Create: `src/modules/estates/forms/filing-pack.integration.test.ts`

**Step 1: Write the failing tests**
Add tests for:
- preserving historic results when newer year packs are added
- recording audit events for engine approvals and filing-pack generation
- assembling a full filing pack only from approved engine runs

**Step 2: Run tests to verify they fail**
Run: `npm.cmd run test -- src/modules/estates/engines/reproducibility.test.ts src/modules/estates/forms/filing-pack.integration.test.ts`
Expected: FAIL because the reproducibility and filing-pack integration behaviors do not exist yet.

**Step 3: Write minimal implementation**
Wire audit and document-service integration into the engine and filing-pack workflow.

**Step 4: Run tests to verify they pass**
Run: `npm.cmd run test -- src/modules/estates/engines/reproducibility.test.ts src/modules/estates/forms/filing-pack.integration.test.ts`
Expected: PASS

### Task 11: Verify the full Phase 2 slice and refresh desktop runtime

**Files:**
- Review: `src/modules/estates/**/*.ts`
- Review: `src/components/estates/**/*.tsx`
- Review: `src/components/reports/estates/**/*.tsx`
- Review: `src/app/(protected)/estates/**/*.tsx`
- Review: `src/app/api/reports/estates/**/*.ts`
- Review: `prisma/schema.prisma`

**Step 1: Run the focused Phase 2 engine suite**
Run: `npm.cmd run test -- src/modules/estates/year-packs/validation.test.ts src/modules/estates/year-packs/service.test.ts src/modules/estates/engines/service.test.ts src/modules/estates/engines/valuation/calculation.test.ts src/modules/estates/engines/valuation/service.test.ts src/modules/estates/engines/pre-death/service.test.ts src/modules/estates/engines/cgt/calculation.test.ts src/modules/estates/engines/cgt/service.test.ts src/modules/estates/engines/estate-duty/calculation.test.ts src/modules/estates/engines/estate-duty/service.test.ts src/modules/estates/engines/post-death/calculation.test.ts src/modules/estates/engines/post-death/service.test.ts src/modules/estates/forms/service.test.ts src/components/reports/estates/field-mapping.test.tsx src/components/estates/phase2/estate-tax-workspaces.test.tsx src/modules/estates/engines/reproducibility.test.ts src/modules/estates/forms/filing-pack.integration.test.ts`
Expected: PASS

**Step 2: Run the broader estates and desktop verification**
Run: `npm.cmd run test -- src/modules/estates/**/*.test.ts src/components/estates/**/*.test.tsx src/components/reports/estates/**/*.test.tsx src/desktop/prepare-standalone.test.ts src/desktop/standalone-sync.test.ts`
Expected: PASS

**Step 3: Run lint**
Run: `npm.cmd run lint`
Expected: PASS

**Step 4: Run production build**
Run: `npm.cmd run build`
Expected: PASS

**Step 5: Refresh desktop runtime**
Run: `node desktop/prepare-standalone.cjs`
Expected: PASS with standalone assets refreshed into `dist/desktop-refresh`.
