# Session Handoff — SA Tax Platform

**Written:** 2026-07-07 (end of session)
**Status:** 🎉 **v1.0 milestone SHIPPED.** No work in progress.

---

## Where we are

**Milestone v1.0 "Individual Tax SARS Compliance" is complete, tagged, and deployed.** All 7 phases done, verified, pushed to GitHub `master`, tag `v1.0` pushed, live on Vercel. Nothing is unpushed; working tree clean.

- Full record: `.planning/MILESTONES.md`
- Shipped state + carryover: `.planning/PROJECT.md` ("Current State" + "Active")
- Retrospective (what worked / what to improve): `.planning/RETROSPECTIVE.md`
- Archived roadmap/requirements: `.planning/milestones/v1.0-*.md`

Health at ship: 482 tests / 98 files green; `npm run build` (Turbopack) clean.

---

## Next step options

1. **Practitioner compliance sign-off (recommended before relying on the audited figures in production):** four MEDIUM-confidence v1.0 items need a human tax expert's confirmation, then reconcile any corrections. All are pinned by loud-failing tests, so a change surfaces immediately:
   - Corrected 2027 gazetted brackets/rebates/thresholds (`rules-2027.ts`) vs final SARS 2026/27 tables.
   - Medical s6B formula (`medical-tab.tsx`) vs SARS Guide IT07.
   - Provisional para 19/20 mechanics (`provisional-tax-tab.tsx`) vs Interpretation Note 1 (Issue 3).
   - Home-office salaried-eligibility policy (`home-office-tab.tsx`) — block-with-warning vs allow + s23(m).
   - Detail: `.planning/phases/07-calculator-audit/07-VERIFICATION.md`.
2. **Start the next milestone:** `/gsd:new-milestone` (questioning → research → requirements → roadmap). Carryover candidate beyond sign-off: durable persistence (hosted Postgres + real `DATABASE_URL`) to replace ephemeral demo-mode JSON writes on Vercel serverless.

---

## Environment gotchas (still apply next milestone — also in memory)

1. **`gsd-tools.cjs commit` is BROKEN** on this Windows/Git-Bash setup — always commit with plain `git add <files> && git commit -m "..."`.
2. **`roadmap update-plan-progress` needs the UNPADDED phase number** (`"8"` not `"08"`).
3. **Parallel-wave git-index races**: 2+ executors sharing one working tree sweep each other's staged files between commits (recovered every wave in v1.0, but costly). **Consider git worktree isolation per executor next milestone** (see RETROSPECTIVE).
4. **Build:** `npm run build` (Turbopack) is the real build and passes. Do NOT gate on `next build --webpack` (known pre-existing Estates filing-pack route failure). Grep for "Failed to compile".
5. **Session limits cut subagents off mid-task** — spot-check what committed, run the verification gate yourself, finish the tail; resume a cut-off agent via SendMessage with its agentId if context is intact.
6. **`phase complete N` mis-reports `is_last_phase`/next phase** when the next phase has no plans yet — trust ROADMAP.md.
7. **Demo storage writes** (`storage/demo-*.json`) are stray/regenerable — revert tracked ones, delete untracked `demo-logbooks.json`; the seed is code (`src/server/demo-data.ts`).

---

## Deploy facts

- **GitHub:** `Justice912/sa-tax-platform`, branch `master`, tag `v1.0`. Push to deploy.
- **Vercel:** project `sa-tax-platform` (team `justices-projects-637fa3c1`) auto-deploys every push to master. Live: https://sa-tax-platform.vercel.app.
- **Demo persistence is ephemeral on Vercel serverless** — needs hosted Postgres + real `DATABASE_URL` for durable prod writes (carryover item).
