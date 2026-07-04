# Deferred Items — Phase 04 (Import Pipeline)

Out-of-scope discoveries logged during execution. Not fixed per SCOPE BOUNDARY (pre-existing,
unrelated to the current task's changes).

## 1. `next build --webpack` fails on a pre-existing, unrelated route export

**Found during:** 04-01, Task 3 (worker bundling spike)

**Issue:** `npx next build --webpack` exits 1 with `Failed to compile.` at the TypeScript-checking
step:

```
.next/types/app/api/reports/estates/[estateId]/filing-pack/route.ts:14:13
Type error: Type 'OmitWithTag<typeof import(".../filing-pack/route"), ...>' does not satisfy the
constraint '{ [x: string]: never; }'.
  Property 'sanitizeSegment' is incompatible with index signature.
```

`src/app/api/reports/estates/[estateId]/filing-pack/route.ts` exports a plain helper function
(`export function sanitizeSegment(...)`) alongside its route handlers. Next.js's generated
route-type validation (which runs during `next build`) rejects non-standard exports from a
`route.ts` file. This is a Phase-unrelated, Estates-module (prior phase) issue.

**Reproduction/isolation performed:**
- Reproduces identically with zero Phase 4 files present (confirmed via a baseline run with the
  worker-spike files entirely removed) — proves it is not caused by this phase's work.
- Reproduces identically regardless of the worker-spike page/worker files being present or
  absent.
- Does NOT occur under `npx next build` (Turbopack, the project's actual `npm run build` command)
  — only under the `--webpack` flag's stricter/differently-ordered TypeScript check.
- Diagnostic-only local patch (temporarily changing `export function sanitizeSegment` to
  `function sanitizeSegment`, not committed, reverted immediately via `git checkout`) made the
  identical `next build --webpack` run pass cleanly (exit 0, zero "Failed to compile"), confirming
  the worker-bundling code itself is not implicated.

**Not fixed:** Out of scope for Phase 04 / the import pipeline. `npm run build` (the project's
actual production build command) uses Turbopack, not `--webpack`, and is unaffected.

**Suggested fix (for whichever phase owns `filing-pack/route.ts`):** rename `sanitizeSegment` to
a non-exported (or relocate it to a shared helper module outside any `route.ts` file), or mark it
in a way Next's route-export validation accepts.

**Files:** `src/app/api/reports/estates/[estateId]/filing-pack/route.ts` (line 67)
