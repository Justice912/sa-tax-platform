# Session Handoff — SA Tax Platform

**Written:** 2026-07-05 (end of session)
**Resume with:** open this file, then continue the Phase 6 plan revision (see "Immediate next step" below).

---

## TL;DR — where we are

Building the SA tax platform milestone via the GSD workflow (research → plan → verify → execute per phase). **5 of 7 phases are complete, verified, committed, and deployed.** We are mid-way through **planning Phase 6** — plans are written and checker-reviewed, and a small 2-warning revision is **partially done**. Nothing in Phase 6 has been *executed* yet.

Everything through commit `e2492ce` (Phase 5 completion) is pushed to GitHub and live on Vercel. Phase 6 planning docs (`fed3d6b`, `e55f91b`, `b97521d`) are committed locally but **NOT yet pushed**.

---

## Phase status

| Phase | Status |
|-------|--------|
| 1. Rulepack Extension | ✅ Complete |
| 2. Logbook Domain Module | ✅ Complete |
| 3. ITR12 Travel Schedule Integration | ✅ Complete |
| 4. Import Pipeline | ✅ Complete |
| 5. Component Decomposition | ✅ Complete |
| 6. Logbook UI, Import Wizard & Perf Hardening | ⏳ **Planned (revision in progress), not executed** |
| 7. Calculator Audit | ⬜ Not started |

Baseline health as of last run: **428 tests pass (84 files)**, `npm run build` (Turbopack) green.

---

## Immediate next step (do this first next session)

The Phase 6 plans passed the checker with **0 blockers, 2 warnings**. I started the revision but hit a session limit. State:

- ✅ **06-02 frontmatter** — DONE & committed (`b97521d`): added the PERF-03 edit-responsiveness `must_have` truth + `React.memo`'d TripRow artifact note.
- ⬜ **06-02 task body** — TODO: add an actual test **task step** in `06-02-PLAN.md` that implements the Profiler render-count proof (editing one trip among 10,000 re-renders only the bounded visible window; no sibling re-render). Precedent pattern: `src/components/individual-tax/tax-tools/render-isolation.test.tsx` (~lines 352–387).
- ⬜ **06-06 Warning 2** — TODO (untouched): in `06-06-PLAN.md` Task 3, specify **how** the render-isolation test reaches a real state change under the new UI. The old test typed into the "Determined Value (R)" field, which 06-06 removes. Fix: mock a client + logbook via `vi.mock("@/modules/logbook/actions")` (reuse the new travel-logbook-tab integration test's pattern) to reach a real input, OR use the client-selector `<select>` change as the isolation trigger — so the "isolation preserved" must_have is verifiably tested, not vacuous against the empty state.

After those two edits: `node C:/Users/HP/.claude/get-shit-done/bin/gsd-tools.cjs verify plan-structure <file>` on both (expect `valid: true`), commit with plain git, then **execute Phase 6** via `/gsd:execute-phase 6` (or the manual orchestration below). These are minor tightenings — could also be skipped and caught by the post-execution `gsd-verifier`, but better to close them.

---

## Phase 6 plan structure (already written)

6 plans, 3 waves, in `.planning/phases/06-logbook-ui-import-wizard-performance/`:

| Wave | Plans | Builds |
|------|-------|--------|
| 1 | 06-01, 06-04, 06-05 | Foundation (install `@tanstack/react-virtual@3.14.5` + jsdom virtualization test recipe + `modules/logbook/actions.ts` Server Actions) · cost-method panel · printable audit route |
| 2 | 06-02, 06-03 | Virtualized trip table (over real `LogbookTripRecord` schema) · 5-step import wizard (wired to Phase 4 pipeline) |
| 3 | 06-06 | Keystone: rewrite `travel-logbook-tab.tsx` — client/year resolution, load logbook, trip CRUD, wire sub-components, CSV/print, summary publish; make `tools/page.tsx` async |

**Requirements:** LOG-06 (UI surface), PERF-02, PERF-03.

### Critical structural findings the plans address (from 06-RESEARCH.md — the hard parts)
1. **The Phase 5 `travel-logbook-tab.tsx` (964 lines) is a disconnected prototype**, not a thin shell: naive `.split(",")` CSV upload (must be REPLACED by the Phase 4 pipeline, not paralleled), deemed-cost only (no actual-cost UI), plain `.map()` (no virtualization).
2. **Schema mismatch (biggest risk):** current UI `Trip` type uses odometer-diff + Business/Private/Mixed classification; the real domain `LogbookTripRecord` (Phase 2) has `businessKm` direct + optional odometer, NO `tripType`/`privateKm`/`mixedSplit`. Trip capture must be REBUILT on the real schema.
3. **Zero `clientId` wiring in the route** — `TaxTools`/`page.tsx` take no props; every `service.ts` fn needs `clientId`+`assessmentYear`. Plan threads an optional `clients` prop scoped to the travel tab only (via `listClients()`, like `estimate-wizard.tsx`).
4. **`service.ts`/`repository.ts` are server-only** (`node:fs`). Client tab reaches them via a `"use server"` `actions.ts` boundary that RETURNS `{record, travelResult}` for client-side merge (NOT `revalidatePath` per-edit — too slow at 10k scale).
5. **Virtualization:** `@tanstack/react-virtual@3.14.5` (React 19 peer support confirmed). Known React-19-compiler `getVirtualItems()` caveat + workaround flagged in research.
6. **PERF-02/03 are proven via testable proxies** (jsdom can't measure real FPS): bounded-DOM-node-count, `Date.now()` time budgets, and Profiler render-count assertions — all have existing repo precedents cited.

---

## How to run a phase (the working loop)

Per-phase cycle used for phases 2–5 (all succeeded):
1. `/gsd:plan-phase N` → research (subagent) → plan (subagent) → checker (gsd-plan-checker subagent) → revision loop if needed.
2. `/gsd:execute-phase N` → wave-based parallel `gsd-executor` subagents → spot-check each wave → `gsd-verifier` subagent → `phase complete`.
3. Commit completion docs, push (triggers Vercel auto-deploy).

**Orchestration commands:**
- Init: `node C:/Users/HP/.claude/get-shit-done/bin/gsd-tools.cjs init execute-phase 6`
- Wave index: `node .../gsd-tools.cjs phase-plan-index 06`
- Mark complete: `node .../gsd-tools.cjs phase complete 6`
- Executors: subagent_type `gsd-executor`, model `sonnet`; verifier: `gsd-verifier`.

---

## ⚠️ Environment gotchas (MUST pass to every executor subagent)

These recur every phase — they're saved in memory (`gsd-tools-windows-gotchas.md`, `sa-tax-platform-build-deploy.md`) too:

1. **`gsd-tools.cjs commit` is BROKEN on this Windows/Git-Bash setup** — POSIX quote escaping dies in cmd.exe execSync; multi-word messages split into stray pathspecs (this is how the research commit became a literal `--help` — I amended it to `fed3d6b`). **Always commit with plain `git add <files> && git commit -m "..."`.** The `state`/`roadmap`/`requirements` subcommands are fine.
2. **`roadmap update-plan-progress` needs the UNPADDED phase number** (`"6"` not `"06"`) or it silently no-ops the progress-table row while reporting `updated:true`.
3. **Parallel-wave STATE.md write race:** when a wave runs 2+ executors, their `gsd-tools state` writes to `.planning/STATE.md` clobber each other (duplicate frontmatter, stale counts). Executors have self-repaired each time. Mitigation: tell each parallel executor to only `git add` its own files (never `git add -A`) and collapse any duplicate STATE.md frontmatter before its final commit.
4. **Build:** production build is `npm run build` (Turbopack) — it passes. **Do NOT gate on `next build --webpack`** — it has a KNOWN pre-existing unrelated failure (Estates route `src/app/api/reports/estates/[estateId]/filing-pack/route.ts` exports a non-route helper `sanitizeSegment`; logged in Phase 4 `deferred-items.md`). Never trust a piped `| tail` exit code for `next build` — grep output for "Failed to compile".
5. **Session limits are frequent** — executor/planner subagents have been cut off mid-task twice. Spot-check what actually committed before assuming a subagent finished. Re-runnable: `/gsd:execute-phase` skips plans that already have a SUMMARY.
6. **Watch for junk demo-data writes:** app runs during build/test sometimes write to tracked `storage/demo-*.json` (a stray "uyyyyy" client appeared once). Revert with `git checkout -- storage/demo-*.json` before committing phase work.

---

## Deploy facts

- **GitHub:** `Justice912/sa-tax-platform`, branch `master`. Push to deploy.
- **Vercel:** project `sa-tax-platform` under team `justices-projects-637fa3c1`, connected to the GitHub repo → **every push to master auto-deploys**. Live: https://sa-tax-platform.vercel.app (root 307→/login, /login 200). CLI user `mangenajustice-4628`.
- **Prod env vars set:** `DEMO_MODE=true`, `STORAGE_ROOT=./storage`, generated `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, placeholder `DATABASE_URL`.
- **Demo persistence is ephemeral on Vercel serverless** — JSON file writes don't survive between invocations. Fine for demo; needs hosted Postgres + real `DATABASE_URL` for durable prod writes.
- `.vercelignore` excludes desktop build artifacts (a 3.3GB `.nsis.7z` once broke deploy with a >2GB error).

**Unpushed local commits** (push after Phase 6 revision, or anytime): `fed3d6b` (research), `e55f91b` (plans), `b97521d` (partial 06-02 revision).

---

## After Phase 6

Only **Phase 7 (Calculator Audit)** remains — verify the remaining calculators against current SARS rules and rulepack-sourced values. It's independent of Phase 6. After 7: milestone complete → `/gsd:complete-milestone`.
