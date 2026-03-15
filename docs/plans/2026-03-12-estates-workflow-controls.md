# Estates Workflow Controls Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add estate workflow controls so staff can advance stages, update checklist readiness, and manage executor read-only access directly from the estates workspace.

**Architecture:** Extend the existing estates repository and service layer with small workflow-control mutations, then wire them into the current estate dashboard and documents screens through server actions. Keep the rules in the domain layer, surface human-readable blocking messages in the UI, and preserve the current token-based executor view.

**Tech Stack:** Next.js App Router, TypeScript, React server actions, Vitest, Testing Library, Prisma/demo-mode repository adapters, Tailwind CSS

---

### Task 1: Add failing service tests for workflow controls

**Files:**
- Modify: `src/modules/estates/service.test.ts`

**Step 1: Write the failing test**
Add tests for:
- updating an estate checklist item status
- revoking an active executor access token
- rejecting executor token reads after revocation
- advancing a stage after readiness requirements are satisfied

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/modules/estates/service.test.ts`
Expected: FAIL because checklist mutation and executor revocation do not exist yet.

**Step 3: Write minimal implementation**
Add only the service and repository support required for the new tests.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/modules/estates/service.test.ts`
Expected: PASS

### Task 2: Add failing component tests for dashboard workflow controls

**Files:**
- Modify: `src/components/estates/estate-dashboard.test.tsx`

**Step 1: Write the failing test**
Add tests covering:
- workflow readiness messaging for the next stage
- blocked-stage messaging when mandatory items are still outstanding
- executor access card rendering for active and inactive access states

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/components/estates/estate-dashboard.test.tsx`
Expected: FAIL because the dashboard does not yet show the new workflow-control content.

**Step 3: Write minimal implementation**
Update the dashboard component to render the new workflow summary and executor access panel.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/components/estates/estate-dashboard.test.tsx`
Expected: PASS

### Task 3: Add failing component tests for checklist controls

**Files:**
- Modify: `src/components/estates/estate-supporting-pages.test.tsx`

**Step 1: Write the failing test**
Add tests covering:
- checklist rows rendering a status-update control
- active checklist status labels remaining visible
- document page still showing grouped readiness and linked documents

**Step 2: Run test to verify it fails**
Run: `npm.cmd run test -- src/components/estates/estate-supporting-pages.test.tsx`
Expected: FAIL because checklist rows are display-only today.

**Step 3: Write minimal implementation**
Update the estate documents component to accept a checklist update action and render a simple status form per checklist item.

**Step 4: Run test to verify it passes**
Run: `npm.cmd run test -- src/components/estates/estate-supporting-pages.test.tsx`
Expected: PASS

### Task 4: Wire workflow controls into estate routes

**Files:**
- Modify: `src/app/(protected)/estates/[estateId]/page.tsx`
- Modify: `src/app/(protected)/estates/[estateId]/documents/page.tsx`
- Modify: `src/components/estates/estate-dashboard.tsx`
- Modify: `src/components/estates/estate-documents.tsx`
- Modify: `src/modules/estates/repository.ts`
- Modify: `src/modules/estates/service.ts`

**Step 1: Implement route-local server actions**
Add actions for:
- advancing estate stage
- issuing executor access
- revoking executor access
- updating checklist item status

**Step 2: Revalidate and redirect**
Revalidate the estate detail, documents, and executor-related pages after each mutation.

**Step 3: Keep UI scope narrow**
Show forms and messages inline on existing pages without creating new routes.

**Step 4: Run targeted tests**
Run: `npm.cmd run test -- src/modules/estates/service.test.ts src/components/estates/estate-dashboard.test.tsx src/components/estates/estate-supporting-pages.test.tsx`
Expected: PASS

### Task 5: Verify the full estates slice

**Files:**
- Review: `src/modules/estates/**/*.ts`
- Review: `src/components/estates/**/*.tsx`
- Review: `src/app/(protected)/estates/**/*.tsx`
- Review: `src/app/executor/estates/**/*.tsx`

**Step 1: Run targeted estate tests**
Run: `npm.cmd run test -- src/modules/estates/validation.test.ts src/modules/estates/service.test.ts src/modules/estates/stage-validation.test.ts src/modules/estates/liquidation.test.ts src/components/estates/estate-create-wizard.test.tsx src/components/estates/estate-dashboard.test.tsx src/components/estates/estate-registers.test.tsx src/components/estates/estate-liquidation-tracker.test.tsx src/components/estates/estate-supporting-pages.test.tsx src/components/estates/executor-estate-dashboard.test.tsx`
Expected: PASS

**Step 2: Run lint**
Run: `npm.cmd run lint`
Expected: PASS

**Step 3: Run production build**
Run: `npm.cmd run build`
Expected: PASS
