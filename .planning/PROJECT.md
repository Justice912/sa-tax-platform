# SA Tax Platform — Individual Tax SARS Compliance Milestone

## What This Is

A South African tax practice platform (Next.js 16 + React 19, with an Electron desktop wrapper) used to manage clients, individual tax assessments (ITR12), and deceased estates. This milestone brings the **Individual Tax module** fully in line with current SARS requirements and formats — with the travel logbook as the flagship deliverable — and fixes a serious performance bug that freezes the UI on large logbook imports.

## Core Value

A tax practitioner can capture or import a client's travel logbook and complete an individual tax assessment knowing every figure and format matches current SARS requirements — without the app slowing down.

## Requirements

### Validated

<!-- Inferred from existing codebase (see .planning/codebase/) -->

- ✓ Individual tax assessment engine with per-year rulepacks (2024–2027): brackets, rebates, medical credits, CGT — existing
- ✓ Near-eFiling ITR12 input flow with Zod validation and audit logging — existing
- ✓ Schedule calculations: employment, travel (crude estimate), medical, interest, rental, sole proprietor — existing
- ✓ Tax tools page with 8 calculators: dashboard, travel logbook, medical credits, retirement, CGT, provisional tax, rental, home office — existing
- ✓ Client management with client-type tabs and disk persistence (demo mode) — existing
- ✓ Report generation (PDF/DOCX) via report transformers — existing
- ✓ Auth (NextAuth) with RBAC and route middleware — existing
- ✓ Deceased estates module with engine runs and SARS document uploads — existing

### Active

<!-- This milestone's scope. All locked decisions from user Q&A. -->

- [ ] SARS-compliant travel logbook: vehicle details (make, model, registration, cost price), tax-year opening/closing odometer readings, per-trip business travel details in the SARS elogbook format
- [ ] Both travel cost methods: deemed cost (per-year SARS rate tables) AND actual cost (fuel, maintenance, insurance, finance charges, wear-and-tear)
- [ ] Logbook result feeds the ITR12 travel schedule (source codes 3701/3702, deductions 4014/4015) — replacing the crude allowance×ratio estimate in `travel-schedule.ts`
- [ ] Logbooks persist per client + tax year in storage (like assessments), survive refresh/navigation, exportable for SARS audit
- [ ] Logbook import: robust CSV parsing (quoted fields, delimiters), Excel .xlsx support, auto-detection of the official SARS elogbook layout; manual trip capture retained
- [ ] Performance fix: large logbook imports must not freeze the UI — split the 2,148-line `tax-tools.tsx` monolith, virtualize/paginate trip tables, stop per-keystroke full re-renders and per-render date parsing
- [ ] Audit all 8 individual tax calculators against latest SARS requirements (medical credits s6A/s6B, retirement s11F, CGT, provisional tax para 19/20, rental, home office s23(b)) and close gaps
- [ ] Rate tables verified/completed for 2025, 2026 and 2027 years of assessment, including per-year deemed-cost travel rates in the rulepacks

### Out of Scope

- Estates / trusts / company modules — separate milestone; this one is Individual Tax only (user decision)
- 2024 year of assessment rate updates — only 2025–2027 in scope (user decision)
- Direct SARS eFiling integration/submission — platform prepares near-eFiling data, does not submit
- Mobile app — web + existing Electron desktop only

## Context

- **Brownfield:** codebase mapped in `.planning/codebase/` (ARCHITECTURE.md, STACK.md, CONCERNS.md, etc.)
- **Known bug (confirmed):** `src/components/individual-tax/tax-tools.tsx` is a 2,148-line monolithic client component. All calculator state lives in one component; every keystroke re-renders everything; trip tables render every row with no virtualization (lines ~921, ~1194); `new Date()` parsing per trip per render. Large CSV imports freeze the page.
- **Known gaps (confirmed):** logbook trips are `useState`-only (lost on refresh); CSV import splits naively on commas (breaks on quoted fields); no Excel import; no vehicle details/year odometer capture; deemed-cost only; `src/modules/individual-tax/schedules/travel-schedule.ts` estimates the claim as allowance × business-km ratio instead of SARS deemed/actual cost methods.
- **Existing patterns to follow:** domain modules with service/repository/validation layers, rulepacks per tax year via `rulepack-registry.ts`, pure calculation functions with colocated Vitest tests, Zod validation, file-based demo persistence in `storage/`.
- SARS references: official SARS travel elogbook (published per tax year), Interpretation Note guidance on travel allowances, annual Government Gazette deemed-cost rate tables.

## Constraints

- **Tech stack**: Next.js 16 / React 19 / TypeScript / Tailwind 4 / Prisma + file-demo storage — follow existing module patterns, no new frameworks
- **Compliance**: Figures and formats must match published SARS values per year of assessment (2025–2027); no invented rates — verify against official sources during research
- **Compatibility**: Existing assessments and stored demo data must keep working; changes to `travel-schedule.ts` must not break other schedules' tests
- **Performance**: Logbook with 10,000+ imported trips must remain responsive (import, scroll, edit)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full SARS elogbook format (vehicle details, year odometers, both cost methods) | Deemed-only shortcut fails audit requirements; practitioners need actual-cost comparison | — Pending |
| Logbooks persist per client + tax year | Session-only tool loses imported data; logbook must feed the client's ITR12 | — Pending |
| Import: CSV + XLSX + SARS elogbook auto-detect | Clients keep logbooks in Excel; official SARS template ships as .xlsx | — Pending |
| Split tax-tools.tsx monolith rather than patch | Root cause of freeze is architecture (single component state), not one hot loop | — Pending |
| Individual Tax only this milestone | Focused delivery; estates/other modules reviewed in a later milestone | — Pending |
| Tax years 2025–2027 | Current filing season + provisional year; 2024 excluded | — Pending |

---
*Last updated: 2026-07-02 after initialization*
