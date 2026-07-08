# Milestones

## v1.1 Durable Persistence (Shipped: 2026-07-08)

**Delivered:** Production moved off ephemeral demo-mode JSON file storage onto hosted **Supabase Postgres** (via the existing Prisma schema), so logbook, individual-tax, client and all other data now survive Vercel serverless cold starts and redeploys.

**Phases:** 8–9 (2 phases, executed hands-on with the user — no per-plan PLAN.md files; records in `phases/08-…/08-SUMMARY.md` and `phases/09-cutover-verification/09-SUMMARY.md`).

**Key accomplishments:**
- Provisioned a dedicated **Supabase** project `sa-tax-platform` (eu-west-1, PG 17); applied the full 55-table schema via a committed `init` migration and enabled **RLS** on every table (second committed migration), closing the public-PostgREST exposure.
- **Serverless-safe pooling**: transaction-mode pooler (`:6543`, `pgbouncer=true&connection_limit=1`) for runtime, session-mode (`:5432`) `directUrl` for migrations; verified reachable from Vercel's build container.
- **Guarded build** (`scripts/build.mjs`): runs `prisma migrate deploy` only when a DB is configured, then `next build` — migrations apply on Production deploys; Preview/desktop/local builds without a DB still build.
- **Cutover**: seeded the production DB once, flipped `DEMO_MODE=false`, redeployed. Verified end-to-end against the live app — login (durable read + auth) and client-create (durable write, confirmed in Postgres via an independent path). Rotated the public seed passwords.
- Requirements **PERSIST-01..07** all met and verified 2026-07-08.

**Notes / carryover:** repository Prisma paths already existed (v1.1 was environment/pipeline, not a code rewrite). Deferred (v2): separate Preview vs Production DB, ITR12 `TransitionEvent` model + `createCase()` flow, `prisma.config.ts` migration.

---

## v1.0 Individual Tax SARS Compliance (Shipped: 2026-07-07)

**Delivered:** The Individual Tax module brought fully in line with current SARS requirements — a real, persisted, SARS-format travel logbook (capture + import) feeding the ITR12, both deemed and actual cost methods, virtualized to 10,000+ trips, with all remaining calculators audited against 2025–2027 SARS rules.

**Stats:**
- **Phases:** 7 (all verified `passed`)
- **Plans:** 33 (executed across wave-based parallel execution)
- **Timeline:** 2026-07-02 → 2026-07-07 (~5 days)
- **Git range:** `c177875` (Phase 1 research) → milestone tag `v1.0`
- **Health at ship:** 482 tests / 98 files green; Turbopack production build clean; deployed to Vercel.

**Key accomplishments:**
- **Per-year SARS rulepacks (2025–2027)** as the single source of truth: tax brackets, rebates, thresholds, medical credits, retirement s11F caps, CGT exclusions/inclusion, provisional-tax parameters, and deemed-cost travel rate tables (Phase 1).
- **SARS-compliant logbook domain module**: vehicle/trip/logbook data model with deemed-cost AND actual-cost calculation engines, persisted per client + tax year, unit-tested in isolation (Phase 2).
- **ITR12 travel schedule integration**: logbook results feed the travel schedule with correct source codes (3701/3702), replacing the crude allowance × business-km estimate — without breaking existing schedule tests (Phase 3).
- **Robust import pipeline**: CSV + XLSX import with official SARS eLogbook auto-detection, off-main-thread (Web Worker) parsing, and DoS-guarded pre-commit validation (Phase 4).
- **Architecture fix**: the 2,148-line `tax-tools.tsx` monolith split into independent per-calculator components with Profiler-verified render isolation, eliminating the per-keystroke full re-render (Phase 5).
- **End-to-end logbook UX**: a real wiring container loading persisted logbooks via Server Actions, a `@tanstack/react-virtual` trip table bounded at 10,000+ rows (PERF-02/03), a 5-step import wizard, a deemed-vs-actual cost-method panel, CSV export, and a printable SARS-audit summary (Phase 6).
- **Calculator compliance audit**: fixed a silent 2027 rulepack data bug (pre-Budget estimates → gazetted Budget-2026 figures), corrected the medical s6B formula (under-65 4× MTC + excess-contributions term), reworked provisional tax to real para 19/20 mechanics, and made retirement/CGT labels per-year rulepack-sourced (Phase 7).

**Human compliance sign-off outstanding (non-blocking, pinned by loud-failing tests):**
- Corrected 2027 gazetted brackets/rebates/thresholds — confirm against final published SARS 2026/27 tax tables.
- Medical s6B formula interpretation (IT07 PDF unrenderable for verbatim quoting).
- Provisional para 19/20 basic-amount / safe-harbour mechanics (IN1 Issue 3).
- Home-office salaried-employee eligibility policy (block-with-warning vs allow + s23(m)).

See `.planning/phases/07-calculator-audit/07-VERIFICATION.md` and each phase's `*-SUMMARY.md` for detail.

---
