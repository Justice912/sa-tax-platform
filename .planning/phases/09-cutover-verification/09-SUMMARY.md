# Phase 9 — Cutover & Verification — SUMMARY

**Status:** ✅ Complete (executed hands-on with the user, 2026-07-08)
**Requirements:** PERSIST-01 (completed here), PERSIST-04, PERSIST-05, PERSIST-07

> Executed interactively (production cutover needs the user's Vercel/account actions), so no per-plan PLAN.md files. This SUMMARY is the record.

## What was done
- **Seeded** the production database once via `npx prisma db seed` (`tsx prisma/seed.ts`) against Supabase — 4 users, 5 roles, 1 firm, 3 clients, plus reference data (7 tax types, review statuses, document categories, ITR12 + IndividualTax sample rows). Verified via the connector (row counts, RLS `true` on all tables). The seed is destructive (truncate-then-reseed) — run manually once, never in the automated deploy (PERSIST-05).
- **Flipped `DEMO_MODE=false`** in Vercel Production (verified the value via `vercel env pull`) and **redeployed** (`vercel redeploy`), aliasing `https://sa-tax-platform.vercel.app` to the new deployment. Production now reads/writes Supabase, not file storage (PERSIST-01).
- **Rotated credentials** (PERSIST-05 hardening): admin password changed to a user-chosen value; the 3 demo accounts (practitioner/reviewer/staff) rotated to random strong passwords. bcrypt-hashed locally, applied via connector `UPDATE`.

## Verification (all against the live production app)
- **App health:** root 307→/login, `/login` 200, `/api/auth/providers` 200 — boots clean on Postgres, no runtime errors.
- **Durable read + auth (PERSIST-04):** programmatic NextAuth login as `admin@ubuntutax.co.za` returned a session with the seeded Prisma cuids (`id`, `firmId`) — proves the live app read the user from Postgres and validated the bcrypt password.
- **Durable write (PERSIST-07):** user created a client ("durable test") in the UI; confirmed the new row in Supabase via the connector (independent path) — the app wrote durably to Postgres, surviving cold serverless invocations.
- **Password rotation verified:** new admin password → LOGGED IN; old public default `ChangeMe123!` → REJECTED.

## Outcome
All v1.1 PERSIST requirements satisfied. Production is durably persistent on Supabase Postgres.

## Deferred (not blocking; noted in research/SUMMARY.md)
- Separate Supabase projects for Preview vs Production.
- ITR12 `TransitionEvent` model + `createCase()` app flow.
- `package.json#prisma` → `prisma.config.ts` (Prisma 6→7).
