# Coding Conventions

**Analysis Date:** 2026-07-02

## Naming Patterns

**Files:**
- Service files: `{domain}-service.ts` (e.g., `client-service.ts`, `audit-service.ts`)
- Validation files: `validation.ts` per domain module
- Type definition files: `types.ts` per domain module
- Utilities: `{purpose}-utils.ts` or `utils.ts` for general utilities
- Action handlers: `{entity}-form.ts` (e.g., `create-form.ts` for form state and parsing)
- Test files: colocated alongside implementation with `.test.ts` or `.test.tsx` suffix
- Components: `{feature}-{component-name}.tsx` (e.g., `estate-dashboard.tsx`, `estimate-wizard.tsx`)
- Schemas: suffix filename with schema noun where applicable (`validation.ts` contains all schemas for domain)

**Functions:**
- camelCase for all function names
- Helper/internal functions start with lowercase verb: `build*()`, `calculate*()`, `resolve*()`, `read*()`, `get*()`, `to*()`, `make*()`
- Exported service functions use descriptive verbs: `createEstate()`, `updateClient()`, `listAuditLogsForEntities()`
- Factory functions: `build{DomainEntity}()` or `make{EntityType}()` (e.g., `buildEstateReference()`, `makeMockBrowser()`)
- Query functions: `get*()`, `list*()`, `find*()` (e.g., `getIndividualTaxAssessmentResult()`)
- Transformation functions: `to*()`, `transform*()`, `map*()` (e.g., `toClientRecord()`)
- Validation checks: `validate*()` or `should*()` (e.g., `validateEstateStageAdvance()`, `shouldRethrowEstateCreateActionError()`)
- Boolean predicates: `is*()`, `has*()` (e.g., `isDemoMode`, `hasPermission()`)

**Variables:**
- camelCase for all variables
- Enum-like constants and collections: UPPER_SNAKE_CASE (e.g., `ESTATE_STAGE_VALUES`, `rolePermissions`)
- Type narrowing: use `parsed`, `loaded`, `created` for results from database/parsing operations
- Demo/seed data: prefix with `demo*` (e.g., `demoClients`, `demoFirm`, `demoIndividualTaxAssessments`)
- Mock objects in tests: prefix with `mock*` (e.g., `mockBrowser`, `mockPage`)

**Types:**
- Interfaces: PascalCase, noun-based, suffix `Input` for form inputs or `Record` for persisted entities (e.g., `EstateCreateInput`, `ClientRecord`, `EstateDetailRecord`)
- Type aliases: PascalCase, use discriminated unions for domain-specific enums (e.g., `EstateStageCode`, `ClientStatus`)
- Generic type parameters: single letter or descriptive (e.g., `T`, `R`, `P` for Page in mocks)
- Extracted constants from union types: `const VALUES = [...] as const` then `type Alias = (typeof VALUES)[number]`

**Exports:**
- Named exports for services and utilities
- Default exports for React components
- Export both function and type when related (e.g., function `readEstateCreateInput()` exports its return type via interface)

## Code Style

**Formatting:**
- Prettier is NOT explicitly configured (uses default or integrated tools)
- ESLint: uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` for Next.js/TypeScript enforcement
- Line length: no hard limit observed, pragmatic wrapping
- Indentation: 2 spaces (standard Next.js)
- Semicolons: required at statement ends
- Trailing commas: used in multiline objects/arrays

**Linting:**
- ESLint config: `eslint.config.mjs` (flat config format, ESLint 9+)
- Rules: inherits Next.js core web vitals and TypeScript best practices
- Overrides: `desktop/**/*.cjs` allows `@typescript-eslint/no-require-imports` (CommonJS entry points)
- Ignored: `.next/**`, `out/**`, `build/**`, `dist/**`, `next-env.d.ts`

## Import Organization

**Order:**
1. Node.js built-ins (`node:crypto`, `node:path`, `node:fs`)
2. External dependencies (`react`, `next`, `zod`, `@testing-library/react`)
3. Type imports with `type` keyword when importing only types
4. Absolute imports using `@/*` path alias (configured in `tsconfig.json`)
5. Relative imports (avoided in favor of `@/*`)

**Path Aliases:**
- `@/*` resolves to `./src/*` (configured in `tsconfig.json`)
- Used for all imports within `src/` directory to avoid relative path complexity
- Examples: `@/lib/db`, `@/modules/estates/service`, `@/components/estates/estate-dashboard`

**Import Grouping:**
- Separate groups with blank lines
- Type imports placed immediately after their related value imports or grouped at end
- Example:
  ```typescript
  import { describe, expect, it } from "vitest";
  import type { EstateDetailRecord } from "@/modules/estates/types";
  ```

## Error Handling

**Strategy:**
- Explicit throw statements with descriptive error messages (e.g., `throw new Error("No firm is configured for estate creation.")`)
- Schema validation via Zod `safeParse()` returning discriminated union: `{ success: true; data }` or `{ success: false; error }`
- Form submission errors captured in state object: `EstateCreateFormState` with optional `message` and `fieldErrors` dict
- Try-catch used defensively in resource cleanup (page close, file I/O) — errors logged or ignored
- Empty catch blocks with `// ignore [type] errors` comment

**Patterns:**
- Validation errors extracted into field-level error map from Zod issues:
  ```typescript
  const fieldErrors: EstateCreateFormState["fieldErrors"] = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || field in fieldErrors) continue;
    fieldErrors[field as keyof EstateCreateInput] = issue.message;
  }
  ```
- Database operations assume success; errors bubble up to caller
- Next.js redirect errors re-thrown: `shouldRethrowEstateCreateActionError()` checks digest prefix
- Resource acquire/release patterns (browser pool): release happens in all paths including errors

## Logging

**Framework:** Console-based (no external logging service detected)

**Patterns:**
- No explicit logging visible in production code
- Errors thrown with descriptive messages instead of logged
- Test utilities and debug scenarios may use `console` methods

## Comments

**When to Comment:**
- Complex business logic (tax calculations, estate stage transitions)
- Non-obvious state management (demo vs. production mode branching)
- Workarounds or deviations from expected patterns
- Mock setup rationale in test files
- Section separators in large modules (horizontal rule comments: `// ---...`)

**JSDoc/TSDoc:**
- Not extensively used in main code
- Used sparingly for public APIs or complex function signatures
- Interface properties generally self-documenting via naming

**Example:**
```typescript
// Handle browser disconnect — clear all pool state so the next
// acquire() call triggers a fresh launch.
this.browser.on("disconnected", () => {
  this.browser = null;
  this.availablePages = [];
  this.busyPages.clear();
});
```

## Function Design

**Size:** 
- Functions kept focused on single responsibility
- Helper functions 5-30 lines common
- Service methods 10-50 lines typical

**Parameters:**
- Named objects preferred over positional params for functions with 3+ params
- Type safety enforced: all params typed, no implicit `any`
- Optional params use `?:` and `??` or `||` for defaults

**Return Values:**
- Explicit return types always annotated
- Use discriminated unions for success/failure: `{ success: true; data } | { success: false; error }`
- Async functions return `Promise<T>` with explicit T annotation
- Nullable returns preferred over `null | undefined` inconsistency

## Module Design

**Exports:**
- Services export primary operations as named exports
- Each domain module (e.g., `estates`, `clients`) is self-contained under `src/modules/{domain}/`
- Services composed from helpers: repository layer, calculation layer, validation layer
- Type definitions exported from `types.ts` per domain

**Barrel Files:**
- No barrel exports (index.ts files) observed; imports use full module paths
- Explicit imports required: `@/modules/estates/service` not `@/modules/estates`

**File Structure per Domain:**
- `{domain}/service.ts` — main service with public API
- `{domain}/types.ts` — TypeScript types and interfaces
- `{domain}/validation.ts` — Zod schemas
- `{domain}/repository.ts` — data access/store (when needed)
- `{domain}/forms/service.ts` — document generation service (estates-specific)
- `{domain}/engines/` — specialized calculation submodules (estates)
- `{domain}/schedules/` — schedule-specific logic (individual-tax)

---

*Convention analysis: 2026-07-02*
