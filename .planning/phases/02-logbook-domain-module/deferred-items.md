# Deferred Items — Phase 02 Logbook Domain Module

Items discovered during execution that are out of scope for the current plan (per executor deviation rules: pre-existing failures unrelated to current task's changes are logged here, not fixed).

## From Plan 02-01

**1. `npx tsc --noEmit` reports 251 pre-existing errors in unrelated `*.test.ts` files, caused by a tsconfig gap for Vitest globals**

- **Found during:** Task 3 verification (`npx tsc --noEmit`)
- **Files affected:** `src/modules/individual-tax/service-interactive.test.ts`, `src/modules/individual-tax/service-update.test.ts`, `src/modules/itr12/itr12-service-interactive.test.ts`, `src/server/golden-demo/restore.test.ts`, and others that call `describe`/`it`/`expect` as ambient globals without importing them from `vitest`.
- **Symptom:** `error TS2304: Cannot find name 'expect'.` / `error TS2582: Cannot find name 'describe'/'it'. Do you need to install type definitions for a test runner?`
- **Likely cause:** `tsconfig.json` has no `types: ["vitest/globals"]` entry even though `vitest.config.ts` sets `test.globals: true`. Vitest injects the globals at runtime (so `npx vitest run` passes cleanly — confirmed: 70 files / 267 tests all green), but the standalone `tsc --noEmit` project check has no ambient type declaration for them in files that don't explicitly `import { describe, it, expect } from "vitest"`.
- **Confirmed unrelated to this plan's change:** Zero of the 251 errors are in `src/modules/logbook/`. This plan's own `validation.test.ts` explicitly imports `describe, expect, it` from `"vitest"` (matching the convention already used in `src/modules/individual-tax/validation.test.ts`) and compiles with zero errors.
- **Action:** Not fixed (out of scope — pre-existing tsconfig gap affecting files this plan does not touch). Recommend adding `"types": ["vitest/globals"]` to `tsconfig.json` `compilerOptions` in a dedicated config-hygiene task, not as part of a feature plan.
