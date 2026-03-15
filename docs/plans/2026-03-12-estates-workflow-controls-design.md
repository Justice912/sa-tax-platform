# Estates Workflow Controls Design

## Goal
Add the missing operational controls to the deceased estates module so staff can progress an estate through its workflow, maintain checklist readiness, and manage executor read-only access from the estate workspace.

## Approved Scope
- Add stage advancement controls to the estate dashboard.
- Show workflow blocking messages when an estate is not ready for the next stage.
- Add checklist status update controls on the estate documents page.
- Add executor access issue and revoke controls for staff.
- Preserve the existing token-based executor read-only route for phase 1.

## Architecture Decisions
- Keep estate workflow rules in the existing `src/modules/estates` service and validation layer.
- Add focused repository methods for checklist status updates and executor access status changes instead of overloading existing create methods.
- Use route-local server actions for staff-triggered estate updates so the pages keep the current Next.js App Router pattern.
- Reuse the current dashboard and estate-documents components rather than introducing new estate management pages.

## UX
- Estate dashboard gets a workflow control card with:
  - next-stage readiness state
  - stage advance action
  - blocking reason display when prerequisites are missing
- Estate dashboard gets an executor access card with:
  - active access details when a token exists
  - issue-access form when none exists
  - revoke control for active access
- Estate documents page gets row-level checklist status selectors for staff.

## Validation and Safety
- Stage advancement continues to rely on `validateEstateStageAdvance`.
- Checklist updates are restricted to valid estate checklist statuses.
- Revoked executor access must immediately stop access via the token route.
- Executor serialization remains read-only and excludes staff-only notes and internal commentary.

## Testing
- Add service tests for checklist updates and executor access revocation.
- Add component tests for workflow readiness messaging and checklist/executor control rendering.
- Verify with targeted estate tests, then full `lint` and `build`.
