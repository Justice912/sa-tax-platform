# ITA34 Print Layout Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a print-only SARS-style ITA34 assessment output for individual tax assessments without changing any existing tax calculation logic or persistence.

**Architecture:** Build a richer individual-tax report view model that combines real assessment data, derived calculation totals, linked client address data, and deterministic fabricated metadata for missing SARS-style fields. Render that view model through a dedicated print-focused ITA34 component on the existing print route while preserving the current operational detail and input pages.

**Tech Stack:** Next.js App Router, TypeScript, React server components, Vitest, existing individual-tax services.

---

### Task 1: Expand report transformation coverage with failing tests

**Files:**
- Modify: `src/modules/individual-tax/report-transformer.test.ts`
- Review: `src/modules/individual-tax/report-transformer.ts`
- Review: `src/modules/individual-tax/types.ts`

**Step 1: Write the failing test**
Add assertions that the transformed report now includes:
- SARS header metadata fields
- balance of account outcome
- compliance information rows
- assessment summary rows
- grouped income and deduction sections
- tax calculation breakdown rows
- notes rows
- deterministic fabricated values for repeated renders

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/modules/individual-tax/report-transformer.test.ts`
Expected: FAIL because the current report shape only exposes simple sections and branding.

**Step 3: Write minimal implementation**
Extend `buildIndividualTaxReport` and supporting types just enough to satisfy the new report contract while keeping current totals unchanged.

**Step 4: Run test to verify it passes**
Run: `npm run test -- src/modules/individual-tax/report-transformer.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/modules/individual-tax/report-transformer.test.ts src/modules/individual-tax/report-transformer.ts src/modules/individual-tax/types.ts
git commit -m "test: cover ita34 report transformation"
```

### Task 2: Add client-aware report data for the print header

**Files:**
- Modify: `src/modules/individual-tax/service.ts`
- Review: `src/modules/clients/client-service.ts`
- Review: `src/modules/shared/types.ts`

**Step 1: Write the failing test**
Add or extend a service-level test proving `getIndividualTaxReportData` returns linked client header data needed for the ITA34 print output.

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/modules/individual-tax/service-client-list.test.ts`
Expected: FAIL because linked client address/header data is not currently part of the report payload.

**Step 3: Write minimal implementation**
Update `getIndividualTaxReportData` to fetch the linked client when available and pass it into the report transformer in a minimal, display-ready shape.

**Step 4: Run test to verify it passes**
Run: `npm run test -- src/modules/individual-tax/service-client-list.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/modules/individual-tax/service.ts src/modules/individual-tax/service-client-list.test.ts
git commit -m "feat: expose client header data for ita34 print"
```

### Task 3: Build a reusable ITA34 print component

**Files:**
- Create: `src/components/reports/individual-tax-ita34.tsx`
- Create: `src/components/reports/individual-tax-ita34.test.tsx`
- Review: `src/components/ui/card.tsx`

**Step 1: Write the failing test**
Create a component test that renders the ITA34 component with mock report data and asserts:
- SARS blue banner content
- requested section headings
- print button label
- payable/refundable wording
- note box text

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/components/reports/individual-tax-ita34.test.tsx`
Expected: FAIL because the component does not exist.

**Step 3: Write minimal implementation**
Create the dedicated ITA34 component with:
- header banner
- taxpayer/details/note layout
- section tables
- screen-only print button
- print-safe class names and inline styles or module-local style block usage compatible with the existing print route

**Step 4: Run test to verify it passes**
Run: `npm run test -- src/components/reports/individual-tax-ita34.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/components/reports/individual-tax-ita34.tsx src/components/reports/individual-tax-ita34.test.tsx
git commit -m "feat: add ita34 print component"
```

### Task 4: Replace the print route with the ITA34 renderer

**Files:**
- Modify: `src/app/reports/individual-tax/[assessmentId]/print/page.tsx`
- Review: `src/modules/individual-tax/service.ts`
- Review: `src/modules/individual-tax/report-transformer.ts`

**Step 1: Write the failing test**
Add or extend a route-level render test, or if route testing is too heavy, add a focused integration test around the page-level rendering contract via the component test data shape.

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/components/reports/individual-tax-ita34.test.tsx`
Expected: FAIL until the print route is wired to the new report/component contract.

**Step 3: Write minimal implementation**
Refactor the print route so it:
- loads enriched report data
- renders the ITA34 component
- keeps server-side rendering intact
- uses print CSS for A4 layout, blue headers, borders, hidden controls, and page breaks

**Step 4: Run test to verify it passes**
Run: `npm run test -- src/components/reports/individual-tax-ita34.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/app/reports/individual-tax/[assessmentId]/print/page.tsx
git commit -m "feat: render ita34 print route"
```

### Task 5: Polish the assessment detail actions without changing business logic

**Files:**
- Modify: `src/app/(protected)/individual-tax/[assessmentId]/page.tsx`

**Step 1: Write the failing test**
If practical, add a light render test for action labels; otherwise capture this in manual verification notes.

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/components/reports/individual-tax-ita34.test.tsx`
Expected: Existing labels or affordances do not yet emphasize the ITA34 print route.

**Step 3: Write minimal implementation**
Adjust labels so the user clearly sees the print route as the official ITA34 output while keeping edit input and PDF actions available.

**Step 4: Run test to verify it passes**
Run: `npm run test -- src/components/reports/individual-tax-ita34.test.tsx`
Expected: PASS or manual verification complete.

**Step 5: Commit**
```bash
git add src/app/(protected)/individual-tax/[assessmentId]/page.tsx
git commit -m "chore: align assessment actions with ita34 output"
```

### Task 6: Full verification

**Files:**
- Review: `src/app/reports/individual-tax/[assessmentId]/print/page.tsx`
- Review: `src/components/reports/individual-tax-ita34.tsx`
- Review: `src/modules/individual-tax/report-transformer.ts`

**Step 1: Run targeted tests**
Run: `npm run test -- src/modules/individual-tax/report-transformer.test.ts src/components/reports/individual-tax-ita34.test.tsx src/modules/individual-tax/service-client-list.test.ts`
Expected: PASS

**Step 2: Run full unit suite**
Run: `npm run test`
Expected: PASS

**Step 3: Run lint**
Run: `npm run lint`
Expected: PASS

**Step 4: Run production build**
Run: `npm run build`
Expected: PASS

**Step 5: Commit**
```bash
git add src/app/reports/individual-tax/[assessmentId]/print/page.tsx src/components/reports/individual-tax-ita34.tsx src/modules/individual-tax/report-transformer.ts src/modules/individual-tax/types.ts src/app/(protected)/individual-tax/[assessmentId]/page.tsx
git commit -m "feat: redesign individual tax print output as ita34"
```
