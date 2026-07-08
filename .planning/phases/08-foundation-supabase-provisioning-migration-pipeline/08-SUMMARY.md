# Phase 8 — Foundation: Supabase Provisioning & Migration Pipeline — SUMMARY

**Status:** ✅ Complete (executed hands-on with the user, 2026-07-08)
**Requirements:** PERSIST-01 (wired), PERSIST-02, PERSIST-03, PERSIST-06

> Note: this phase was executed interactively (the user provisioned Supabase + supplied credentials) rather than via `/gsd:plan-phase` → `/gsd:execute-phase`, so there are no per-plan PLAN.md files. This SUMMARY is the record.

## What was done
- **Provisioned Supabase** project `sa-tax-platform` (ref `dbigaaslrellpdsfevfq`, region eu-west-1, Postgres 17) via the connector — dedicated, isolated from the user's other project.
- **`prisma/schema.prisma`**: added `directUrl = env("DIRECT_URL")` to the datasource (migration-only; safe for build/runtime). Committed `e75f9c2`.
- **Connection**: session pooler (`:5432`, `DIRECT_URL`) for migrations + transaction pooler (`:6543`, `pgbouncer=true&connection_limit=1`, `DATABASE_URL`) for runtime. Verified reachable from the local machine and from Vercel's build container (avoids the IPv6-only direct-host trap).
- **Migrations** (committed, in the deploy pipeline):
  - `20260708131608_init` — all 55 tables (`prisma migrate dev --name init`), tracked in `_prisma_migrations`. Commit `f786fbc`.
  - `20260708132500_enable_rls` — `ENABLE ROW LEVEL SECURITY` on every table (quoted PascalCase names), closing the Supabase public-PostgREST exposure; app uses the `postgres` owner role which bypasses RLS. Cleared the critical `rls_disabled` advisory (now only INFO `rls_enabled_no_policy`, expected). Commit `a940524`.
- **Vercel Production env**: replaced the placeholder `DATABASE_URL`; set `DATABASE_URL` + `DIRECT_URL` (values verified byte-for-byte against `.env`).
- **Guarded build** (`scripts/build.mjs`, `"build": "node scripts/build.mjs"`): runs `prisma migrate deploy` only when `DATABASE_URL` is present, then `next build`. Vercel Production injects the var → migrations apply on deploy; Preview/desktop/local builds without a DB skip migrations and still build. Removes the hard dependency on Preview env vars (Vercel CLI 50.26.1 bug applying "all preview branches"). Commit `e75f9c2`→`3373c5d`.

## Verification
- Production deploy `dpl_6CLJzb…` READY. Build logs show: `[build] DATABASE_URL detected → prisma migrate deploy` → connected to `aws-0-eu-west-1.pooler.supabase.com:5432` → `2 migrations found` → `No pending migrations to apply` → `next build`. **Proves Vercel reaches Supabase and the migration pipeline runs** (Phase 8 success criteria 1–5).
- Local `npm run build` (no ambient `DATABASE_URL`) skips migrations and compiles — demo/dev untouched (PERSIST-06).

## Outcome
PERSIST-02, PERSIST-03, PERSIST-06 met; PERSIST-01 wired (Production can reach Postgres) and completed in Phase 9 at the `DEMO_MODE` flip.
