# Codebase Structure

**Analysis Date:** 2026-07-02

## Directory Layout

```
sa-tax-platform/
├── src/                         # Main application source
│   ├── app/                     # Next.js app directory (pages, layouts, API routes)
│   │   ├── (auth)/              # Auth group layout (login, public routes)
│   │   ├── (protected)/         # Protected routes (require authentication)
│   │   ├── api/                 # API endpoints
│   │   ├── executor/            # Executor portal (estate access)
│   │   ├── reports/             # Report generation pages
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home page redirect
│   │   ├── globals.css          # Global styles
│   │   └── providers.tsx        # React providers setup
│   ├── components/              # React components organized by domain
│   │   ├── common/              # Shared components (not domain-specific)
│   │   ├── dashboard/           # Dashboard-related components
│   │   ├── estates/             # Estate workspace, phase2 components
│   │   ├── individual-tax/      # Tax tools, estimate forms, results display
│   │   ├── layout/              # App shell, navigation, sidebar
│   │   ├── reports/             # Report display, export components
│   │   └── ui/                  # Base UI primitives (buttons, cards, tables, etc.)
│   ├── modules/                 # Business logic organized by domain
│   │   ├── audit/               # Audit logging service and writer
│   │   ├── cases/               # Case management service and repository
│   │   ├── clients/             # Client management with multi-type support
│   │   ├── dashboard/           # Dashboard aggregation service
│   │   ├── deadlines/           # Deadline engine and service
│   │   ├── documents/           # Document storage and service
│   │   ├── estates/             # Estate module (largest, see below)
│   │   ├── individual-tax/      # Individual tax calculations (focus module)
│   │   ├── itr12/               # ITR-12 workflow and calculations
│   │   ├── knowledge-base/      # KB articles and search service
│   │   └── shared/              # Shared types and validation
│   ├── lib/                     # Utilities and infrastructure
│   │   ├── auth-options.ts      # NextAuth configuration
│   │   ├── db.ts                # Prisma singleton
│   │   ├── rbac.ts              # Role-based access control
│   │   ├── env.ts               # Environment helpers
│   │   ├── utils.ts             # General utilities (formatting, dates)
│   │   ├── disclaimers.ts       # Legal disclaimers for reports
│   │   └── browser-pool.ts      # Browser session management for desktop
│   ├── server/                  # Server-side utilities
│   │   ├── demo-data.ts         # Demo dataset bootstrap
│   │   └── golden-demo/         # Golden demo restore functionality
│   ├── desktop/                 # Desktop app integration (symlink to root)
│   ├── types/                   # Global TypeScript types
│   │   ├── next-auth.d.ts       # NextAuth session type extensions
│   │   └── taxops-desktop.d.ts  # Desktop API type extensions
│   └── test/                    # Test utilities and setup
│       └── setup.ts             # Vitest global setup
├── prisma/                      # Database schema and migrations
│   ├── schema.prisma            # Full Prisma schema definition
│   └── seed.ts                  # Database seeding script
├── desktop/                     # Electron desktop app (root level)
│   ├── main.cjs                 # Electron main process entry
│   ├── preload.cjs              # Electron preload script for IPC
│   ├── run-desktop-dev.cjs      # Dev mode launcher
│   ├── run-desktop-prod.cjs     # Production launcher
│   ├── run-desktop-dist.cjs     # Distribution builder
│   └── ...                      # Other desktop utilities
├── public/                      # Static assets (images, fonts)
├── storage/                     # Demo mode file storage (git-ignored in production)
│   ├── demo-individual-tax-assessments.json
│   ├── demo-clients.json
│   ├── demo-estates.json
│   ├── demo-estate-engine-runs.json
│   └── uploads/                 # User-uploaded documents
├── docs/                        # Documentation
├── tests/                       # E2E and integration tests
├── .planning/                   # GSD planning documents
│   └── codebase/                # Codebase analysis (ARCHITECTURE.md, etc.)
├── middleware.ts                # Next.js middleware (auth, RBAC guards)
├── next.config.ts               # Next.js configuration
├── vitest.config.ts             # Vitest unit test configuration
├── playwright.config.ts         # Playwright E2E configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies and scripts
└── ...other config files
```

## Directory Purposes

**`src/app/`** (Next.js App Router)
- Purpose: Page routing, layouts, API endpoints using file-based routing
- Contains: Route segments, API handlers, server components
- Key files: `layout.tsx` (root layout), `page.tsx` (home redirect), `providers.tsx` (React setup)

**`src/app/(protected)/`** (Authenticated Pages)
- Purpose: All pages requiring user authentication and authorization
- Contains: Dashboard, clients, cases, individual-tax, estates, itr12, knowledge-base
- Pattern: Group layout enforces auth via `layout.tsx`; each page is a server component

**`src/app/(protected)/individual-tax/`** (Individual Tax Module UI)
- Purpose: User interface for tax assessments and tools
- Contains: 
  - `page.tsx`: List assessments with data table
  - `new/page.tsx`: Create new assessment form
  - `tools/page.tsx`: Tax tools calculators (travel, medical, CGT, etc.)
  - `[assessmentId]/page.tsx`: View assessment detail
  - `[assessmentId]/edit/page.tsx`: Edit assessment
- Depends on: `src/modules/individual-tax/service.ts`, `src/components/individual-tax/`

**`src/app/(protected)/estates/`** (Estate Module UI)
- Purpose: Estate management workflow (largest UI area)
- Contains: Estate list, create, detail pages with sub-routes for assets, beneficiaries, tax engines, liquidation
- Pattern: `[estateId]/` prefix with sub-routes like `/assets`, `/tax/cgt`, `/filing-pack`

**`src/app/api/`** (API Routes)
- Purpose: Next.js API route handlers
- Contains: 
  - `auth/[...nextauth]/route.ts`: NextAuth callback handlers
  - `reports/individual-tax/[assessmentId]/pdf/route.ts`: PDF generation
  - `reports/estates/[estateId]/filing-pack/route.ts`: Filing pack export
- Pattern: Dynamic routes with `[...slug]` catch-all for NextAuth

**`src/components/`** (React Components)
- Purpose: Reusable UI components organized by domain
- Sub-directories:
  - `ui/`: Base components (Button, Card, DataTable, Modal, Form, etc.)
  - `common/`: Cross-domain components (Header, Sidebar, etc.)
  - `individual-tax/`: TaxTools, EstimateWizard, EstimateResult
  - `estates/`: EstateWorkspaceLayout, phase2 components
  - `reports/`: Report viewers, export UI
- Pattern: Components are either Server Components (fetching data) or Client Components (interactivity)

**`src/modules/`** (Business Logic - Domain Modules)
- Purpose: Each subdirectory is an independent domain with service, repository, types, validation
- Modules:
  - `individual-tax/`: Calculation engine, rulepacks, schedules, validation, repository
  - `estates/`: Estate CRUD, engines (CGT, pre-death, post-death, estate-duty), year-packs, forms
  - `itr12/`: ITR-12 form workflow, calculations, repository
  - `clients/`: Client CRUD, multi-type support, audit trail
  - `cases/`: Case management, workflow tracking
  - `audit/`: Audit log writing and retrieval
  - `documents/`: Document storage service
  - `dashboard/`: Dashboard metrics aggregation
  - `knowledge-base/`: KB article search and retrieval
  - `shared/`: Common types, shared validation schemas

**`src/modules/individual-tax/`** (Individual Tax Module - Core Logic)
- Purpose: Tax calculation engine for individuals (focus area)
- Contains:
  - `types.ts`: All interfaces (`IndividualTaxRulePack`, `IndividualTaxCalculation`, `NearEfilingIndividualTaxInput`, etc.)
  - `service.ts`: Create/read assessment operations, audit logging
  - `repository.ts`: Persistence layer (Prisma or file-based demo)
  - `calculation-service.ts`: Main tax computation engine
  - `schedules/`: Schedule calculators (employment, travel, medical, rental, interest, sole-proprietor)
  - `rules-2024.ts` through `rules-2027.ts`: Annual SARS rulepacks
  - `rulepack-registry.ts`: Registry to look up rulepack by year
  - `validation.ts`: Zod schemas for input validation
  - `report-transformer.ts`: Transform calculations to report structure
  - `near-efiling-form.ts`: eFiling form generation
  - Test files: `*.test.ts` (vitest unit tests)

**`src/modules/estates/`** (Estate Module - Complex Domain)
- Purpose: Estate administration and tax compliance
- Sub-directories:
  - `engines/`: Four tax calculation engines
    - `cgt/`: Capital gains tax
    - `pre-death/`: Pre-death income
    - `post-death/`: Post-death income
    - `estate-duty/`: Estate duty calculation
    - `valuation/`: Asset valuation
    - Each has: `types.ts`, `service.ts`, `calculation.ts`, `validation.ts`
  - `forms/`: DOCX report generation (Rev 267, LD account, J192, J190, etc.)
  - `year-packs/`: Tax year configurations and validations
  - `phase2/`: Modern UI workspace components
  - Root: `service.ts`, `repository.ts`, `types.ts`, `validation.ts`, `checklist.ts`, `liquidation.ts`

**`src/lib/`** (Infrastructure & Utilities)
- Purpose: Cross-module utilities and configuration
- Key files:
  - `db.ts`: Prisma client singleton with NODE_ENV-aware logging
  - `auth-options.ts`: NextAuth configuration
  - `rbac.ts`: Role-based access control with permission matrix
  - `env.ts`: Environment variable helpers (demo mode detection)
  - `utils.ts`: General utilities (formatting, tax year calculation)
  - `disclaimers.ts`: Legal disclaimers for tax reports
  - `browser-pool.ts`: Browser session management for headless browser tasks

**`src/components/individual-tax/`** (Individual Tax UI)
- Purpose: Components for tax calculations and visualization
- Files:
  - `tax-tools.tsx`: Main tax tools calculator UI (client component with all calculator tabs)
  - `estimate-wizard.tsx`: Multi-step form for creating estimates
  - `estimate-result.tsx`: Display calculated results

**`src/modules/estates/engines/`** (Estate Tax Engines)
- Purpose: Modular tax calculation engines for estates
- Pattern: Each engine (CGT, pre-death, post-death, estate-duty) follows same structure:
  - `types.ts`: Engine-specific types
  - `service.ts`: Orchestration (create run, approve run)
  - `calculation.ts`: Core computation logic
  - `validation.ts`: Input validation
  - Root `service.ts`: Unified engine service coordinator

**`prisma/`** (Database)
- Purpose: Prisma ORM schema and migrations
- Files:
  - `schema.prisma`: Full database schema (models for User, Client, Estate, IndividualTaxAssessment, etc.)
  - `seed.ts`: Seeding script for demo data
- Pattern: Schema defines both Prisma models and database constraints

**`storage/`** (Demo File Storage)
- Purpose: File-based persistence when demo mode is active
- Pattern: Repository detects `isDemoMode()` and reads/writes JSON files instead of Prisma
- Files:
  - `demo-individual-tax-assessments.json`: Assessment records
  - `demo-clients.json`: Client records
  - `demo-estates.json`: Estate records
  - `uploads/`: User-uploaded documents (DOCX, PDF)
- Use case: Desktop app and local development without database setup

**`desktop/`** (Electron App)
- Purpose: Standalone Windows desktop application wrapper
- Key files:
  - `main.cjs`: Electron main process entry point
  - `preload.cjs`: Electron preload script for secure IPC
  - `run-desktop-dev.cjs`: Launches dev server + Electron window
  - `run-desktop-prod.cjs`: Production launcher
  - Other utilities for browser session management, file operations

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout sets up fonts, metadata, providers
- `src/app/page.tsx`: Home page redirects to `/dashboard` or `/login`
- `src/app/(protected)/layout.tsx`: Enforces authentication, renders sidebar
- `middleware.ts`: NextAuth middleware for protected routes

**Configuration:**
- `next.config.ts`: Next.js build and runtime config
- `tsconfig.json`: TypeScript compiler options with `@` alias to `src/`
- `vitest.config.ts`: Unit test runner configuration
- `playwright.config.ts`: E2E test configuration
- `prisma/schema.prisma`: Database schema

**Core Logic - Individual Tax:**
- `src/modules/individual-tax/service.ts`: Create/list/get assessments
- `src/modules/individual-tax/calculation-service.ts`: Tax computation engine
- `src/modules/individual-tax/rulepack-registry.ts`: Tax year rulepack lookup
- `src/modules/individual-tax/schedules/`: Schedule calculations (5 files)
- `src/modules/individual-tax/rules-2026.ts` (and 2024, 2025, 2027): Annual SARS rates

**Core Logic - Estates:**
- `src/modules/estates/service.ts`: Estate CRUD and workflow
- `src/modules/estates/engines/service.ts`: Tax engine coordinator
- `src/modules/estates/engines/{cgt,pre-death,post-death,estate-duty}/`: Engine implementations

**Testing:**
- `src/test/setup.ts`: Vitest global setup
- `src/modules/**/*.test.ts`: Unit tests co-located with source
- `src/**/*.test.tsx`: React component tests
- `tests/`: E2E tests using Playwright

**Reports & Export:**
- `src/app/api/reports/individual-tax/[assessmentId]/pdf/route.ts`: PDF generation
- `src/app/reports/individual-tax/[assessmentId]/print/page.tsx`: Print page
- `src/modules/individual-tax/report-transformer.ts`: Transform to report structure
- `src/modules/estates/forms/`: DOCX generation (Rev267, LD Account, etc.)

**Authentication & Authorization:**
- `src/lib/auth-options.ts`: NextAuth strategy and callbacks
- `src/lib/rbac.ts`: Role definitions and permission matrix
- `middleware.ts`: Route protection middleware

## Naming Conventions

**Files:**
- Service: `{domain}-service.ts` (e.g., `individual-tax-service.ts`, `case-service.ts`)
  - Exception: `service.ts` at module root for main domain orchestration
- Repository: `repository.ts` (always at module root)
- Calculation: `calculation-service.ts` or `calculation.ts` (pure functions)
- Validation: `validation.ts` (Zod schemas)
- Types: `types.ts` (TypeScript interfaces and types)
- Tests: `*.test.ts` or `*.test.tsx` (co-located with source)
- Schedules: `{schedule-name}-schedule.ts` (e.g., `employment-schedule.ts`, `travel-schedule.ts`)
- Rules: `rules-{year}.ts` (e.g., `rules-2026.ts`)
- React Components: `{PascalCase}.tsx` (e.g., `EstimateWizard.tsx`, `TaxTools.tsx`)

**Directories:**
- Domains: lowercase (individual-tax, estates, itr12, clients, cases)
- Sub-modules within domain: lowercase with hyphens (pre-death, estate-duty, phase2)
- Component groups: lowercase (ui, common, estates, individual-tax, reports)
- API routes: lowercase with brackets for dynamic segments ([estateId], [...nextauth])

**Functions & Variables:**
- Service functions: camelCase, descriptive verbs (createIndividualTaxAssessmentForClient, listEstates, approveEngineRun)
- Calculation functions: camelCase, calculation-focused names (calculateEmploymentSchedule, getBracketTax, getAgeBasedRebate)
- Constants: UPPER_SNAKE_CASE (TAX_BRACKETS, REBATES, ESTATE_STAGE_VALUES)
- React components: PascalCase (EstimateWizard, TaxTools, DataTable)

**Type/Interface Names:**
- Input types: `{Domain}{Feature}Input` (NearEfilingIndividualTaxInput, EstateCreateInput)
- Result types: `{Domain}{Feature}Result` or `{Domain}{Feature}` (IndividualTaxCalculation, IndividualTaxRulePack)
- Record types (persistent): `{Entity}Record` (IndividualTaxAssessmentRecord, EstateRecord, ClientRecord)

## Where to Add New Code

**New Individual Tax Feature:**
- Primary code: `src/modules/individual-tax/service.ts` (add service function) + `src/modules/individual-tax/types.ts` (new types)
- If calculation logic: `src/modules/individual-tax/calculation-service.ts` or new `src/modules/individual-tax/schedules/{feature}-schedule.ts`
- If validation: `src/modules/individual-tax/validation.ts` (add Zod schema)
- Tests: `src/modules/individual-tax/{feature}.test.ts` (or `service.test.ts` if integration)
- UI: `src/components/individual-tax/{Component}.tsx` (client component) + connect from `src/app/(protected)/individual-tax/{feature}/page.tsx`
- API endpoint (if needed): `src/app/api/individual-tax/[operation]/route.ts`

**New Estate Feature:**
- Similar to individual-tax but likely more complex due to engines
- If tax engine: Create `src/modules/estates/engines/{engine-name}/` with types.ts, service.ts, calculation.ts, validation.ts
- If workflow: Update `src/modules/estates/service.ts` and corresponding page in `src/app/(protected)/estates/[estateId]/{feature}/page.tsx`
- If form generation: Add to `src/modules/estates/forms/` (DOCX generation)

**New Component/Module:**
- Create directory: `src/modules/{new-domain}/`
- Add files: `service.ts`, `repository.ts`, `types.ts`, `validation.ts`
- Add tests: `{service}.test.ts`
- Wire into UI: Create pages in `src/app/(protected)/{new-domain}/`
- Add to middleware: Update `middleware.ts` matcher if protected

**Utilities:**
- Shared helpers: `src/lib/{utility-name}.ts`
- Cross-module types: `src/modules/shared/types.ts`
- General utilities: `src/lib/utils.ts`

**UI Base Components:**
- Add to: `src/components/ui/{ComponentName}.tsx`
- Export from: `src/components/ui/` (barrel file if exists, or direct import)

## Special Directories

**`.planning/codebase/`** (GSD Codebase Mapping)
- Purpose: Architecture and structure analysis documents
- Contents: ARCHITECTURE.md, STRUCTURE.md (this file), CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md
- Generated: By `/gsd:map-codebase` command
- Committed: Yes (part of repository)
- Note: Consumed by `/gsd:plan-phase` and `/gsd:execute-phase` commands

**`storage/`** (Demo Data Persistence)
- Purpose: File-based storage for demo mode (when database unavailable)
- Generated: At runtime by repositories
- Committed: No (git-ignored, demo data only)
- Pattern: JSON files matching schema structure

**`prisma/migrations/`** (Database History)
- Purpose: Prisma migration files (if migrations exist)
- Generated: By `prisma migrate dev` or `prisma migrate deploy`
- Committed: Yes (required for deployment)
- Note: Not yet visible in this repo (fresh schema)

**`.next/`** (Next.js Build Output)
- Purpose: Build artifacts from `npm run build`
- Generated: By Next.js build process
- Committed: No (git-ignored)
- Pattern: Contains `.next/standalone` for production deployment

**`dist/`** (Desktop Build Output)
- Purpose: Electron app distribution builds
- Generated: By `npm run desktop:dist`
- Committed: No (git-ignored)
- Pattern: Contains `.exe` installers for Windows

**`node_modules/`** (Dependencies)
- Purpose: Installed npm packages
- Generated: By `npm install`
- Committed: No (git-ignored)
- Pattern: Use lockfile (`package-lock.json` or `yarn.lock`) instead

---

*Structure analysis: 2026-07-02*
