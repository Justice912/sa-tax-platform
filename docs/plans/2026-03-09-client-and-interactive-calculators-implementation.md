# Client Creation + Interactive Calculators Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver client creation and interactive calculator workflows that persist saved assessments/runs.

**Architecture:** Extend existing service/repository modules with create/save methods; add server-action forms in protected routes; reuse existing calculation engines and result format screens.

**Tech Stack:** Next.js App Router server actions, TypeScript, Prisma, Zod, Vitest.

---

### Task 1: Add failing tests for new write flows

**Files:**
- Create/Modify tests for:
  - client creation validation/service behavior
  - individual tax assessment creation mapping and persistence
  - ITR12 save-and-reload input behavior

### Task 2: Implement module/service write capabilities

**Files:**
- Modify `src/modules/clients/client-service.ts`
- Modify `src/modules/individual-tax/repository.ts`
- Modify `src/modules/individual-tax/service.ts`
- Modify `src/modules/itr12/repository.ts`
- Modify `src/modules/itr12/itr12-service.ts`

### Task 3: Add interactive pages/forms

**Files:**
- Modify `src/app/(protected)/clients/page.tsx`
- Create `src/app/(protected)/clients/new/page.tsx`
- Modify `src/app/(protected)/individual-tax/page.tsx`
- Create `src/app/(protected)/individual-tax/new/page.tsx`
- Modify `src/app/(protected)/itr12/[caseId]/calculation/page.tsx`

### Task 4: Verification

Run:
- `npm run lint`
- `npm run test`
- `npm run build`

