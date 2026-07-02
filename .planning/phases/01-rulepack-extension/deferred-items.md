# Deferred Items — Phase 01 Rulepack Extension

Items discovered during execution that are out of scope for the current plan (per executor deviation rules: pre-existing failures unrelated to current task's changes are logged here, not fixed).

## From Plan 01-02

**1. Full-suite `npm run test` intermittently reports 3 failing test files due to vitest worker-pool timeouts, not assertion failures**

- **Found during:** Task 1 verification (full `npm run test` run)
- **Files affected:** `src/modules/clients/client-service.test.ts`, `src/modules/estates/engines/post-death/calculation.test.ts`, `src/desktop/golden-demo-bundle.test.ts`
- **Symptom:** `[vitest-pool]: Failed to start forks worker for test files ... Caused by: Error: [vitest-pool-runner]: Timeout waiting for worker to respond`
- **Likely cause:** Resource contention — another agent was concurrently executing plan 01-03 in the same working tree/machine at the time, competing for CPU/memory during test worker startup. Not a code defect in these files.
- **Confirmed unrelated to this plan's change:** Ran `rulepack-completeness.test.ts` and `rulepack.test.ts` in isolation — both pass cleanly (21/21 tests, no errors).
- **Action:** Not fixed (out of scope — unrelated files, pre-existing test infra issue, not caused by this plan's changes). Recommend re-running full `npm run test` once no concurrent agents are active on this machine to confirm these 3 files pass in isolation before treating this as a real regression.

## From Plan 01-03

**2. Full-suite `npm run test` reports vitest worker-pool timeouts on unrelated estate/individual-tax test files**

- **Found during:** Task 3 verification (full `npm run test` run)
- **Files affected:** `src/app/(protected)/estates/[estateId]/valuation/page.test.tsx`, `src/modules/estates/engines/pre-death/service.test.ts`, `src/modules/individual-tax/service-interactive.test.ts`, `src/modules/individual-tax/service-update.test.ts`, `src/modules/individual-tax/calculation-service.test.ts`, `src/modules/estates/service.test.ts`
- **Symptom:** `[vitest-pool]: Failed to start forks worker for test files ... Caused by: Error: [vitest-pool-runner]: Timeout waiting for worker to respond`; also one flaky timeout in `src/app/api/reports/estates/[estateId]/filing-pack/route.test.ts` ("stores business valuation reports as Word documents when the artifact format is docx" / "can generate a single filing-pack artifact with a local file path for desktop actions").
- **Likely cause:** Resource contention — another agent was concurrently executing plan 01-02 (creating `rulepack-completeness.test.ts`) on the same machine, competing for CPU/memory during vitest worker startup.
- **Confirmed unrelated to this plan's change:** Ran `src/modules/individual-tax/service-interactive.test.ts` and `service-update.test.ts` in isolation (via `git stash` to baseline against pre-plan HEAD) — both pass cleanly. The `filing-pack/route.test.ts` timeout also reproduces identically on the pre-plan baseline (confirmed via stash), proving it is pre-existing flakiness, not a regression introduced by tax-tools.tsx changes.
- **Action:** Not fixed (out of scope — unrelated files, pre-existing test infra issue, not caused by this plan's changes). tax-tools.tsx itself has no dedicated test file affected by this; `npx tsc --noEmit` shows zero errors attributable to tax-tools.tsx.

**3. `npm run build` fails TypeScript checking on a pre-existing `middleware.ts` type error, unrelated to this plan**

- **Found during:** Task 3 verification (`npm run build`)
- **File affected:** `middleware.ts:45` — `Argument of type 'ExtendedRole | undefined' is not assignable to parameter of type 'RoleCode | undefined'. Type "EXECUTOR" is not assignable to type 'RoleCode | undefined'.`
- **Confirmed pre-existing:** `middleware.ts` was last modified in commit `cd84690` ("Add lower-priority features: auto-flagging, RBAC executor, browser pool"), well before phase 01 began; this plan does not touch `middleware.ts`. The Next.js compile step itself succeeds ("Compiled successfully in 42s") — only the subsequent standalone TypeScript project check fails, and only on this unrelated file.
- **Action:** Not fixed (out of scope — pre-existing RBAC role-type mismatch unrelated to individual-tax/rulepack work). `npx tsc --noEmit` confirms zero errors in `src/components/individual-tax/tax-tools.tsx`; Turbopack's own compile step for the app succeeded, confirming tax-tools.tsx itself is production-buildable.
