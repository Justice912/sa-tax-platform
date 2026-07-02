# Architecture

**Analysis Date:** 2026-07-02

## Pattern Overview

**Overall:** Multi-module layered Next.js 16 application with domain-driven architecture

**Key Characteristics:**
- Server-driven rendering with React 19 and TypeScript
- Domain modules (individual-tax, estates, itr12, clients) with independent services and repositories
- Prisma ORM for database persistence with file-based demo mode
- NextAuth 4.24 for authentication with role-based access control
- Tax calculation engines as pure functions with rulepacks per tax year
- Report generation pipelines transforming domain data to PDF/DOCX via report transformers

## Layers

**Presentation (UI Layer):**
- Purpose: Server Components and Client Components for rendering, forms, data display
- Location: `src/app/`, `src/components/`
- Contains: Pages, layouts, React components, forms, tax tools UI, estate workspace UI
- Depends on: Service layer, Zod schemas, UI component library
- Used by: End users via browser, Electron desktop app

**API Routes (Server API):**
- Purpose: Next.js API routes for server-side handlers and report generation
- Location: `src/app/api/`
- Contains: Auth routes (`/auth/[...nextauth]/route.ts`), report generation endpoints (`/reports/`)
- Depends on: Services, repositories, authentication middleware
- Used by: Frontend pages, desktop app, external integrations

**Service Layer (Business Logic):**
- Purpose: Orchestrates domain logic, validation, persistence, audit trail
- Location: `src/modules/{domain}/service.ts` (e.g., `src/modules/individual-tax/service.ts`, `src/modules/estates/service.ts`)
- Contains: Create/update/list/get operations, workflow orchestration, audit logging via `writeAuditLog()`
- Depends on: Repository layer, validation schemas, calculation engines, other domain services
- Used by: Pages, API routes, other services

**Repository Layer (Data Access):**
- Purpose: Abstracts data storage (Prisma DB or file-based demo JSON)
- Location: `src/modules/{domain}/repository.ts`
- Contains: CRUD operations, queries by ID/filter, demo mode fallbacks to disk storage
- Depends on: Prisma client, file system (demo mode), types
- Used by: Services

**Calculation Engines (Pure Functions):**
- Purpose: Domain-specific tax calculations and transformations
- Location: `src/modules/{domain}/calculation-service.ts` and `src/modules/{domain}/schedules/`
- Contains: Tax bracket calculations, schedule computations, rulepack-driven logic
- Depends on: Types, rulepacks (for individual-tax)
- Used by: Services, report transformers
- Pattern: Deterministic, no side effects, testable in isolation

**Rulepacks (Tax Year Configuration):**
- Purpose: Externalized tax rules per year (brackets, rebates, thresholds, exemptions)
- Location: `src/modules/individual-tax/rules-{year}.ts` (e.g., `rules-2024.ts` through `rules-2027.ts`)
- Contains: `IndividualTaxRulePack` objects with SARS rates of tax, medical credits, CGT exclusions, etc.
- Pattern: Immutable records imported via `rulepack-registry.ts`
- Used by: Calculation services to derive tax liability

**Validation Layer:**
- Purpose: Schema validation for all inputs
- Location: `src/modules/{domain}/validation.ts` and `src/modules/shared/schemas.ts`
- Contains: Zod schemas for input validation, transform rules
- Used by: Service layer before persistence

**Report Transformers (Data Transformation):**
- Purpose: Transform domain calculation results into report-ready structures
- Location: `src/modules/{domain}/report-transformer.ts`
- Contains: Functions mapping calculations to report sections, PDF/DOCX-ready payloads
- Depends on: Types, calculation results
- Used by: API report generation endpoints

**Middleware & Auth:**
- Purpose: Request authorization, role-based access control, estate route guards
- Location: `middleware.ts` (Express-like Next.js middleware), `src/lib/auth-options.ts`, `src/lib/rbac.ts`
- Contains: Route permission matrix, executor capacity checking, admin guards
- Depends on: NextAuth, NextResponse utilities
- Used by: All protected routes

**Utilities & Shared:**
- Purpose: Cross-module helpers and types
- Location: `src/lib/` (utilities), `src/modules/shared/` (shared types)
- Contains: Prisma singleton, formatting utilities (`formatDate`, `saTaxYearFromDate`), RBAC helpers
- Used by: All modules, components

## Data Flow

**Individual Tax Assessment Creation Flow:**

1. User navigates to `/individual-tax/new` page (`src/app/(protected)/individual-tax/new/page.tsx`)
2. Page renders form component (`EstimateWizard` in `src/components/individual-tax/estimate-wizard.tsx`)
3. User submits form with `NearEfilingIndividualTaxInput` or legacy `IndividualTaxInput`
4. Form POST to API endpoint (handled by Next.js API route or page form action)
5. Service layer validates input via `nearEfilingIndividualTaxInputSchema.parse(input)` in `src/modules/individual-tax/service.ts`
6. Calculation service runs via `calculateNearEfilingIndividualTaxEstimate()`:
   - Looks up rulepack via `getIndividualTaxRulePackByYear(assessmentYear)` in `src/modules/individual-tax/rulepack-registry.ts`
   - Executes schedule calculations (employment, travel, medical, rental, etc.) in `src/modules/individual-tax/schedules/`
   - Runs tax bracket calculation and rebate logic
   - Returns `IndividualTaxCalculation` with lines and summary
7. Repository persists result via `createNearEfilingAssessment()` (Prisma DB or demo file `demo-individual-tax-assessments.json`)
8. Audit log written via `writeAuditLog()` in `src/modules/audit/audit-writer.ts`
9. Assessment record returned and rendered on detail page

**Estate Tax Engine Calculation Flow:**

1. Estate service calls engine service in `src/modules/estates/engines/service.ts`
2. Engine service validates input, checks dependency states (approvals, staleness)
3. Specific engine runs (CGT, pre-death, post-death, estate-duty) via `src/modules/estates/engines/{engine}/service.ts`
4. Engine calculation via functions in `src/modules/estates/engines/{engine}/calculation.ts`
5. Results stored with approval status and audit trail
6. Returns `EstateEngineRun` with line-by-line calculations and validation status

**Report Generation Flow:**

1. User clicks "Export" or navigates to `/reports/individual-tax/{assessmentId}/print`
2. API endpoint in `src/app/api/reports/individual-tax/[assessmentId]/pdf/route.ts` is called
3. Service fetches assessment from repository
4. Calculation re-runs to ensure freshness
5. Report transformer converts calculation to structured report via `buildIndividualTaxReport()`
6. Report structure passed to document formatter (DOCX or PDF library)
7. Binary file streamed to client

**State Management:**

- **Transient form state**: React component state via `useState` (no global store)
- **Assessment state**: Persisted in Prisma DB or demo JSON files, retrieved via repository
- **Session state**: NextAuth session stored in JWT, available via `getServerSession(authOptions)`
- **Calculation state**: Deterministic (no state), recalculated on demand from inputs
- **Approval/review state**: Stored in assessment or engine run records; stale checking for dependencies

## Key Abstractions

**RulePack Abstraction:**
- Purpose: Encapsulates tax rules that change annually without code changes
- Examples: `INDIVIDUAL_TAX_RULEPACK_2026` in `src/modules/individual-tax/rules-2026.ts`
- Pattern: Immutable constant objects conforming to `IndividualTaxRulePack` type
- Access: Via `getIndividualTaxRulePackByYear(year)` which validates year and throws if unsupported

**Assessment Record Abstraction:**
- Purpose: Unified representation of tax assessments across legacy and near-eFiling modes
- Examples: `IndividualTaxAssessmentRecord` in `src/modules/shared/types.ts`
- Pattern: Stores both `input` (legacy) and `nearEfilingInput` (new format) in same record
- Allows mode-aware rendering and backward compatibility

**Estate Engine Run Abstraction:**
- Purpose: Represents a single calculation run with approval, dependency tracking, and staleness
- Examples: `EstateEngineRun` type in `src/modules/estates/engines/types.ts`
- Pattern: Service creates runs with status, approver can approve only if dependencies approved
- Enables audit trail and prevents invalid calculations

**Schedule Abstraction:**
- Purpose: Isolates tax schedule calculations (employment, travel, medical, etc.)
- Examples: Functions in `src/modules/individual-tax/schedules/{schedule-name}.ts`
- Pattern: Each schedule exports a calculation function receiving typed input, returning `IndividualTaxScheduleResult`
- Used by: Main calculation service to compose total tax

**Repository Pattern:**
- Purpose: Abstracts storage backend (Prisma or file)
- Pattern: Service layer calls repository methods (`createAssessment`, `listAssessments`, `getById`)
- Demo mode: Repository detects `isDemoMode()` in `src/lib/env.ts` and uses file I/O instead of Prisma
- Used by: All services depend on repositories, not directly on Prisma

## Entry Points

**Web Application Entry:**
- Location: `src/app/layout.tsx` (root layout) → `src/app/page.tsx` (index) → `src/app/(protected)/layout.tsx` (authenticated routes)
- Triggers: User navigates to `https://app.taxops.za/`
- Responsibilities: Sets up Next.js layouts, providers (auth, themes), global styles

**Protected Routes Entry:**
- Location: `src/app/(protected)/layout.tsx`
- Triggers: Any request to `/dashboard`, `/clients`, `/individual-tax`, etc.
- Responsibilities: Enforces authentication via NextAuth session, checks user role, renders sidebar/navigation

**Individual Tax Module Entry:**
- Location: `src/app/(protected)/individual-tax/page.tsx`
- Triggers: User navigates to `/individual-tax`
- Responsibilities: Fetches assessments list, renders data table, provides navigation to create/edit

**API Route Entries:**
- Location: `src/app/api/auth/[...nextauth]/route.ts` (authentication)
- Location: `src/app/api/reports/individual-tax/[assessmentId]/pdf/route.ts` (report generation)
- Triggers: POST/GET requests to `/api/auth/...` and `/api/reports/...`
- Responsibilities: Handle login, logout, session refresh; generate downloadable reports

**Desktop App Entry:**
- Location: `desktop/main.cjs` (Electron main process)
- Triggers: User launches TaxOps ZA desktop application
- Responsibilities: Spawns Electron window, loads Next.js standalone server, manages app lifecycle

**Middleware Entry:**
- Location: `middleware.ts`
- Triggers: Every request to protected routes before they reach pages/API
- Responsibilities: Validates auth token, checks route permissions, guards admin/executor paths

## Error Handling

**Strategy:** Validation-first with typed results, specific error messages, audit trail for failures

**Patterns:**

- **Validation Errors**: Zod schema parsing throws `ZodError` which is caught at service layer and re-thrown with context. Example in `src/modules/individual-tax/service.ts` line 49:
  ```typescript
  const parsedInput = individualTaxInputSchema.parse(input.input);
  ```
  If invalid, Zod throws; service catches and can wrap or log.

- **Business Logic Errors**: Service methods throw with descriptive messages. Example in `src/modules/estates/engines/service.ts` line 49:
  ```typescript
  if (hasBlockedDependencies(existing.dependencyStates)) {
    throw new Error("Cannot approve estate engine run while dependencies are stale or not approved.");
  }
  ```

- **Not Found Errors**: Repository returns `null` or undefined; service checks and throws. Example:
  ```typescript
  const assessment = await repository.getById(id);
  if (!assessment) {
    throw new Error("Assessment not found.");
  }
  ```

- **Calculation Edge Cases**: Calculation functions return safe defaults (0, empty array) rather than throwing. Example in `src/modules/individual-tax/calculation-service.ts`:
  ```typescript
  function getBracketTax(rulePack, taxableIncome) {
    const bracket = rulePack.taxBrackets.find(...);
    if (!bracket) return 0;  // Safe fallback
  }
  ```

- **Audit Trail**: Failures logged to audit trail via `writeAuditLog()` so practitioners can investigate. Example in `src/modules/individual-tax/service.ts` line 64:
  ```typescript
  await writeAuditLog({
    action: "INDIVIDUAL_TAX_ASSESSMENT_CREATED",
    entityType: "IndividualTaxAssessment",
    entityId: created.id,
    summary: `Created individual tax assessment for ${created.taxpayerName}.`,
  });
  ```

## Cross-Cutting Concerns

**Logging:** 
- Framework: `console` methods (no external logger configured in codebase)
- Patterns: Conditional logging based on `NODE_ENV` in `src/lib/db.ts` (Prisma logs only in dev)
- Audit logging: Domain events recorded via `writeAuditLog()` in `src/modules/audit/audit-writer.ts`

**Validation:** 
- Framework: Zod schemas in `src/modules/{domain}/validation.ts`
- Pattern: Service layer validates all external inputs before use. Calculations assume valid inputs.
- Example: `nearEfilingIndividualTaxInputSchema` validates full nested input structure including profile, employment, travel, etc.

**Authentication:** 
- Framework: NextAuth 4.24 with JWT strategy
- Providers: Configured in `src/lib/auth-options.ts` (specific providers not visible, likely database-backed)
- Session: Contains user ID, email, primary role (RoleCode: ADMIN, TAX_PRACTITIONER, REVIEWER, STAFF, CLIENT_PORTAL)
- Executor sessions: EXECUTOR role added at runtime for estate executor portal access (not persisted)

**Authorization (RBAC):**
- Framework: Custom role-based middleware and utility functions in `src/lib/rbac.ts`
- Pattern: Static route permission matrix (`ROUTE_PERMISSIONS`) maps routes to required roles
- Middleware: `middleware.ts` checks `hasPermission(role, requiredPermission)` before allowing access
- Special case: Executors redirected to estate overview if they lack permission for sub-routes

**Demo Mode:**
- Framework: Environment flag `isDemoMode()` in `src/lib/env.ts` detected by repositories
- Pattern: Repository checks mode and uses file I/O (`src/modules/{domain}/repository.ts`) instead of Prisma
- Persistence: Files stored in `storage/` directory (e.g., `demo-individual-tax-assessments.json`)
- Use case: Desktop app and local development without database dependency

---

*Architecture analysis: 2026-07-02*
