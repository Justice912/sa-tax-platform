# Requirements: SA Tax Platform — v1.1 Durable Persistence

**Defined:** 2026-07-08
**Core Value:** A tax practitioner can capture or import a client's travel logbook and complete an individual tax assessment knowing every figure and format matches current SARS requirements — without the app slowing down.

## v1 Requirements

Milestone v1.1 scope. Each maps to a roadmap phase (numbering continues from v1.0 — phases start at Phase 8). This is an environment/pipeline migration: research confirmed every module already has a complete Prisma path branching on `isDemoMode`, so there is no repository rewrite.

### Persistence

- [x] **PERSIST-01**: In production the app reads and writes through hosted Supabase Postgres via Prisma (real `DATABASE_URL`), not demo file storage — data written by one request is readable by a later request.
- [x] **PERSIST-02**: The Prisma schema is captured as a committed migration and applied to the database via `prisma migrate deploy` in the deploy pipeline.
- [x] **PERSIST-03**: The runtime connection is serverless-safe — Supabase transaction-mode pooler (`pgbouncer=true`, `connection_limit=1`) as `DATABASE_URL`, with a session-mode `DIRECT_URL` (schema `directUrl`) used only for migrations — so Vercel functions don't exhaust connections.
- [x] **PERSIST-04**: Every persistence module (logbook, individual-tax, itr12, clients, estates, cases, audit, NextAuth auth) is verified to read/write correctly against Postgres end-to-end on a Preview deploy with `DEMO_MODE=false`.
- [x] **PERSIST-05**: The production database is seeded once with the expected reference/demo data (destructive seed run manually, not in automated deploy; seeded credentials rotated).
- [x] **PERSIST-06**: Local development still works in demo/file mode with no Postgres required (`DEMO_MODE=true` / absent `DATABASE_URL`), so the demo experience is unaffected.
- [x] **PERSIST-07**: Durable-write acceptance — a practitioner can create a client + logbook + individual-tax assessment in production and the data survives a fresh (cold) serverless invocation and a redeploy.

## v2 Requirements

Deferred to a future milestone (product-scope gaps surfaced during research, not persistence-migration blockers).

### ITR12 completeness

- **ITR12-01**: Real `ITR12TransitionEvent` model + history (Prisma path currently synthesizes one event from `profile.updatedAt`).
- **ITR12-02**: `createCase()` application flow so new ITR12 workspaces can be created against Postgres without a pre-seeded Case.

### Deploy hardening

- **DEPLOY-01**: Separate Supabase projects (and env wiring) for Preview vs Production.
- **DEPLOY-02**: Migrate `package.json#prisma` config to `prisma.config.ts` (deprecated in Prisma 6.x, removed in 7; project pinned `^6.16.2`).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rewriting repositories to Prisma | Already done — every repo branches on `isDemoMode` with a complete Prisma path (research HIGH confidence) |
| Estates/trusts/company feature work | v1.1 is persistence-only; those modules persist via the same cutover but no new features |
| Data migration from existing prod demo JSON | Prod demo storage is ephemeral on Vercel serverless — nothing durable to migrate; seed provides the baseline |
| Practitioner compliance sign-off reconciliation (v1.0 carryover) | Separate track; needs a tax expert's input, not tied to persistence |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PERSIST-01 | Phase 8 | Complete |
| PERSIST-02 | Phase 8 | Complete |
| PERSIST-03 | Phase 8 | Complete |
| PERSIST-04 | Phase 9 | Complete |
| PERSIST-05 | Phase 9 | Complete |
| PERSIST-06 | Phase 8 | Complete |
| PERSIST-07 | Phase 9 | Complete |

**Coverage:**
- v1.1 requirements: 7 total
- Mapped to phases: 7 ✓
- Complete: 7 ✅ (all verified against the live production app 2026-07-08)

---
*Requirements defined: 2026-07-08 for milestone v1.1. All PERSIST-01..07 completed 2026-07-08 (Phases 8–9 executed hands-on).*
