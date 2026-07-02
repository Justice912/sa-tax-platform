# Architecture Patterns

**Domain:** SA tax practice platform — Individual Tax / SARS compliance milestone (persistent logbook + import pipeline + calculator UI refactor)
**Researched:** 2026-07-02

## Recommended Architecture

This is a brownfield integration, not a greenfield design. The codebase already has a proven pattern (domain module = types + validation + repository + service + pure calculation functions, consumed by client components). All three deliverables — logbook entity, import pipeline, calculator UI refactor — should be built as applications of that existing pattern, not as a parallel architecture.

```
┌─────────────────────────────────────────────────────────────────┐
│  UI Layer (src/components/individual-tax/, decomposed)          │
│                                                                   │
│  TaxToolsShell (tab router + shared calc context)                │
│   ├─ DashboardTab            ├─ MedicalCreditsTab                │
│   ├─ TravelLogbookTab        ├─ RetirementTab                    │
│   │   ├─ VehicleDetailsForm  ├─ CGTTab                           │
│   │   ├─ LogbookImportWizard ├─ ProvisionalTaxTab                │
│   │   │   (file → parse → map → preview → persist)               │
│   │   ├─ TripTable (virtualized)                                 │
│   │   └─ DeemedVsActualComparison                                │
│   ├─ RentalTab                                                   │
│   └─ HomeOfficeTab                                                │
└───────────────┬───────────────────────────────────────────────┘
                │ calls service functions (server actions / API routes)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  src/modules/logbook/  (NEW domain module)                       │
│   types.ts          — Vehicle, Trip, LogbookRecord                │
│   validation.ts      — Zod schemas incl. import row schema        │
│   repository.ts      — CRUD keyed by (clientId, taxYear)          │
│   service.ts         — create/update logbook, add/import trips,   │
│                         compute deemed vs actual, expose result    │
│                         shape consumed by travel-schedule.ts       │
│   calculation.ts      — deemed-cost & actual-cost engines          │
│   import/                                                          │
│     parse-csv.ts     — robust CSV (quoted fields, delimiters)      │
│     parse-xlsx.ts     — Excel via SheetJS                          │
│     detect-elogbook.ts — SARS official template auto-detection    │
│     column-mapping.ts — header → field inference + manual override │
└───────────────┬───────────────────────────────────────────────┘
                │ produces LogbookTravelResult (pure data)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  src/modules/individual-tax/schedules/travel-schedule.ts          │
│   calculateTravelSchedule(input: TravelScheduleInput)              │
│     input.logbook?: LogbookTravelResult  (NEW, optional)           │
│     input.legacyEstimate?: IndividualTaxTravelInput (existing)     │
│   → still returns IndividualTaxScheduleResult (unchanged contract) │
└───────────────┬───────────────────────────────────────────────┘
                │ consumed by
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  src/modules/individual-tax/calculation-service.ts (unchanged)    │
│  → IndividualTaxCalculation → report-transformer.ts → PDF/DOCX    │
└─────────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `src/modules/logbook/types.ts` | Defines `Vehicle`, `LogbookTrip`, `LogbookRecord` (per client+year), `LogbookTravelResult` (the shape fed to ITR12) | Imported by repository, service, calculation, UI, and by `travel-schedule.ts` |
| `src/modules/logbook/validation.ts` | Zod schemas for vehicle details, manual trip entry, and raw import rows (looser — strings/blanks tolerated pre-mapping) | Used by service before persistence and by import pipeline before preview commit |
| `src/modules/logbook/repository.ts` | CRUD for logbook records keyed by `(clientId, taxYear)`; demo-mode file I/O + Prisma path, mirroring `individual-tax/repository.ts` | Used only by service.ts; owns `storage/demo-logbooks.json` |
| `src/modules/logbook/service.ts` | Orchestrates: create/get logbook for client+year, add trip, bulk-import trips (transactional against one logbook), compute odometer totals, produce `LogbookTravelResult` (deemed + actual figures, warnings), write audit log | Called by API routes / server actions from the UI; calls repository, calculation.ts, validation.ts |
| `src/modules/logbook/calculation.ts` | Pure functions: `calculateDeemedCost(vehicle, trips, rulepack)`, `calculateActualCost(vehicle, trips, expenses)`, `compareTravelMethods(...)` | Called by service.ts only; receives per-year deemed-rate table from the individual-tax rulepack (not duplicated here) |
| `src/modules/logbook/import/parse-csv.ts` | Robust CSV parsing (quoted fields, delimiter sniffing) → raw rows + headers | Called from an API route or server action that receives the uploaded file buffer |
| `src/modules/logbook/import/parse-xlsx.ts` | Parse `.xlsx` (SheetJS) → raw rows + headers, same shape as CSV parser output | Same caller as above |
| `src/modules/logbook/import/detect-elogbook.ts` | Inspects headers against known SARS elogbook column signatures; returns a suggested column map or `null` | Called after parsing, before returning preview to UI |
| `src/modules/logbook/import/column-mapping.ts` | Types and helpers for the header→field map (`{ date: "Date", odometerStart: "Start KM", ... }`), used both for auto-detected and manually-adjusted mappings | Shared between server (validation of a submitted mapping) and client (mapping UI) |
| Rulepacks (`rules-2025.ts` … `rules-2027.ts`) | Add a `travelDeemedCostTable` field per year (the `DEEMED_COST_TABLE` currently hardcoded in the component) | Read by `logbook/calculation.ts`, never duplicated in UI |
| `travel-schedule.ts` | Accepts a richer input (logbook result OR legacy allowance/ratio fallback), still returns the same `IndividualTaxScheduleResult`, still pure/testable | Called by `calculation-service.ts`; the only integration point between the new logbook module and the existing ITR12 engine |
| `TaxToolsShell` (renamed/refactored `tax-tools.tsx`) | Tab routing only; hosts shared read-only context (e.g. active client/year) that child tabs consume; no calculator business state lives here | Renders `*Tab` components; each owns its own local state |
| `TravelLogbookTab` | Vehicle form, trip table, import wizard trigger, deemed-vs-actual toggle; fetches/saves via logbook service (not local-only `useState`) | Talks to `src/modules/logbook/service.ts` via API route/server action; renders `LogbookImportWizard`, `TripTable` |
| `LogbookImportWizard` | Multi-step UI: file select → parsing status → column-mapping form → preview table → confirm/persist | Calls `parse-csv`/`parse-xlsx` (via API route, or a Web Worker for large files) then `column-mapping` then commits via service |
| `TripTable` | Virtualized/paginated read+edit grid for trips (windowing, no per-row `new Date()` parsing on every render — pre-derive display strings once per data change) | Pure presentational component; receives trips + handlers as props |
| Other 7 calculator tabs (medical, retirement, CGT, provisional, rental, home office, dashboard) | Each becomes its own component with its own `useState`; no cross-tab state coupling | Read shared rulepack-derived constants from `src/modules/individual-tax/rules-*.ts` via existing calculation services, not local component constants |

### Data Flow

**Manual trip capture (existing flow, persisted):**
1. User opens Travel Logbook tab → `TravelLogbookTab` loads (or creates) the `LogbookRecord` for `(clientId, taxYear)` via a service call.
2. User adds/edits a trip in `TripTable` → local form state → on save, calls `logbookService.addTrip()` / `updateTrip()`.
3. Service validates (Zod), persists via repository (demo JSON file or Prisma), recomputes summary (odometer totals, business/private km).
4. UI re-renders from the returned updated `LogbookRecord`, not from re-deriving everything client-side.

**Import flow (new, addresses the freeze bug):**
1. User selects file in `LogbookImportWizard` → file handed to `parse-csv.ts` or `parse-xlsx.ts` based on extension.
2. Parsing runs off the main thread for large files (Web Worker, see Build Order note below) → returns `{ headers, rows }`.
3. `detect-elogbook.ts` attempts to auto-match headers to the official SARS elogbook layout; if matched, pre-fills the column map; otherwise the user maps columns manually via `column-mapping.ts` types.
4. Preview step shows a paginated/virtualized sample (not all 10,000 rows rendered at once) with per-row validation flags.
5. On confirm, rows are converted to `LogbookTrip[]` and sent to `logbookService.importTrips()` in the batch — one persistence write, one audit log entry, not one write per row.
6. Repository appends trips to the existing `LogbookRecord`, recomputes summary, returns updated record to the UI.

**Logbook → ITR12 feed (the core integration point):**
1. When the individual tax calculation runs (`calculation-service.ts` → `calculateNearEfilingIndividualTaxEstimate`), it needs travel schedule input.
2. Today: `input.travel: IndividualTaxTravelInput` (allowance + total/business km, entered by hand in the wizard) is passed directly to `calculateTravelSchedule`.
3. New: before calling `calculateTravelSchedule`, the caller (service.ts or a thin adapter) fetches the client's `LogbookRecord` for the assessment year via `logbookService.getTravelResult(clientId, taxYear)` if one exists, and passes it alongside/instead of the manual estimate.
4. `travel-schedule.ts` is extended to accept `{ hasTravelAllowance, travelAllowance, logbook?: LogbookTravelResult, legacyEstimate?: {...} }`. If `logbook` is present, use its deemed/actual-derived deduction (source codes 4014/4015 mapped correctly) and drop the crude ratio estimate; otherwise fall back to today's behavior unchanged. This keeps the function pure, testable, and backward-compatible with the existing `travel-schedule.test.ts`.
5. Result still flows into `calculation-service.ts` → `IndividualTaxCalculation` → report-transformer → PDF/DOCX exactly as before — no downstream changes needed.

**State ownership after refactor:**
- **Persisted business data** (vehicle, trips, logbook summary): owned by `src/modules/logbook/` and the database/demo file — never held only in component `useState`.
- **Persisted assessment data** (income, deductions, calculation result): owned by `src/modules/individual-tax/` as today — unchanged.
- **Transient UI state** (which tab is active, import wizard step, form-in-progress values before save, column-map draft): local `useState` inside the specific Tab/Wizard component — never lifted into a shared "god" state object.
- **Derived/pure calculations** (tax brackets, deemed cost, medical credits): computed via calls into `src/modules/individual-tax/` services or `src/modules/logbook/calculation.ts` — never recomputed inline in JSX render bodies from scratch on every keystroke; memoize with `useMemo` keyed on the actual persisted inputs.

## Patterns to Follow

### Pattern 1: New domain module for the logbook, not an extension of individual-tax

**What:** Create `src/modules/logbook/` as a sibling to `src/modules/individual-tax/`, following the exact file layout already used there (`types.ts`, `validation.ts`, `repository.ts`, `service.ts`, plus a `calculation.ts` and an `import/` subfolder for the pipeline).

**When:** Because the logbook has its own identity independent of a single assessment — one logbook per client+tax year, referenced by (and reusable across) potentially more than one assessment or recalculation, needs its own CRUD lifecycle (create vehicle, add trips over time, edit/delete individual trips), and its own audit trail entries distinct from "assessment created/updated." Nesting it inside `individual-tax/` would conflate two different lifecycles (a logbook is captured incrementally through the year; an assessment is calculated at a point in time) and would bloat an already-large module.

**Example:**
```typescript
// src/modules/logbook/types.ts
export interface Vehicle {
  make: string;
  model: string;
  registrationNumber: string;
  costPrice: number; // for deemed-cost bracket lookup
  acquisitionDate: string;
}

export interface LogbookTrip {
  id: string;
  date: string;
  odometerStart: number;
  odometerEnd: number;
  purpose: string;
  tripType: "BUSINESS" | "PRIVATE" | "MIXED";
  businessKm: number;
  privateKm: number;
}

export interface LogbookRecord {
  id: string;
  clientId: string;
  taxYear: number; // SupportedAssessmentYear from individual-tax/types
  vehicle: Vehicle;
  openingOdometer: number;
  closingOdometer: number;
  trips: LogbookTrip[];
  costMethod: "DEEMED" | "ACTUAL";
  actualExpenses?: {
    fuel: number; maintenance: number; insurance: number; financeCharges: number; wearAndTear: number;
  };
}

// Result shape consumed by travel-schedule.ts — decoupled from LogbookRecord internals
export interface LogbookTravelResult {
  totalKilometres: number;
  businessKilometres: number;
  deemedCostDeduction: number;
  actualCostDeduction?: number;
  recommendedMethod: "DEEMED" | "ACTUAL";
  sourceCode3701Amount: number; // travel allowance, if applicable
  sourceCode3702Amount: number; // reimbursive allowance, if applicable
  warnings: { code: string; message: string }[];
}
```

### Pattern 2: Deemed-rate tables live in rulepacks, not in components

**What:** Move `DEEMED_COST_TABLE` out of `tax-tools.tsx` (line ~19) into each year's rulepack file (`rules-2025.ts`, `rules-2026.ts`, `rules-2027.ts`) as a new field, e.g. `travelDeemedCostTable: { min, max, fixedCostAnnual, fuelCostPerKm, maintenanceCostPerKm }[]`, exposed through `IndividualTaxRulePack`.

**When:** Always — this is a SARS-published, per-year value (Government Gazette rates), exactly the kind of data the rulepack abstraction exists for. The current duplication (hardcoded once in the component, and the PROJECT.md notes it needs "per-year deemed-cost travel rates in the rulepacks") is itself the bug: there is currently only one hardcoded table for "2024/2025" and no differentiation for 2025, 2026, 2027. Centralizing in rulepacks means `rulepack-registry.ts` becomes the single source of truth, consistent with how brackets/rebates/medical credits already work.

**Example:**
```typescript
// src/modules/individual-tax/types.ts — extend IndividualTaxRulePack
export interface TravelDeemedCostBracket {
  min: number;
  max: number | null;
  fixedCostAnnual: number;
  fuelCostPerKm: number;
  maintenanceCostPerKm: number;
}

export interface IndividualTaxRulePack {
  // ...existing fields
  travelDeemedCostTable: TravelDeemedCostBracket[];
}

// src/modules/logbook/calculation.ts
export function calculateDeemedCost(
  vehicleCostPrice: number,
  businessKm: number,
  rulePack: IndividualTaxRulePack,
): number {
  const bracket =
    rulePack.travelDeemedCostTable.find(
      (b) => vehicleCostPrice >= b.min && (b.max === null || vehicleCostPrice <= b.max),
    ) ?? rulePack.travelDeemedCostTable[0];
  return bracket.fixedCostAnnual + businessKm * (bracket.fuelCostPerKm + bracket.maintenanceCostPerKm);
}
```

### Pattern 3: Repository/service split identical to individual-tax, with demo-mode file storage

**What:** `src/modules/logbook/repository.ts` implements an `ILogbookRepository` interface with a `DemoLogbookRepository` class exactly mirroring `DemoIndividualTaxRepository` — `isDemoMode()` branches to Prisma vs. `storage/demo-logbooks.json`, using the same `getDemoAssessmentsFilePath`-style helper (parametrized per entity) and the same clone-on-read/write-then-persist pattern to avoid mutation bugs.

**When:** Always, for consistency and because the desktop (Electron) build depends on demo-mode file storage working without a database. New Prisma models (`Vehicle`, `Logbook`, `LogbookTrip`) should be added to `prisma/schema.prisma` following the existing `IndividualTaxProfile`/`IndividualTaxAssessment`/`IndividualTaxLineItem` relational shape (one profile → one assessment → many line items becomes one client+year → one logbook → many trips).

**Example:** See `src/modules/individual-tax/repository.ts` lines 124–291 as the template to copy structurally (the demo-mode `readDemoXFromDisk`/`writeDemoXToDisk` pair, the `mapRow` translator, `isDemoMode` branch in every method).

### Pattern 4: Import pipeline as pure transform functions, orchestrated by a thin wizard component

**What:** `parse-csv.ts`, `parse-xlsx.ts`, `detect-elogbook.ts`, and `column-mapping.ts` are pure, framework-free TypeScript functions (input: file buffer or raw text; output: plain data), independently unit-testable with Vitest exactly like the schedule calculators. The `LogbookImportWizard` component is a thin state machine over these functions (`idle → parsing → mapping → previewing → committing → done`), holding only wizard-step state, not calculator state.

**When:** Always — this preserves testability (SARS elogbook detection logic can be tested against fixture files without a browser) and keeps the UI layer thin, matching the existing convention that all business/calculation logic lives in `src/modules/`, never in `src/components/`.

**Example:**
```typescript
// src/modules/logbook/import/parse-csv.ts
export interface ParsedImportData {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseLogbookCsv(rawText: string): ParsedImportData {
  // use a real CSV parser (quoted-field aware) — do NOT split("\n") / split(",")
  // e.g. a small RFC4180-compliant parser or a dependency like papaparse
}
```

### Pattern 5: Split the monolith by tab, lift only what must be shared

**What:** Each of the 8 calculator tabs becomes its own file under `src/components/individual-tax/tools/{TabName}Tab.tsx`, each with its own local `useState`. `TaxToolsShell` (the renamed `tax-tools.tsx`) keeps only: active-tab state, the toast notification system, and read-only context (current client, current tax year, rulepack for that year) passed down as props. No calculator inputs live in the shell.

**When:** Always for this refactor — the root cause named in PROJECT.md is "architecture (single component state), not one hot loop." Splitting by tab is the natural boundary because the 8 calculators are already functionally independent (medical credit changes never need to re-render the CGT tab).

**Anti-pattern this avoids:** keeping one `useState` object with all 8 calculators' fields and re-rendering the entire 2,148-line tree on every keystroke in any field.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Session-only logbook state (`useState` with no persistence)

**What:** Trips currently live only in `tax-tools.tsx` component state (`useState<Trip[]>`), lost on refresh, not tied to any client or tax year.

**Why bad:** Contradicts the milestone's core requirement ("logbook result feeds the ITR12 travel schedule," "persist per client + tax year," "survive refresh/navigation, exportable for SARS audit"). A logbook that vanishes on navigation cannot be an audit artifact.

**Instead:** Logbook is a first-class persisted entity (Pattern 1 above), loaded on tab mount for the active client+year, saved incrementally (per trip or per import batch), never held as the only copy in transient state.

### Anti-Pattern 2: Duplicating SARS rate tables between UI and rulepacks

**What:** `DEEMED_COST_TABLE`, `TAX_BRACKETS`, `REBATES`, `MEDICAL_CREDITS` are currently hardcoded a second time inside `tax-tools.tsx` (lines 8–35), duplicating (and, per PROJECT.md, drifting from — only one tax year's rates, labeled "2024/2025") the values already correctly maintained per-year in `src/modules/individual-tax/rules-*.ts`.

**Why bad:** Two sources of truth for compliance-critical figures is the single highest-risk pattern in this codebase for this milestone — a rate update in one place and not the other produces a silently wrong SARS filing.

**Instead:** UI components import rulepack-derived values via the existing `getIndividualTaxRulePackByYear()` (and calculation results from the calculation-service/schedules), never re-declare tax constants locally. Any calculation currently duplicated in the component (e.g. `calcTax`, `getMarginalRate`) should call into `src/modules/individual-tax/calculation-service.ts` instead of reimplementing bracket math client-side.

### Anti-Pattern 3: Naive CSV parsing (`split("\n")` / `split(",")`)

**What:** `handleFile` (line 553–578) splits raw file text on newlines and commas with no quote/escape handling.

**Why bad:** Breaks on any field containing a comma (e.g., an address or trip purpose like `"Client meeting, Sandton"`), breaks on `\r\n` line endings from Excel-exported CSVs, and cannot handle `.xlsx` at all — three of the explicitly required import capabilities in this milestone.

**Instead:** Use a proper parser: a well-tested CSV library (quote/escape/delimiter-aware) for `.csv`, and a spreadsheet library (SheetJS `xlsx` is the standard, MIT-licensed, no new runtime service required) for `.xlsx`. Both live behind the `src/modules/logbook/import/` functions so the parsing strategy can change without touching UI code.

### Anti-Pattern 4: Rendering all imported rows synchronously on the main thread

**What:** `processImport` (line 580+) maps over every row of `uploadData.rows` synchronously, and `TripTable`/the trips list renders every row with no virtualization — the named cause of the UI freeze on large imports (10,000+ rows per PROJECT.md constraint).

**Why bad:** Synchronous parsing + mapping + full-list re-render of thousands of DOM rows blocks the main thread; React re-renders the entire tree because trip state lives at the top of the monolith (see Anti-Pattern 1's sibling problem — one large component means one large re-render).

**Instead:** (a) Offload parsing/row-mapping for large files to a Web Worker (or at minimum chunk the work with `requestIdleCallback`/`setTimeout` batching) so the main thread stays responsive during import; (b) virtualize/paginate the `TripTable` (render only visible rows); (c) pre-derive display-formatted fields (parsed `Date`, formatted currency) once when trip data changes, not inline in the render of each row on every render pass.

### Anti-Pattern 5: Treating the logbook as purely a UI concern of `travel-schedule.ts`

**What:** Tempting shortcut — expand `IndividualTaxTravelInput` to directly embed `trips: Trip[]` and do deemed/actual math inline inside `travel-schedule.ts`.

**Why bad:** Couples the ITR12 schedule engine (which must stay a thin, pure, per-assessment calculation matching the existing `IndividualTaxScheduleResult` contract and its co-located test) to the logbook's much larger surface area (vehicle CRUD, trip CRUD, import formats, cost-method comparison). It also makes the logbook impossible to reuse independently (e.g., viewing/editing a logbook without running a full tax calculation) and risks breaking other schedules' tests per the stated compatibility constraint.

**Instead:** `logbook/service.ts` computes the `LogbookTravelResult` (deemed vs. actual, already resolved to a single recommended deduction amount plus the source-code splits) and `travel-schedule.ts` only consumes that pre-computed result plus the existing manual-entry fallback — keeping the schedule function's input/output contract stable and its own test suite intact.

## Scalability Considerations

| Concern | At 100 trips (typical year) | At 10,000+ trips (bulk import) | At multi-year history |
|---------|--------------------------|-------------------------------|------------------------|
| Trip table rendering | Plain `.map()` render is fine | Must virtualize (windowed rendering) or paginate; render only visible rows | Filter to active tax year by default; don't load all years' trips into one table |
| CSV/XLSX parsing | Synchronous parse is fine | Parse in a Web Worker or chunked/batched on the main thread to avoid blocking; show progress in the wizard | N/A — parsing is per-import, not per-history |
| Persistence writes | One write per manual trip add is fine | Batch import as a single repository write (one file rewrite / one Prisma transaction), not N writes | Demo file storage (`storage/demo-logbooks.json`) grows with history; consider one file per client or per client+year if file size becomes a concern in demo mode |
| Odometer/summary recompute | Recompute on every change is cheap | Recompute once after the batch commits, not once per row during import | Cache the last computed `LogbookTravelResult` on the record; invalidate on trip mutation |
| Column mapping / detection | N/A | Detection only needs to inspect headers + a small row sample, not the full dataset | N/A |

## Build Order

Dependencies flow from data model outward to UI, and from the calculation core outward to the import pipeline — build in this order:

1. **Rulepack extension** (`src/modules/individual-tax/types.ts` + `rules-2025/2026/2027.ts` + `rulepack-registry.ts`): add `travelDeemedCostTable` per year. Zero risk to existing code (additive field); unblocks everything else since deemed-cost math needs real per-year rates. Verify rates against SARS Government Gazette publications before hardcoding (flagged as a compliance research item, not an architecture item).

2. **`src/modules/logbook/` domain module** (types → validation → repository → calculation → service), built and unit-tested in isolation, no UI yet. This can be developed and tested (Vitest, co-located `*.test.ts`) entirely independently of the component refactor — it has no dependency on `tax-tools.tsx`. Depends on step 1 for deemed-cost calculation.

3. **`travel-schedule.ts` extension**: add the optional `logbook` input path, keep the legacy path working, update/extend its existing test file to cover both paths. Depends on step 2's `LogbookTravelResult` shape being final. This is the integration seam — get it right before building UI on top, since both the logbook module and the ITR12 engine will be exercised through it.

4. **Import pipeline** (`src/modules/logbook/import/`): CSV parser, XLSX parser, elogbook detection, column mapping — pure functions, unit-testable against fixture files (a real SARS elogbook export, a generic CSV, an Excel file with quoted/comma-containing fields). Depends on step 2 (needs `LogbookTrip`/validation types to convert parsed rows into). Independent of UI and of step 3.

5. **Component decomposition** (split `tax-tools.tsx` into `TaxToolsShell` + 8 tab components): this is a refactor of existing working UI and should happen before wiring in the new logbook UI, so the new `TravelLogbookTab` is built clean rather than extracted from a monolith mid-migration. Depends on nothing from steps 1–4 (pure UI restructuring) but should land before step 6 to avoid building new features inside the file that's about to be deleted/split.

6. **Wire logbook UI into `TravelLogbookTab`**: vehicle form, persisted trip table (virtualized), deemed/actual comparison view — calling the step 2 service. Depends on steps 2, 3, 5.

7. **Wire import wizard into the logbook tab**: file picker → parse (worker) → detect/map → preview → commit. Depends on steps 4, 6.

8. **Performance hardening pass**: virtualize `TripTable` if not already windowed from step 5/6, move parsing to a Web Worker if the synchronous chunked approach proves insufficient under the 10,000-row constraint, verify with a large fixture file. Depends on steps 6–7 being functionally complete — performance work is easiest to validate once the real data path exists end-to-end.

9. **Remaining 7 calculator tabs**: audit each against current SARS rules (medical s6A/s6B, retirement s11F, CGT, provisional tax para 19/20, rental, home office s23(b)) and remove any locally-duplicated constants in favor of rulepack/calculation-service calls (Anti-Pattern 2). Independent of the logbook work; can proceed in parallel with steps 2–8 once step 5 (decomposition) has landed, since each tab is now an isolated file.

**Critical path:** 1 → 2 → 3 → (4 and 5 can run in parallel) → 6 → 7 → 8. Step 9 can start as soon as step 5 completes and run in parallel with the rest.

**Why this order:** The travel-schedule integration (step 3) is the highest-risk seam — it's the one place required to stay backward-compatible with an existing tested contract while absorbing a new data source. Resolving its shape early (right after the logbook module exists, before any UI is built against it) prevents rework. Splitting the monolith (step 5) is deliberately sequenced before adding the new logbook UI so the new feature is never written into the file being torn apart mid-refactor — but it doesn't block the backend work (steps 1–4), so both can proceed concurrently if working with multiple contributors.

## Sources

- Direct codebase inspection: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md` (GSD codebase mapping, analyzed 2026-07-02) — HIGH confidence, primary source for existing patterns.
- `src/modules/individual-tax/types.ts`, `repository.ts`, `rulepack-registry.ts`, `rules-2026.ts`, `schedules/travel-schedule.ts` — read directly, HIGH confidence for current contracts and gaps.
- `src/components/individual-tax/tax-tools.tsx` (2,148 lines, read directly at lines 1–120, 553–820) — HIGH confidence for the specific anti-patterns cited (duplicated constants, naive CSV parsing, non-virtualized trip rendering).
- `package.json` — confirmed no CSV/XLSX parsing library or Web Worker infrastructure currently installed; any import-pipeline library choice (e.g., a CSV parser, SheetJS for `.xlsx`) is a net-new dependency decision, not a pattern already in use — flagged for STACK.md / phase-specific research rather than asserted here.
- `.planning/PROJECT.md` — milestone requirements and confirmed known bugs/gaps, used to validate which anti-patterns are already-identified vs. newly observed.
