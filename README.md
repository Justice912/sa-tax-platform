# TaxOps ZA Desktop (MVP Foundation)

Production-oriented MVP scaffold for a South African tax compliance and SARS workflow platform, now runnable as a desktop app.

## What is included

- Next.js (App Router) + TypeScript architecture
- Role-based authentication scaffold (NextAuth credentials)
- Firm and client management module scaffold
- SARS workflow / case tracker scaffold with activity timeline
- ITR12 workflow workspace with 2026 core calculation scaffolds (review-required)
- Individual tax calculator (2026 scaffold) with TaxOps-branded downloadable PDF report
- Tax reference knowledge base module scaffold (illustrative entries)
- Document metadata management module scaffold
- Deadline summary and reminder-ready model
- Audit log model and dashboard visibility
- Prisma schema covering MVP entities + Phase 2 placeholders
- Seed script with sample South African categories and cases
- Unit test suite (Vitest) + e2e smoke test scaffold (Playwright)

## Important compliance notes

- Sample legal content is illustrative only.
- Outputs from this system require professional review and legal verification before filing with SARS.

## Tech stack

- Next.js + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- NextAuth
- Electron (desktop runtime shell)
- Zod
- Vitest + Playwright

## Project structure (high level)

- `src/app` app-router pages and layouts
- `src/components` reusable UI and layout components
- `src/modules` domain modules and business services
- `src/lib` shared auth, environment, utility, RBAC helpers
- `src/server` demo data provider for MVP scaffolding
- `prisma` schema and seed script
- `docs/plans` design and implementation docs
- `desktop` Electron runtime and local orchestration scripts

## Setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Update `.env` values:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `DEMO_MODE` (`true` for demo-data mode)

3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client:

```bash
npm run db:generate
```

5. Run migrations (first setup):

```bash
npm run db:migrate
```

6. Seed sample data:

```bash
npm run db:seed
```

7. Run web dev server (optional):

```bash
npm run dev
```

8. Run desktop app (recommended for development):

```bash
npm run desktop:dev
```

9. Build desktop app runtime bundle:

```bash
npm run desktop:bundle
```

10. Create Windows installer (`.exe`):

```bash
npm run desktop:dist
```

## Demo login accounts

All seeded users use password `ChangeMe123!`:
- `admin@ubuntutax.co.za`
- `practitioner@ubuntutax.co.za`
- `reviewer@ubuntutax.co.za`
- `staff@ubuntutax.co.za`

## Tests

Unit tests:

```bash
npm run test
```

E2E smoke test:

```bash
npm run test:e2e
```

## Next milestones

1. Replace demo adapters with Prisma-backed repositories and server actions across all modules.
2. Introduce queue worker for reminders, SLA monitoring, and escalation notifications.
3. Expand workflow engines for ITR14/VAT201/EMP201/EMP501 and provisional tax.
4. Add rules engine with year/version-effective tax logic and configuration UI.
5. Add dispute and appeal assembly automation.
6. Add client portal and secure document exchange.
7. Add optional AI-assisted extraction with mandatory human review gates.

## ITR12 phase routes

- `/itr12` ITR12 workspace list
- `/itr12/[caseId]` ITR12 workflow overview and transition timeline
- `/itr12/[caseId]/workpapers` workpaper schedules
- `/itr12/[caseId]/calculation` core scaffold calculations (review required)

## Individual tax routes

- `/individual-tax` assessment list
- `/individual-tax/[assessmentId]` assessment detail and line-item breakdown
- `/reports/individual-tax/[assessmentId]/print` print-style report page
- `/api/reports/individual-tax/[assessmentId]/pdf` downloadable PDF endpoint

## PDF generation notes

- PDF export uses Playwright rendering of the print route.
- In production, ensure Playwright browser binaries are installed in deployment environments.

## Desktop commands

- `npm run desktop:dev` starts Next.js dev server and opens Electron desktop shell.
- `npm run desktop:bundle` builds Next.js standalone output and prepares static/public assets.
- `npm run desktop:start` launches Electron against local standalone build (no external web server required).
- `npm run desktop:dist` creates NSIS installer artifacts under `dist/desktop`.

## Desktop signing and branding

- Optional app icon path: `build/icon.ico`
- If `build/icon.ico` exists, desktop installer build automatically uses it.
- Signed build credentials (optional):
  - `CSC_LINK` (e.g. `file:///C:/path/to/certificate.pfx`)
  - `CSC_KEY_PASSWORD`
- Build mode controls:
  - `TAXOPS_FORCE_SIGNED=true` to require signed build (fails if cert env vars are missing)
  - `TAXOPS_UNSIGNED=true` to force unsigned build

