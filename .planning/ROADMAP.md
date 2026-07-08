# Roadmap: SA Tax Platform

## Milestones

- ✅ **v1.0 Individual Tax SARS Compliance** — Phases 1–7 (shipped 2026-07-07) → [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Durable Persistence** — Phases 8–9 (in progress)

## Phases

<details>
<summary>✅ v1.0 Individual Tax SARS Compliance (Phases 1–7) — SHIPPED 2026-07-07</summary>

- [x] Phase 1: Rulepack Extension (3/3 plans) — completed 2026-07-02
- [x] Phase 2: Logbook Domain Module (4/4 plans) — completed 2026-07-03
- [x] Phase 3: ITR12 Travel Schedule Integration (3/3 plans) — completed 2026-07-03
- [x] Phase 4: Import Pipeline (6/6 plans) — completed 2026-07-04
- [x] Phase 5: Component Decomposition (6/6 plans) — completed 2026-07-04
- [x] Phase 6: Logbook UI, Import Wizard & Performance Hardening (6/6 plans) — completed 2026-07-07
- [x] Phase 7: Calculator Audit (5/5 plans) — completed 2026-07-07

Full phase detail archived in [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md).

</details>

### 🚧 v1.1 Durable Persistence (In Progress)

**Milestone Goal:** Replace ephemeral demo-mode JSON file storage with hosted Postgres (via the existing Prisma schema) so logbook, individual-tax, and client data survive across Vercel serverless invocations.

- [ ] **Phase 8: Foundation — Supabase Provisioning & Migration Pipeline** - Provision Supabase Postgres, wire serverless-safe env vars, commit the initial migration, and run it in the deploy pipeline
- [ ] **Phase 9: Cutover & Verification** - Verify every module against real Postgres on Preview, seed production once, flip prod off demo mode, and prove durable writes survive cold invocations

## Phase Details

### Phase 8: Foundation — Supabase Provisioning & Migration Pipeline
**Goal**: A real, provisioned, serverless-safe Postgres database exists with the Prisma schema deployed via a committed migration pipeline and wired into Vercel — ready for cutover — while local demo-mode dev is untouched.
**Depends on**: Nothing new — builds directly on the shipped v1.0 codebase and its existing (already-complete) Prisma schema/repositories.
**Requirements**: PERSIST-01, PERSIST-02, PERSIST-03, PERSIST-06
**Human action required**: Supabase project provisioning and Vercel environment-variable wiring need the user's own account/hands. Expect `autonomous: false` checkpoints in this phase's plans (plan-phase should gate on these).
**Success Criteria** (what must be TRUE):
  1. A Supabase Postgres project exists with `DATABASE_URL` (transaction-mode pooler, `pgbouncer=true&connection_limit=1`, port 6543) and `DIRECT_URL` (session-mode, port 5432) both set in Vercel's Preview and Production environments.
  2. `prisma/schema.prisma` declares `directUrl`, and a committed initial migration exists under `prisma/migrations/` in git, generated (via `prisma migrate dev --name init`) against the new database.
  3. The deploy pipeline runs `prisma migrate deploy` before `next build` on every deploy, so pending migrations always apply before the app builds.
  4. Running the app locally with `DEMO_MODE=true` (or no `DATABASE_URL` set) still works exactly as before — no Postgres required for local dev.
  5. A Prisma connection against the new database succeeds both from a local machine and from a Vercel build/runtime context, confirming the pooler host is reachable (not blocked by the IPv6-only direct-host gotcha).
**Plans**: TBD

### Phase 9: Cutover & Verification
**Goal**: Every persistence module is verified end-to-end against real Postgres, production is seeded once and flipped off demo mode, and durable writes are proven to survive cold serverless invocations and redeploys.
**Depends on**: Phase 8
**Requirements**: PERSIST-04, PERSIST-05, PERSIST-07
**Human action required**: The one-off destructive production seed run and the Vercel `DEMO_MODE=false` production flip need the user's own hands. Expect `autonomous: false` checkpoints in this phase's plans (plan-phase should gate on these).
**Success Criteria** (what must be TRUE):
  1. On a Preview deployment with `DEMO_MODE=false`, every persistence module (logbook, individual-tax, itr12, clients, estates, cases, audit, NextAuth auth) creates/reads/updates correctly against Postgres.
  2. The production database has been seeded exactly once via a manual `prisma migrate deploy` + `prisma/seed.ts` run (never part of the automated deploy pipeline), and the seeded demo credentials have been rotated afterward.
  3. Vercel Production has `DEMO_MODE=false`; a practitioner can log in via NextAuth with a real (rotated) account against a fresh production deploy.
  4. A practitioner can create a client + logbook + individual-tax assessment in production, and the same data is still present and correct after a cold serverless invocation and after a redeploy.
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Rulepack Extension | v1.0 | 3/3 | Complete | 2026-07-02 |
| 2. Logbook Domain Module | v1.0 | 4/4 | Complete | 2026-07-03 |
| 3. ITR12 Travel Schedule Integration | v1.0 | 3/3 | Complete | 2026-07-03 |
| 4. Import Pipeline | v1.0 | 6/6 | Complete | 2026-07-04 |
| 5. Component Decomposition | v1.0 | 6/6 | Complete | 2026-07-04 |
| 6. Logbook UI, Import Wizard & Performance Hardening | v1.0 | 6/6 | Complete | 2026-07-07 |
| 7. Calculator Audit | v1.0 | 5/5 | Complete | 2026-07-07 |
| 8. Foundation — Supabase Provisioning & Migration Pipeline | v1.1 | 0/TBD | Not started | - |
| 9. Cutover & Verification | v1.1 | 0/TBD | Not started | - |

---
*v1.0 shipped 2026-07-07. v1.1 Durable Persistence roadmap created 2026-07-08 — next: `/gsd:plan-phase 8`.*
