# Testing Patterns

**Analysis Date:** 2026-07-02

## Test Framework

**Runner:**
- Vitest 4.0.0
- Config: `vitest.config.ts`
- Environment: jsdom (browser DOM simulation)
- Setup file: `src/test/setup.ts` (imports `@testing-library/jest-dom/vitest`)

**Assertion Library:**
- Vitest built-in expect (Chai-based)
- `@testing-library/jest-dom` for DOM matchers (`toBeInTheDocument()`, `toHaveValue()`, etc.)

**Run Commands:**
```bash
npm test                 # Run all tests (single run)
npm run test:watch      # Watch mode during development
npm run test:e2e        # Playwright E2E tests (separate runner)
```

## Test File Organization

**Location:**
- Colocated with source files in same directory
- E2E tests separate in `playwright.config` (if configured)

**Naming:**
- `*.test.ts` for non-component logic tests (services, utilities, validation)
- `*.test.tsx` for React component tests

**Structure:**
```
src/
├── modules/
│   ├── estates/
│   │   ├── service.ts
│   │   ├── service.test.ts              # Main service tests
│   │   ├── validation.ts
│   │   ├── validation.test.ts           # Zod schema tests
│   │   ├── types.ts
│   │   ├── repository.ts
│   │   ├── repository.test.ts
│   │   └── engines/
│   │       ├── cgt/
│   │       │   ├── calculation.ts
│   │       │   └── calculation.test.ts
│   │       └── [other engines with parallel structure]
│   └── [other modules]
├── components/
│   ├── estates/
│   │   ├── estate-dashboard.tsx
│   │   └── estate-dashboard.test.tsx
│   └── [other components]
└── test/
    └── setup.ts                         # Global test setup
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

describe("domain or feature name", () => {
  beforeEach(() => {
    // Setup per test
  });

  afterEach(() => {
    // Cleanup per test
  });

  it("describes specific behavior or acceptance criterion", () => {
    // Arrange
    const input = { /* data */ };
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toMatch(expectedBehavior);
  });

  it("another test case", () => {
    // ...
  });
});
```

**Patterns:**
- Setup: `beforeEach()` resets mocks and prepares fixture data
- Teardown: `afterEach()` clears mocks with `vi.clearAllMocks()` or `vi.resetAllMocks()`
- Assertion: Use specific matchers (not generic `.toBe()` for objects)
- Test names: descriptive phrases explaining behavior, not "test X"

## Mocking

**Framework:** Vitest's `vi` object (replicates Jest API)

**Patterns:**
```typescript
// Module mocking (hoisted to top — Vitest automatically hoists vi.mock calls)
vi.mock("@/lib/browser-pool", () => ({
  withPooledPage,
}));

vi.mock("next-auth/next", () => ({
  getServerSession,
}));

// Function mocking in tests
const getServerSession = vi.fn();
getServerSession.mockResolvedValue({ user: { id: "user_001" } });

// Multiple return values
vi.mocked(chromium.launch).mockResolvedValueOnce(browser1);
vi.mocked(chromium.launch).mockResolvedValueOnce(browser2);

// Implementation mocking
vi.mocked(chromium.launch).mockImplementation(async (fn) => {
  return fn({ setContent: mockSetContent, pdf: mockPdf });
});
```

**Reset Strategy:**
```typescript
beforeEach(() => {
  vi.resetAllMocks();  // Clears all mocks completely
  // Re-establish implementations after reset if needed
  withPooledPage.mockImplementation(async (fn) => fn(mockPage));
});

afterEach(() => {
  vi.clearAllMocks();  // Clears call history but preserves implementations
});
```

**What to Mock:**
- External dependencies: `@playwright/test`, `next-auth`, `@prisma/client` (when testing logic, not DB)
- Third-party services: API clients
- Browser/Node.js APIs: `fs`, `path` when file I/O not central to test

**What NOT to Mock:**
- Zod validation (test with real schemas to catch parsing errors)
- Internal service methods (test integration between modules)
- Database models when testing ORM integration (mock only the client itself)
- React components when testing parent component interactions (render real children)

**Mock Factory Pattern:**
```typescript
// Closure-based factories for creating fresh mock objects per test
function makeMockPage(): MockPage {
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    isClosed: vi.fn().mockReturnValue(false),
  };
}

function makeMockBrowser(pages: MockPage[]): MockBrowser {
  let pageIndex = 0;
  return {
    isConnected: vi.fn().mockReturnValue(true),
    newPage: vi.fn().mockImplementation(() => {
      const page = pages[pageIndex++] ?? makeMockPage();
      return Promise.resolve(page);
    }),
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockImplementation((event: string, handler: () => void) => {
      if (event === "disconnected") {
        browser._disconnectHandler = handler;
      }
    }),
    _disconnectHandler: null,
  };
}

// Usage in beforeEach
let mockBrowser: MockBrowser;
let mockPages: MockPage[];

beforeEach(() => {
  mockPages = [makeMockPage(), makeMockPage(), makeMockPage(), makeMockPage()];
  mockBrowser = makeMockBrowser(mockPages);
  vi.mocked(chromium.launch).mockResolvedValue(
    mockBrowser as unknown as Awaited<ReturnType<typeof chromium.launch>>,
  );
});
```

## Fixtures and Factories

**Test Data:**
- Import from `@/server/demo-data` for seeded demo entities
- Inline fixture objects for isolated unit tests
- Example from `src/components/estates/estate-dashboard.test.tsx`:
  ```typescript
  const estate: EstateDetailRecord = {
    id: "estate_001",
    clientId: "client_003",
    estateReference: "EST-2026-0001",
    // ... full entity with all required fields
  };
  ```

**Location:**
- Colocated test fixtures defined at top of test file
- Shared demo data imported from `src/server/demo-data.ts`
- Factory functions defined inline or as helper modules when complex

**Cleanup:**
- Demo data arrays modified in tests are restored:
  ```typescript
  const index = demoIndividualTaxAssessments.findIndex((entry) => entry.id === created.id);
  if (index >= 0) {
    demoIndividualTaxAssessments.splice(index, 1);
  }
  ```

## Coverage

**Requirements:** Not enforced (no coverage thresholds configured)

**View Coverage:**
- Not configured in vitest.config — coverage reporting not set up

## Test Types

**Unit Tests:**
- Scope: Individual functions, schema validation, calculations
- Approach: Mock all external dependencies, test pure logic
- Frequency: Majority of test suite
- Example: `src/modules/itr12/validation.test.ts` tests Zod schemas with valid/invalid inputs

**Integration Tests:**
- Scope: Service methods composed from multiple modules, form submission flows
- Approach: Use real Zod schemas, mock only external services (DB, HTTP)
- Frequency: Moderate coverage for service methods
- Example: `src/modules/individual-tax/service-interactive.test.ts` tests full flow from form input to calculation

**E2E Tests:**
- Framework: Playwright (`@playwright/test` 1.56.1)
- Configuration: `playwright.config` (if present in root)
- Command: `npm run test:e2e`
- Note: Not extensively explored in codebase; primary testing is unit/integration

**Component Tests:**
- Framework: Vitest + React Testing Library
- Scope: Component rendering, user interactions, prop validation
- Approach: Render component with test props, query DOM, assert on output
- Example: `src/components/estates/estate-create-wizard.test.tsx`

## Common Patterns

**Async Testing:**
```typescript
it("creates and calculates a saved assessment", async () => {
  const created = await createIndividualTaxAssessmentForClient({
    clientId: "client_001",
    referenceNumber: "1234567890",
    // ...
  });

  const loaded = await getIndividualTaxAssessmentResult(created.id);
  expect(loaded).not.toBeNull();
  expect(loaded?.assessment.taxpayerName).toBe("Interactive Taxpayer");
});
```

**Validation Testing:**
```typescript
it("accepts valid itr12 profile payload", () => {
  const parsed = itr12ProfileSchema.safeParse({
    assessmentYear: 2026,
    periodStart: "2025-03-01",
    periodEnd: "2026-02-28",
    taxpayerCategory: "INDIVIDUAL",
  });

  expect(parsed.success).toBe(true);
});

it("rejects invalid date formats in itr12 profile", () => {
  const parsed = itr12ProfileSchema.safeParse({
    assessmentYear: 2026,
    periodStart: "03/01/2025",  // Invalid format
    periodEnd: "02/28/2026",
    taxpayerCategory: "INDIVIDUAL",
  });

  expect(parsed.success).toBe(false);
});
```

**Error Testing:**
```typescript
it("renders returned validation errors without crashing", () => {
  const initialState: EstateCreateFormState = {
    message: "Please review the highlighted estate details before saving.",
    fieldErrors: {
      taxNumber: "Too small: expected string to have >=10 characters",
      estateTaxNumber: "Too small: expected string to have >=10 characters",
      executorEmail: "Invalid email address",
    },
  };

  render(
    <EstateCreateWizard
      action={async (state) => state}
      cancelHref="/estates"
      defaultDateOfDeath="2026-03-11"
      initialState={initialState}
    />,
  );

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Please review the highlighted estate details before saving.",
  );
  expect(screen.getByText("Invalid email address")).toBeInTheDocument();
});
```

**Component Rendering with Props:**
```typescript
it("renders the core deceased, executor, and matter sections", () => {
  render(
    <EstateCreateWizard
      action={async (state) => state}
      cancelHref="/estates"
      defaultDateOfDeath="2026-03-11"
    />,
  );

  expect(screen.getByText("Deceased Details")).toBeInTheDocument();
  expect(screen.getByLabelText("Deceased full name")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save Estate" })).toBeInTheDocument();
}, 15000);  // Explicit timeout for component tests
```

**Mock Closure State Capture:**
```typescript
// For complex scenarios where per-test setup is needed:
let mockSetContent: ReturnType<typeof vi.fn>;
let mockPdf: ReturnType<typeof vi.fn>;

const withPooledPage = vi.fn(async (fn: (page: unknown) => Promise<unknown>) => {
  return fn({ setContent: mockSetContent, pdf: mockPdf });
});

beforeEach(() => {
  vi.resetAllMocks();
  mockSetContent = vi.fn().mockResolvedValue(undefined);
  mockPdf = vi.fn().mockResolvedValue(Buffer.from("pdf-placeholder"));
  // Restore implementation after reset
  withPooledPage.mockImplementation(async (fn: (page: unknown) => Promise<unknown>) => {
    return fn({ setContent: mockSetContent, pdf: mockPdf });
  });
});
```

**Snapshot Testing:**
- Not observed in codebase; explicit assertions preferred

## Test Isolation

**State Isolation:**
- `beforeEach()` creates fresh mock state per test
- Demo data arrays saved and restored within test if modified
- Global demo object mutations cleaned up after test runs

**Concurrent Execution:**
- Tests run in parallel by default (Vitest behavior)
- Shared demo data may have race conditions if not carefully managed
- Consider test isolation issues if tests fail sporadically

---

*Testing analysis: 2026-07-02*
