# SA Tax Platform — Individual Tax SARS Compliance

## What This Is

A South African tax practice platform (Next.js 16 + React 19, with an Electron desktop wrapper) used to manage clients, individual tax assessments (ITR12), and deceased estates. As of **v1.0**, the **Individual Tax module** is fully aligned with current SARS requirements and formats — with a real, persisted, SARS-format travel logbook (capture + import, deemed & actual cost) as the flagship deliverable — and the large-import UI-freeze bug is resolved via component decomposition + virtualization.

## Core Value

A tax practitioner can capture or import a client's travel logbook and complete an individual tax assessment knowing every figure and format matches current SARS requirements — without the app slowing down.

## Current State

**Shipped v1.0 Individual Tax SARS Compliance (2026-07-07)** — 7 phases, 33 plans, ~5 days. 482 tests / 98 files green; Turbopack production build clean; deployed to Vercel (`sa-tax-platform.vercel.app`).

- Travel logbook is real and persisted per client + tax year, in SARS eLogbook format (vehicle details, year odometers, per-trip business travel), with deemed AND actual cost methods, feeding the ITR12 travel schedule (source codes 3701/3702).
- Import supports CSV + XLSX with SARS eLogbook auto-detection, off-main-thread parsing, DoS-guarded validation; virtualized to 10,000+ trips.
- The 2,148-line `tax-tools.tsx` monolith is decomposed into isolated per-calculator components (Profiler-verified render isolation).
- All calculators audited against 2025–2027 SARS rules and sourced from per-year rulepacks.

**Open compliance sign-off (carried into next milestone — non-blocking, pinned by loud-failing tests):** corrected 2027 gazetted brackets/rebates/thresholds, medical s6B formula, provisional para 19/20 mechanics, and home-office salaried-eligibility policy all need a practitioner's confirmation against final SARS sources. See `.planning/phases/07-calculator-audit/07-VERIFICATION.md`.

## Current Milestone: v1.1 Durable Persistence

**Goal:** Replace ephemeral demo-mode JSON file storage with hosted Postgres (via the existing Prisma schema) so logbook, individual-tax, and client data survive across Vercel serverless invocations.

**Target features:**
- Provision hosted Postgres + real `DATABASE_URL`; production runs Prisma-backed, not demo file storage.
- Complete and verify Prisma-backed repositories across all modules (logbook, individual-tax, itr12, clients, estates) — schema coverage + migrations.
- Serverless-safe Prisma client (connection pooling) so Vercel functions don't exhaust connections.
- Keep demo/file mode working for local dev; a clean `DEMO_MODE`/`DATABASE_URL` switch.
- Migration/seed path so a first-run production DB has the expected shape (and optional demo seed).

## Requirements

### Validated

- ✓ Individual tax assessment engine with per-year rulepacks (2024–2027): brackets, rebates, medical credits, CGT — existing, extended v1.0
- ✓ Near-eFiling ITR12 input flow with Zod validation and audit logging — existing
- ✓ Tax tools page with 8 calculators — existing, audited v1.0
- ✓ Client management with disk persistence (demo mode) — existing
- ✓ Report generation (PDF/DOCX) — existing
- ✓ Auth (NextAuth) with RBAC — existing
- ✓ SARS-compliant travel logbook (vehicle details, year odometers, per-trip SARS eLogbook format) — v1.0
- ✓ Both travel cost methods: deemed (per-year SARS rate tables) AND actual (fuel, maintenance, insurance, finance charges, wear-and-tear) — v1.0
- ✓ Logbook result feeds the ITR12 travel schedule (source codes 3701/3702) replacing the crude allowance × ratio estimate — v1.0
- ✓ Logbooks persist per client + tax year, survive refresh/navigation, exportable for SARS audit (CSV + printable summary) — v1.0
- ✓ Logbook import: robust CSV, Excel .xlsx, SARS eLogbook auto-detection; manual capture retained — v1.0
- ✓ Performance fix: large logbook imports no longer freeze the UI (monolith split, virtualized trip tables, no per-keystroke full re-render) — v1.0 (validated at 10,000+ trips)
- ✓ All 8 individual-tax calculators audited against latest SARS rules and rulepack-sourced (medical s6A/s6B, retirement s11F, CGT, provisional para 19/20, rental, home office s23(b)) — v1.0
- ✓ Rate tables verified for 2025–2027 including per-year deemed-cost travel rates — v1.0

### Active

<!-- Next milestone — to be defined via /gsd:new-milestone. Carryover candidates below. -->

- [ ] Practitioner compliance sign-off on the four MEDIUM-confidence v1.0 items (2027 gazetted figures, medical s6B, provisional para 19/20, home-office salaried policy), then reconcile any corrections
- [ ] Durable persistence: replace ephemeral demo-mode JSON writes with hosted Postgres + real `DATABASE_URL` so logbook/assessment writes survive on Vercel serverless

### Out of Scope

- Estates / trusts / company modules — separate milestone; v1.0 was Individual Tax only
- 2024 year of assessment rate updates — only 2025–2027 in scope
- Direct SARS eFiling integration/submission — platform prepares near-eFiling data, does not submit
- Mobile app — web + existing Electron desktop only

## Context

- **Tech stack:** Next.js 16 / React 19 / TypeScript / Tailwind 4 / Prisma + file-demo storage. Added v1.0: `@tanstack/react-virtual` (trip virtualization), `xlsx` (CDN tarball, not npm — CVE avoidance), a Web Worker for off-main-thread parsing.
- **Architecture:** domain modules with service/repository/validation layers; per-year rulepacks via `rulepack-registry.ts`; pure calculation functions with colocated Vitest tests; `"use server"` action boundaries for client→server logbook mutations returning `{ record, travelResult }`.
- **Demo persistence is ephemeral on Vercel serverless** — JSON writes don't survive between invocations (seed regenerates from code in `src/server/demo-data.ts`). Durable prod writes need hosted Postgres.
- **Known deferred:** `next build --webpack` fails on a pre-existing unrelated Estates filing-pack route export (Turbopack `npm run build` is the real build and passes).
- SARS references used: official SARS travel eLogbook, Interpretation Notes (IN1, IN47, IN28), SARS Guide IT07, Budget 2026 tax tables.

## Constraints

- **Compliance:** figures/formats must match published SARS values per year (2025–2027); no invented rates — verified against official sources during Phase 1 & Phase 7 research (four items pending practitioner sign-off).
- **Compatibility:** existing assessments and stored demo data keep working; `travel-schedule.ts` changes did not break other schedules' tests.
- **Performance:** logbook with 10,000+ imported trips remains responsive (proven via bounded-DOM + Profiler render-count + time-budget tests).
- **Tech stack:** follow existing module patterns, no new frameworks.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full SARS eLogbook format (vehicle details, year odometers, both cost methods) | Deemed-only shortcut fails audit requirements | ✓ Good — shipped v1.0 |
| Logbooks persist per client + tax year | Session-only tool loses imported data; must feed the client's ITR12 | ✓ Good — shipped v1.0 |
| Import: CSV + XLSX + SARS eLogbook auto-detect | Clients keep logbooks in Excel; official SARS template is .xlsx | ✓ Good — shipped v1.0 |
| Split tax-tools.tsx monolith rather than patch | Root cause of freeze is architecture, not one hot loop | ✓ Good — render isolation Profiler-verified |
| Individual Tax only this milestone | Focused delivery | ✓ Good — full module shipped |
| Tax years 2025–2027 | Current filing season + provisional year | ✓ Good |
| Client-side merge of `{ record, travelResult }` via Server Actions, not `revalidatePath` per edit | Per-trip edits must stay paint-fast at 10k scale | ✓ Good — PERF-03 met |
| `@tanstack/react-virtual` for trip/preview tables | React 19 peer support; bounded DOM at 10k+ | ✓ Good |
| Encode MEDIUM-confidence SARS interpretations as loud-failing tests, flag for practitioner sign-off, don't block | Ship the correction (net improvement) without silently shipping an unverified reading | ⚠️ Revisit — 4 items await sign-off |

---
*Last updated: 2026-07-07 after v1.0 milestone*
