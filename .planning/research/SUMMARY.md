# v1.1 Durable Persistence — Research Summary

**Milestone:** v1.1 — replace ephemeral demo-mode JSON storage with Supabase Postgres via Prisma on Vercel serverless.
**Researched:** 2026-07-08
**Confidence:** HIGH (per-repo state read directly from code; Supabase/Prisma/Vercel specifics verified against official docs, not memory).

## Lead finding: the repository code is already done

Every persistence-touching module already branches on `isDemoMode` (`src/lib/env.ts`) with a **fully implemented Prisma path** next to the file-JSON demo path, and `prisma/schema.prisma` (1,174 lines) already models every entity field-for-field. **v1.1 is environment/pipeline work, not repository code.**

### Per-repository current state

| Module | Demo path | Prisma path | Schema coverage | Gap |
|---|---|---|---|---|
| logbook/repository.ts | Complete | Complete (all 10 methods) | Vehicle/Logbook/LogbookTrip 1:1 | None functional |
| individual-tax/repository.ts | Complete | Complete | Profile/Assessment/RuleVersion match | Minor: `getAssessmentById` O(n) — not a blocker |
| itr12/repository.ts | Complete | Mostly complete | Profile/Workpaper/CalculationRun match | No `ITR12TransitionEvent` table; no `createCase()` outside seed.ts |
| estates/repository.ts | Complete (9 sub-entities) | Complete | EstateMatter + 8 children match | None functional |
| estates/engines/repository.ts | Complete | Complete | EstateEngineRun matches | None |
| clients/client-service.ts | Complete | Complete | Client matches | None |
| cases/case-service.ts | Complete (reads) | Complete for reads | Case/CaseActivity match | No create path except seed.ts |
| audit/audit-writer.ts | Complete | Complete | AuditLog matches | None |
| auth-options.ts (NextAuth) | Complete | Complete | User/Role/UserRole match | None |

## What's actually missing (all environment/pipeline)

- No `prisma/migrations/` directory — the schema has never been migrated anywhere.
- No Supabase project; no `DATABASE_URL`/`DIRECT_URL` anywhere (`.env.local` has none).
- `schema.prisma` datasource has no `directUrl`.
- No `prisma migrate deploy` in the build pipeline (`package.json build` is plain `next build`; `postinstall: prisma generate` already exists — keep it).

## Supabase + Prisma + Vercel setup (verified against official docs)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // app runtime — pooled, transaction mode
  directUrl = env("DIRECT_URL")     // migrations — session mode (currently absent, must add)
}
```

```bash
# App runtime — Supavisor TRANSACTION mode, port 6543
DATABASE_URL="postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# Migrations — Supavisor SESSION mode, port 5432 (same pooler host)
DIRECT_URL="postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

- `package.json` build should become `"build": "prisma migrate deploy && next build"`.
- Use the **pooler** host for both, NOT the naked `db.<ref>.supabase.co` direct host — it is IPv6-only by default and unreachable from Vercel's build container without the paid IPv4 add-on (classic gotcha).

## Build order (for the roadmap)

1. **Foundation (MUST):** provision Supabase; add `directUrl`; generate + commit initial migration (`prisma migrate dev --name init`); wire `DATABASE_URL`/`DIRECT_URL` in Vercel; add `prisma migrate deploy` to build.
2. **Per-module verification (MUST, low code-risk):** deploy a Preview with `DEMO_MODE=false`, exercise every module end-to-end against real Postgres.
3. **Seed (MUST):** run `prisma migrate deploy` + `prisma/seed.ts` manually once against production; rotate the seeded password. NOTE: seed is **destructive** (`$transaction([...deleteMany])` truncates ~30 tables) — manual one-off only, never in automated deploy.
4. **Flip prod (MUST):** set `DEMO_MODE=false` in Vercel Production; redeploy; verify NextAuth login against real Users.
5. **Verify durable writes (MUST — acceptance):** create client/logbook/assessment in production, force a fresh serverless invocation, confirm the data survives.

## Pitfalls → phase

- Serverless connection exhaustion → transaction-mode pooler + `connection_limit=1` (foundation).
- Prepared-statement errors → `pgbouncer=true` on `DATABASE_URL` (foundation).
- Migrations failing through the transaction-mode pooler → `directUrl` must use session-mode 5432, never 6543 (foundation).
- Direct host IPv6-only/unreachable from Vercel → use pooler session-mode as `DIRECT_URL` (foundation).
- Destructive seed → manual one-off only (seed phase).
- Data-shape mismatch file-JSON vs Prisma → **not a real risk**; every repo mapper already normalizes Decimal→Number / Date→ISO identically in both paths.

## Deferred / out of scope for v1.1 (product-scope, not migration blockers)

- Real `ITR12TransitionEvent` model (Prisma path currently synthesizes one event from `profile.updatedAt`).
- `createCase()` app flow (new ITR12 workspaces need a pre-seeded Case; no create path outside `seed.ts`).
- `package.json#prisma` → `prisma.config.ts` migration (deprecated in Prisma 6.x, removed in 7; project pinned `^6.16.2`, not urgent).
- Separate Supabase projects for Preview vs Production (deploy-strategy nicety).

## Open provisioning decisions (user's call)

- Supabase pricing tier (free tier likely fine for demo; connection/pool limits vary by tier).
- Preview-vs-Production Supabase project split.

---
*Researched 2026-07-08 for v1.1. Repository code state read directly; connection/migration specifics verified against Supabase + Prisma docs. Supersedes v1.0 research now archived in `.planning/milestones/v1.0-research/`.*
