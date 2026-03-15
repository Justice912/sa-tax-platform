# Near-eFiling Individual Tax Calculator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current scaffolded individual tax calculator with a multi-year, near-eFiling pre-submission estimate engine for 2024-2027 that supports employment, travel, medical, interest, rental income, and sole proprietor income.

**Architecture:** Introduce year-specific SARS rule packs and a structured taxpayer/schedule input model, then calculate results through modular schedules merged by a single assessment engine. Persist richer estimate inputs and outputs so users can save, edit, and discuss a client estimate before SARS eFiling submission, while keeping the existing ITA34 print work separate from the estimate worksheet flow.

**Tech Stack:** Next.js App Router, TypeScript, React server actions, Prisma, Zod, Vitest, Playwright, Electron desktop runtime.

---

### Task 1: Define the new individual-tax domain model

**Files:**
- Modify: `src/modules/individual-tax/types.ts`
- Modify: `src/modules/shared/types.ts`
- Modify: `src/modules/individual-tax/validation.ts`
- Test: `src/modules/individual-tax/validation.test.ts`

**Step 1: Write the failing test**
Add validation tests for the new structured input shape:
- taxpayer profile fields (`assessmentYear`, `dateOfBirth`, `maritalStatus`, `medicalAidMembers`, `medicalAidMonths`)
- employment schedule
- travel schedule
- medical schedule
- interest schedule
- rental schedule
- sole proprietor schedule

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/modules/individual-tax/validation.test.ts`
Expected: FAIL because the current schema only supports the narrow scaffold fields and manual `effectiveTaxRate`.

**Step 3: Write minimal implementation**
Update the domain types and Zod schemas so the calculator accepts a structured multi-schedule estimate input instead of the current flat scaffold shape.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/modules/individual-tax/validation.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/modules/individual-tax/types.ts src/modules/shared/types.ts src/modules/individual-tax/validation.ts src/modules/individual-tax/validation.test.ts
git commit -m "feat: define near-efiling individual tax input model"
```

### Task 2: Add year-specific SARS rule packs for 2024-2027

**Files:**
- Create: `src/modules/individual-tax/rules-2024.ts`
- Create: `src/modules/individual-tax/rules-2025.ts`
- Modify: `src/modules/individual-tax/rules-2026.ts`
- Create: `src/modules/individual-tax/rules-2027.ts`
- Create: `src/modules/individual-tax/rulepack-registry.ts`
- Create: `src/modules/individual-tax/rulepack.test.ts`

**Step 1: Write the failing test**
Add tests asserting the registry returns the correct rule pack for `2024`, `2025`, `2026`, and `2027`, and that required year fields exist for tax brackets, rebates, thresholds, interest exemption, medical credits, and retirement limits.

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/modules/individual-tax/rulepack.test.ts`
Expected: FAIL because only the current 2026 scaffold rule file exists.

**Step 3: Write minimal implementation**
Create explicit year rule-pack files and a registry lookup so the calculation engine can resolve the correct rules from the assessment year.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/modules/individual-tax/rulepack.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/modules/individual-tax/rules-2024.ts src/modules/individual-tax/rules-2025.ts src/modules/individual-tax/rules-2026.ts src/modules/individual-tax/rules-2027.ts src/modules/individual-tax/rulepack-registry.ts src/modules/individual-tax/rulepack.test.ts
git commit -m "feat: add 2024 to 2027 individual tax rule packs"
```

### Task 3: Build modular schedule calculators

**Files:**
- Create: `src/modules/individual-tax/schedules/employment-schedule.ts`
- Create: `src/modules/individual-tax/schedules/travel-schedule.ts`
- Create: `src/modules/individual-tax/schedules/medical-schedule.ts`
- Create: `src/modules/individual-tax/schedules/interest-schedule.ts`
- Create: `src/modules/individual-tax/schedules/rental-schedule.ts`
- Create: `src/modules/individual-tax/schedules/sole-proprietor-schedule.ts`
- Create: `src/modules/individual-tax/schedules/schedules.test.ts`

**Step 1: Write the failing test**
Add schedule-level tests for:
- employment/PAYE treatment
- travel allowance and claim logic
- medical aid credit calculation and out-of-pocket medical treatment
- interest exemption handling by year
- rental net income calculation
- sole proprietor net income calculation

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/modules/individual-tax/schedules/schedules.test.ts`
Expected: FAIL because the schedule modules do not exist.

**Step 3: Write minimal implementation**
Implement each schedule as a focused module that returns:
- assessed amount contributions
- line items
- warnings when key inputs are incomplete

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/modules/individual-tax/schedules/schedules.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/modules/individual-tax/schedules src/modules/individual-tax/schedules/schedules.test.ts
git commit -m "feat: add modular individual tax schedules"
```

### Task 4: Replace the scaffold calculation engine with the near-eFiling aggregator

**Files:**
- Modify: `src/modules/individual-tax/calculation-service.ts`
- Modify: `src/modules/individual-tax/calculation-service.test.ts`
- Review: `src/modules/individual-tax/types.ts`
- Review: `src/modules/individual-tax/rulepack-registry.ts`
- Review: `src/modules/individual-tax/schedules/*.ts`

**Step 1: Write the failing test**
Replace the old manual-rate tests with scenario-based tests for:
- salary-only taxpayer
- salary plus travel
- salary plus medical out-of-pocket expenses
- salary plus rental income
- salary plus sole proprietor income
- combined complex case

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/modules/individual-tax/calculation-service.test.ts`
Expected: FAIL because the current engine depends on `effectiveTaxRate` and does not support the new schedules.

**Step 3: Write minimal implementation**
Refactor the calculator to:
- resolve the correct year rule pack
- derive taxpayer age and rebate eligibility
- merge schedule outputs into taxable income
- apply year-specific brackets, rebates, thresholds, medical credits, and offsets
- return line-by-line estimate details and review warnings

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/modules/individual-tax/calculation-service.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/modules/individual-tax/calculation-service.ts src/modules/individual-tax/calculation-service.test.ts
git commit -m "feat: add near-efiling individual tax calculation engine"
```

### Task 5: Evolve persistence for structured estimate inputs

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/modules/individual-tax/repository.ts`
- Modify: `src/modules/individual-tax/service.ts`
- Modify: `src/server/demo-data.ts`
- Modify: `src/modules/individual-tax/service-interactive.test.ts`
- Modify: `src/modules/individual-tax/service-update.test.ts`
- Modify: `src/modules/individual-tax/service-client-list.test.ts`

**Step 1: Write the failing test**
Add service/repository tests proving the app can save, reload, and update the richer structured estimate payload for a client assessment.

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/modules/individual-tax/service-interactive.test.ts src/modules/individual-tax/service-update.test.ts src/modules/individual-tax/service-client-list.test.ts`
Expected: FAIL because the repository currently persists a small flat set of numeric fields only.

**Step 3: Write minimal implementation**
Add structured estimate storage to the assessment model and repository mapping. Prefer a JSON snapshot approach for complex schedule inputs plus derived summary fields needed for list and detail views.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/modules/individual-tax/service-interactive.test.ts src/modules/individual-tax/service-update.test.ts src/modules/individual-tax/service-client-list.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add prisma/schema.prisma src/modules/individual-tax/repository.ts src/modules/individual-tax/service.ts src/server/demo-data.ts src/modules/individual-tax/service-interactive.test.ts src/modules/individual-tax/service-update.test.ts src/modules/individual-tax/service-client-list.test.ts
git commit -m "feat: persist structured individual tax estimates"
```

### Task 6: Build the guided multi-step estimate UI

**Files:**
- Create: `src/components/individual-tax/estimate-wizard.tsx`
- Create: `src/components/individual-tax/estimate-result.tsx`
- Create: `src/components/individual-tax/estimate-wizard.test.tsx`
- Modify: `src/app/(protected)/individual-tax/new/page.tsx`
- Modify: `src/app/(protected)/individual-tax/[assessmentId]/edit/page.tsx`
- Modify: `src/app/(protected)/individual-tax/[assessmentId]/page.tsx`

**Step 1: Write the failing test**
Add component tests for:
- step navigation
- profile and schedule sections
- conditional fields for travel, medical, rental, and sole proprietor data
- rendering of estimate warnings and result summary

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/components/individual-tax/estimate-wizard.test.tsx`
Expected: FAIL because the current UI is still a flat scaffold form.

**Step 3: Write minimal implementation**
Create the multi-step calculator UI, replace the current new/edit form layout, and render a saved estimate worksheet view on the assessment detail page.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/components/individual-tax/estimate-wizard.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/components/individual-tax/estimate-wizard.tsx src/components/individual-tax/estimate-result.tsx src/components/individual-tax/estimate-wizard.test.tsx src/app/(protected)/individual-tax/new/page.tsx src/app/(protected)/individual-tax/[assessmentId]/edit/page.tsx src/app/(protected)/individual-tax/[assessmentId]/page.tsx
git commit -m "feat: add guided near-efiling estimate workflow"
```

### Task 7: Update report transformation and labels for estimate-first behavior

**Files:**
- Modify: `src/modules/individual-tax/report-transformer.ts`
- Modify: `src/modules/individual-tax/report-transformer.test.ts`
- Modify: `src/app/(protected)/individual-tax/page.tsx`

**Step 1: Write the failing test**
Add assertions that saved assessments expose estimate-oriented summary data and warnings appropriate for pre-submission client discussions.

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/modules/individual-tax/report-transformer.test.ts`
Expected: FAIL because the report layer still assumes the older scaffold result structure.

**Step 3: Write minimal implementation**
Adapt the transformer and list/detail labels so the module reads as a pre-submission estimate workflow while leaving the separate ITA34 print route available for its existing use.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/modules/individual-tax/report-transformer.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/modules/individual-tax/report-transformer.ts src/modules/individual-tax/report-transformer.test.ts src/app/(protected)/individual-tax/page.tsx
git commit -m "chore: align individual tax module with estimate workflow"
```

### Task 8: Full verification

**Files:**
- Review: `src/modules/individual-tax/**/*.ts`
- Review: `src/app/(protected)/individual-tax/**/*.tsx`
- Review: `src/components/individual-tax/**/*.tsx`
- Review: `prisma/schema.prisma`

**Step 1: Run targeted individual-tax tests**
Run: `npm.cmd run test -- src/modules/individual-tax/calculation-service.test.ts src/modules/individual-tax/validation.test.ts src/modules/individual-tax/report-transformer.test.ts src/modules/individual-tax/service-interactive.test.ts src/modules/individual-tax/service-update.test.ts src/components/individual-tax/estimate-wizard.test.tsx src/modules/individual-tax/rulepack.test.ts src/modules/individual-tax/schedules/schedules.test.ts`
Expected: PASS

**Step 2: Run full unit suite**
Run: `npm.cmd run test`
Expected: PASS

**Step 3: Run lint**
Run: `npm.cmd run lint`
Expected: PASS

**Step 4: Run production build**
Run: `npm.cmd run build`
Expected: PASS

**Step 5: Commit**
```bash
git add prisma/schema.prisma src/modules/individual-tax src/components/individual-tax src/app/(protected)/individual-tax
git commit -m "feat: add near-efiling individual tax estimator"
```
