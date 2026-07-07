# Session Handoff — SA Tax Platform

**Written:** 2026-07-07 (end of session)
**Resume with:** open this file, then start **Phase 7 (Calculator Audit)** — the last remaining phase. See "Immediate next step" below.

---

## TL;DR — where we are

Building the SA tax platform milestone via the GSD workflow (research → plan → verify → execute per phase). **6 of 7 phases are complete, verified, committed, and pushed/deployed.** Only **Phase 7 (Calculator Audit)** remains.

Everything through commit `376df40` (Phase 6 completion) is on GitHub `master` and live on Vercel. Nothing is unpushed.

---

## Phase status

| Phase | Status |
|-------|--------|
| 1. Rulepack Extension | ✅ Complete |
| 2. Logbook Domain Module | ✅ Complete |
| 3. ITR12 Travel Schedule Integration | ✅ Complete |
| 4. Import Pipeline | ✅ Complete |
| 5. Component Decomposition | ✅ Complete |
| 6. Logbook UI, Import Wizard & Perf Hardening | ✅ **Complete & deployed (2026-07-07)** |
| 7. Calculator Audit | ⬜ **Not started — next up** |

Baseline health after Phase 6: **`npx vitest run src/components/individual-tax/tax-tools src/modules/logbook` → 195 tests pass (19 files)**; `npm run build` (Turbopack) green. (Full-suite count is higher; that command is the phase-6-relevant slice.)

---

## Immediate next step (do this first next session)

**Plan Phase 7:** `/gsd:plan-phase 7` → research → plan → checker → revision loop, then `/gsd:execute-phase 7`.

Phase 7 = **Calculator Audit**: verify the remaining seven individual-tax calculators (the non-travel tabs: Rental, Home Office, CGT, Retirement, Medical, Provisional, + Dashboard aggregation) against **current SARS rules and rulepack-sourced values**. It is independent of Phase 6. After 7 passes verification → milestone complete → `/gsd:complete-milestone`.

Open compliance flags to resolve/verify during Phase 7 (from STATE.md Blockers/Concerns — carried since earlier phases):
- **Medical credits** s6B multipliers (3x/4x, 25%/33.3%, 7.5% threshold) — MEDIUM confidence; re-verify vs SARS Guide IT07.
- **Provisional tax** 8%/18-month basic-amount escalation — MEDIUM confidence; verify vs Interpretation Note 1 (Issue 3).
- **ITR12 deduction codes** 4014/4015 — LOW-MEDIUM confidence (4015 may be commission-specific); confirm vs PAYE-AE-06-G06 and IT-AE-36-G05.
- **Actual-cost** (Phase 2) wear-and-tear + R800,000 vehicle-value cap — verify vs SARS IN47.

---

## What Phase 6 delivered (just completed)

The travel-logbook feature is now real end-to-end (was a 964-line disconnected prototype):
- `travel-logbook-tab.tsx` rewritten as a thin container: resolves client + tax year, loads the persisted logbook via `src/modules/logbook/actions.ts` Server Actions (each returns `{ record, travelResult }` — no client-side cost math, no `revalidatePath`-per-edit), wires the sub-components below, publishes the real claimed deduction to the Dashboard.
- `trip-table.tsx` — `@tanstack/react-virtual` virtualized table over the real `LogbookTripRecord` schema; bounded DOM at 10k rows (PERF-02) + `React.memo`'d `TripRow` with a Profiler render-count edit-isolation proof (PERF-03).
- `logbook-import-wizard.tsx` — 5-step wizard driving the real Phase 4 pipeline (CSV/XLSX/SARS eLogbook); virtualized preview; commit delegated to parent via `onCommit`.
- `cost-method-panel.tsx` — deemed-vs-actual comparison + method election + 5 actual-expense fields.
- Printable audit route `src/app/reports/logbook/[logbookId]/print/page.tsx` + `logbook-audit-summary.tsx`; CSV export wired.
- `tools/page.tsx` is now async and threads an optional `clients` prop → `TaxTools` → `TravelLogbookTab` (empty state when no clients; fires no Server Action on mount, keeping shell/isolation tests renderable).
- Requirements satisfied: LOG-06, PERF-02, PERF-03. Verification: `.planning/phases/06-logbook-ui-import-wizard-performance/06-VERIFICATION.md` (passed, 6/6 must-haves).

**Demo seed note:** the logbook demo seed is CODE (`src/server/demo-data.ts` → `demoLogbooks`). `src/modules/logbook/repository.ts` regenerates `storage/demo-logbooks.json` from it on first runtime read; tests bypass the file (`NODE_ENV=test`). So that JSON is a disposable runtime artifact — do not commit it (a stray one was deleted this session).

---

## How to run a phase (the working loop)

Per-phase cycle used for phases 2–6 (all succeeded):
1. `/gsd:plan-phase N` → research (subagent) → plan (subagent) → checker (gsd-plan-checker) → revision loop if needed.
2. `/gsd:execute-phase N` → wave-based parallel `gsd-executor` subagents → spot-check each wave → `gsd-verifier` → `phase complete`.
3. Commit completion docs, push (triggers Vercel auto-deploy).

**Orchestration commands:**
- Init: `node C:/Users/HP/.claude/get-shit-done/bin/gsd-tools.cjs init execute-phase 7`
- Wave index: `node .../gsd-tools.cjs phase-plan-index 07`
- Mark complete: `node .../gsd-tools.cjs phase complete 7`
- Executors: subagent_type `gsd-executor`, model `sonnet`; verifier: `gsd-verifier`.

---

## ⚠️ Environment gotchas (MUST pass to every executor subagent)

These recur every phase — saved in memory (`gsd-tools-windows-gotchas.md`, `sa-tax-platform-build-deploy.md`) too:

1. **`gsd-tools.cjs commit` is BROKEN** on this Windows/Git-Bash setup (POSIX quote escaping dies in cmd.exe execSync). **Always commit with plain `git add <files> && git commit -m "..."`.** `state`/`roadmap`/`requirements` subcommands are fine.
2. **`roadmap update-plan-progress` needs the UNPADDED phase number** (`"7"` not `"07"`).
3. **Parallel-wave STATE.md write race:** 2+ executors in a wave clobber `.planning/STATE.md`. Tell each to only `git add` its own files (never `git add -A`) and collapse duplicate frontmatter before its final commit. (Self-repaired cleanly in Phase 6.)
4. **Build:** production build is `npm run build` (Turbopack) — it passes. **Do NOT gate on `next build --webpack`** (KNOWN pre-existing unrelated Estates filing-pack route failure; see `.planning/phases/04-import-pipeline/deferred-items.md`). Grep output for "Failed to compile"; never trust a piped `| tail` exit code.
5. **Session limits cut executors off mid-plan** (hit the 06-06 keystone: all task code committed, but SUMMARY/STATE/ROADMAP bookkeeping unfinished). Spot-check what actually committed; run the plan's verification gate yourself; commit the (usually already-written) SUMMARY; `roadmap update-plan-progress N`. Don't re-run the whole plan.
6. **`phase complete N` mis-reports `is_last_phase: true` when the next phase has no plans yet** and leaves STATE.current_phase stuck. ROADMAP.md is the source of truth for what's next — after Phase 7, that genuinely IS the last phase → milestone complete.
7. **Watch for junk demo-data writes:** app/test runs write to `storage/demo-*.json`. Revert stray/tracked writes before committing; the logbook one (`demo-logbooks.json`) is code-seeded and disposable.

---

## Deploy facts

- **GitHub:** `Justice912/sa-tax-platform`, branch `master`. Push to deploy.
- **Vercel:** project `sa-tax-platform` under team `justices-projects-637fa3c1`, connected to the GitHub repo → **every push to master auto-deploys**. Live: https://sa-tax-platform.vercel.app (root 307→/login, /login 200). CLI user `mangenajustice-4628`.
- **Prod env vars set:** `DEMO_MODE=true`, `STORAGE_ROOT=./storage`, generated `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, placeholder `DATABASE_URL`.
- **Demo persistence is ephemeral on Vercel serverless** — JSON file writes don't survive between invocations (seed regenerates from code). Fine for demo; needs hosted Postgres + real `DATABASE_URL` for durable prod writes.
- `.vercelignore` excludes desktop build artifacts (a 3.3GB `.nsis.7z` once broke deploy with a >2GB error).

**Unpushed local commits:** none — everything is pushed through `376df40`.

---

## After Phase 7

Milestone complete → `/gsd:complete-milestone` (archives the milestone, prepares next version).
