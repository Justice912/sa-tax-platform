# Phase 2: Logbook Domain Module - Research

**Researched:** 2026-07-02
**Domain:** SA tax practice platform — new persisted domain module (vehicle/logbook/trip CRUD + deemed/actual cost calculation engines), UI-independent
**Confidence:** HIGH for architecture/persistence pattern (direct codebase read); HIGH for deemed-cost calculation (Phase 1 rulepack data already verified); MEDIUM for actual-cost method specifics (wear-and-tear cap resolved this pass, still recommend final primary-source confirmation)

## Summary

This phase has almost no architectural ambiguity: the codebase already has a proven, repeated pattern (`types.ts` → `validation.ts` → `repository.ts` → `service.ts`, demo-mode file persistence via `isDemoMode`/`storage/*.json`, Zod validation, `writeAuditLog` calls) used identically by `src/modules/individual-tax/` and `src/modules/clients/`. The logbook module should be a new sibling, `src/modules/logbook/`, copying that pattern exactly — this is a "fill in the established mold" phase, not a design phase.

The one real design decision is data shape: a logbook is a parent record (client + tax year + vehicle + odometer readings) with a child collection (trips), which is a one-to-many relationship the codebase already models correctly elsewhere (`EstateMatter` → `EstateAsset[]`/`EstateLiability[]` in `prisma/schema.prisma`, cascade-deleted). Demo mode, however, stores everything as flat arrays of records in single JSON files (no relational cascade) — so the logbook record's `trips` array should be *embedded* in the `LogbookRecord` JSON object for demo mode (one JSON blob per logbook, matching how `nearEfilingInput` is embedded as JSON today), while Prisma gets normal parent/child tables. This phase should ship the Prisma schema addition alongside demo-mode support (not defer it), because Phase 1's precedent (`IndividualTaxRuleVersion`/`Profile`/`Assessment`/`LineItem`) shows this codebase always keeps both paths in sync from day one, and CLAUDE.md/PROJECT.md constraints require the Electron desktop build to keep working without a database.

**Primary recommendation:** Build `src/modules/logbook/` as five new files (`types.ts`, `validation.ts`, `repository.ts`, `calculation.ts`, `service.ts`) mirroring `src/modules/individual-tax/`'s exact structure and demo-mode file-I/O pattern (`storage/demo-logbooks.json`), add three new Prisma models (`Vehicle`, `Logbook`, `LogbookTrip`) modeled on the `EstateMatter`/`EstateAsset` cascade pattern, and implement `calculateDeemedCost()` (reads Phase 1's `travelDeemedCostTable` off the rulepack — zero new research needed, data already verified) and `calculateActualCost()` (uses the R665,000 statutory cap resolved below) as pure, independently unit-tested functions. No UI, no import pipeline, and no `travel-schedule.ts` changes belong in this phase — those are Phase 3/4/6 per the roadmap and ARCHITECTURE.md's build order.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | ^4.1.8 (already installed) | Validation schemas for vehicle/logbook/trip inputs | Every existing module (`individual-tax/validation.ts`, `shared/schemas.ts`) uses Zod exclusively; no alternative validation library exists in this codebase |
| Prisma | (already installed, see `prisma/schema.prisma`) | Non-demo persistence for `Vehicle`/`Logbook`/`LogbookTrip` | Existing ORM for the whole platform; `isDemoMode` branch pattern is universal |
| Vitest | ^4.0.0 (already installed) | Unit tests for `calculation.ts`, `validation.ts`, `repository.ts` | Existing test runner; co-located `*.test.ts` convention throughout `src/modules/` |
| `crypto.randomUUID()` | Node built-in | ID generation for new logbook/vehicle/trip records | PITFALLS.md explicitly flags the existing `Date.now() + Math.random()` ID pattern (seen in `repository.ts` lines 266, 372) as a weak-collision anti-pattern to NOT propagate into new code this milestone |

### Supporting
None needed this phase — no CSV/XLSX parsing (Phase 4), no virtualization (Phase 5/6), no new runtime dependency. `package.json` confirmed to have zero CSV/XLSX/virtualization/uuid packages currently installed; this phase does not need any of them.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Embedding `trips[]` inside the demo-mode `LogbookRecord` JSON blob | One flat `demo-logbook-trips.json` file with a `logbookId` foreign key, mirroring Prisma's normalized shape | Rejected: adds a second file + cross-file consistency burden in demo mode for no benefit at logbook trip-count scale (thousands, not millions); existing demo files (`demo-individual-tax-assessments.json`, `demo-clients.json`) are flat arrays of self-contained records, and `nearEfilingInput` already shows the "embed a rich nested object in one JSON field" pattern is accepted practice here |
| `crypto.randomUUID()` | Continue `Date.now() + Math.random()` pattern | Rejected: PITFALLS.md Security Mistakes section explicitly calls this out as a risk specifically for new logbook/trip/vehicle records (audit-facing data, collision would silently corrupt a client's SARS record) |

**Installation:**
No new packages required for this phase.

## Architecture Patterns

### Recommended Project Structure
```
src/modules/logbook/
├── types.ts              # Vehicle, LogbookTrip, LogbookRecord, LogbookTravelResult, CostMethod
├── validation.ts          # Zod schemas: vehicleSchema, tripSchema, logbookCreateSchema, costMethodExclusivity refine
├── repository.ts           # ILogbookRepository + DemoLogbookRepository (isDemoMode branch, storage/demo-logbooks.json)
├── calculation.ts          # calculateDeemedCost(), calculateActualCost(), compareTravelMethods() — pure functions
├── service.ts               # createLogbook, getLogbookForClientYear, addTrip, updateTrip, deleteTrip, setCostMethod, getTravelResult, exportCsv/exportSummary helpers (data-only; formatting logic can live here or wait for Phase 6 UI — see Open Questions)
├── repository.test.ts        # co-located Vitest
├── calculation.test.ts        # co-located Vitest — deemed table lookups, actual-cost caps, large-N precision (Pitfall 7)
├── validation.test.ts         # co-located Vitest — cost-method exclusivity, odometer continuity rejection
└── service.test.ts             # co-located Vitest, audit log assertions
```

This mirrors `src/modules/individual-tax/` file-for-file (which has `types.ts`, `validation.ts`, `repository.ts`, `service.ts`, `calculation-service.ts`, `schedules/`, plus co-located `*.test.ts` for each). No `import/` subfolder yet — that belongs to Phase 4 per ARCHITECTURE.md's build order, and must not be started here (no CSV/XLSX library is installed, and pulling one in now would be premature scope creep for this phase's requirement set, LOG-01 through LOG-06 only).

### Pattern 1: Repository interface + Demo-mode class, copied structurally from `individual-tax/repository.ts`

**What:** Define `ILogbookRepository` (interface with `getLogbookByClientAndYear`, `createLogbook`, `addTrip`, `updateTrip`, `deleteTrip`, `updateVehicle`, `setCostMethod`, `setActualExpenses`) and one concrete `DemoLogbookRepository implements ILogbookRepository`. Every method branches on `isDemoMode` exactly like `DemoIndividualTaxRepository` does today — Prisma path when `!isDemoMode`, JSON-file path when `isDemoMode`.

**When:** Always — this is the only persistence pattern in the codebase. Do not introduce a different persistence abstraction (e.g., a generic repository factory) for this one module.

**Example (verified against actual `src/modules/individual-tax/repository.ts` lines 30–77, and `src/modules/clients/client-service.ts` lines 74–127 — both files use the IDENTICAL read/write-to-disk helper shape):**
```typescript
// src/modules/logbook/repository.ts
import { isDemoMode } from "@/lib/env";
import { prisma } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";
import type { LogbookRecord } from "@/modules/logbook/types";

const demoLogbooksFileName = "demo-logbooks.json";

function getDemoLogbooksFilePath() {
  const storageRoot = process.env.STORAGE_ROOT?.trim();
  const basePath = storageRoot ? storageRoot : path.join(process.cwd(), ".storage");
  return path.join(basePath, demoLogbooksFileName);
}

function readDemoLogbooksFromDisk(): LogbookRecord[] {
  if (process.env.NODE_ENV === "test") {
    return demoLogbooks; // seeded in-memory array, per server/demo-data.ts convention
  }
  const filePath = getDemoLogbooksFilePath();
  try {
    if (!fs.existsSync(filePath)) {
      const seeded = [...demoLogbooks];
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(seeded, null, 2), "utf8");
      return seeded;
    }
    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) { /* re-seed, same as above */ }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LogbookRecord[]) : [...demoLogbooks];
  } catch {
    return [...demoLogbooks];
  }
}

function writeDemoLogbooksToDisk(records: LogbookRecord[]) {
  if (process.env.NODE_ENV === "test") return;
  const filePath = getDemoLogbooksFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");
}
```

**Critical detail confirmed by direct code read:** `storage/demo-individual-tax-assessments.json` and `storage/demo-clients.json` already exist in the actual `storage/` directory at the project root (not `.storage/` — note the repository code computes `path.join(process.cwd(), ".storage")` as its *default* fallback, but `STORAGE_ROOT` env var is what's actually controlling the real path in this project; the git status shows real files live directly under `storage/`, confirming `STORAGE_ROOT=./storage` is set, per `src/lib/env.ts` line 8 default `"./storage"`). The new `demo-logbooks.json` file will land in the same `storage/` directory as the others — no new configuration needed.

Also mirror the `server/demo-data.ts` seeding convention: add a `demoLogbooks: LogbookRecord[]` seed array there (empty or with 1–2 fixture records) so `NODE_ENV === "test"` reads from memory exactly like `demoIndividualTaxAssessments`/`demoClients` do.

### Pattern 2: Prisma parent/child cascade, copied from `EstateMatter` → `EstateAsset[]`

**What:** Add three new models to `prisma/schema.prisma`, structured exactly like `EstateMatter` (parent) → `EstateAsset`/`EstateLiability` (children, `onDelete: Cascade`, indexed on the foreign key):

```prisma
model Vehicle {
  id                 String   @id @default(cuid())
  clientId           String
  make               String
  model              String
  registrationNumber String
  costPrice          Decimal  @db.Decimal(18, 2)
  acquisitionDate    DateTime
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  client             Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  logbooks           Logbook[]

  @@index([clientId])
}

model Logbook {
  id                String        @id @default(cuid())
  clientId          String
  vehicleId         String
  assessmentYear    Int
  openingOdometer   Decimal       @db.Decimal(10, 1)
  closingOdometer   Decimal?      @db.Decimal(10, 1)
  costMethod        LogbookCostMethod @default(DEEMED)
  actualFuel        Decimal?      @db.Decimal(18, 2)
  actualMaintenance Decimal?      @db.Decimal(18, 2)
  actualInsurance   Decimal?      @db.Decimal(18, 2)
  actualLicence     Decimal?      @db.Decimal(18, 2)
  actualFinanceCharges Decimal?   @db.Decimal(18, 2)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  client            Client        @relation(fields: [clientId], references: [id], onDelete: Cascade)
  vehicle           Vehicle       @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  trips             LogbookTrip[]

  @@unique([clientId, vehicleId, assessmentYear])
  @@index([clientId, assessmentYear])
}

model LogbookTrip {
  id             String   @id @default(cuid())
  logbookId      String
  date           DateTime
  odometerStart  Decimal? @db.Decimal(10, 1)
  odometerEnd    Decimal? @db.Decimal(10, 1)
  businessKm     Decimal  @db.Decimal(10, 1)
  fromLocation   String
  toLocation     String
  reason         String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  logbook        Logbook  @relation(fields: [logbookId], references: [id], onDelete: Cascade)

  @@index([logbookId, date])
}

enum LogbookCostMethod {
  DEEMED
  ACTUAL
}
```

**When:** This phase — do not defer the Prisma schema to a later phase. Phase 1's SUMMARY.md shows this codebase's established practice of adding the required shape immediately (rulepack fields were added as *required*, forcing every consumer to update). Deferring the Prisma model risks the demo-only shortcut becoming permanent (an anti-pattern flagged in ARCHITECTURE.md's Anti-Pattern 1 spirit — "session-only" persistence debt).

**Why per-trip odometer is nullable, not required:** FEATURES.md confirms (verified directly from the official SARS eLogbook PDF) that per-trip opening/closing odometer readings are explicitly marked "*not compulsory*" — only date, business km, from, to, reason are mandatory at the trip level. The schema and Zod validation must reflect this; do not make `odometerStart`/`odometerEnd` required fields on `LogbookTrip`.

**Why `costMethod` lives on `Logbook`, not `LogbookTrip`:** Per Pitfall 2 (PITFALLS.md), cost method is elected once per vehicle per tax year — never per-trip. Modeling it any other way opens the door to the "silently mixed" defect explicitly called out as the highest-severity pitfall in this phase's domain.

### Pattern 3: `LogbookTravelResult` — the decoupled output type consumed by Phase 3's `travel-schedule.ts`

**What:** `service.ts` exposes a `getTravelResult(clientId, taxYear): Promise<LogbookTravelResult | null>` that computes and returns a plain data shape, independent of `LogbookRecord`'s internal structure — this is the seam Phase 3 will consume, so its shape should be finalized now even though wiring it into `travel-schedule.ts` is out of scope for this phase.

**Example (per ARCHITECTURE.md Pattern 1, confirmed as the correct target shape):**
```typescript
// src/modules/logbook/types.ts
export interface LogbookTravelResult {
  totalKilometres: number;
  businessKilometres: number;
  costMethod: "DEEMED" | "ACTUAL";
  deemedCostDeduction: number;
  actualCostDeduction: number | null; // null if actual-cost inputs incomplete
  recommendedMethod: "DEEMED" | "ACTUAL"; // whichever yields the higher deduction
  warnings: { code: string; message: string }[];
}
```

**When:** Always — this phase must produce this shape even without a UI or ITR12 wiring, because LOG-05 ("side-by-side comparison") requires both methods computed and compared as part of this phase's own success criteria, not deferred to Phase 3.

### Anti-Patterns to Avoid

- **Duplicating rulepack values inside `logbook/calculation.ts`:** `travelDeemedCostTable` already lives on `IndividualTaxRulePack` (Phase 1, `src/modules/individual-tax/types.ts` lines 142–206, populated in `rules-2025/2026/2027.ts`). `calculateDeemedCost()` MUST accept the resolved rulepack (or just the `TravelDeemedCostBracket[]`) as a parameter and never hardcode a table locally. Import via `getIndividualTaxRulePackByYear(assessmentYear)` from `src/modules/individual-tax/rulepack-registry.ts`.
- **Making the logbook module depend on `travel-schedule.ts` or vice versa:** ARCHITECTURE.md Anti-Pattern 5 — this phase produces `LogbookTravelResult` as a standalone, independently testable/usable data shape. Do NOT import anything from `src/modules/individual-tax/schedules/` into `src/modules/logbook/`, and do not touch `travel-schedule.ts` in this phase (that's Phase 3's job per the roadmap).
- **Skipping the Prisma schema "because demo mode is enough for now":** would silently create the exact technical debt pattern PITFALLS.md's Technical Debt table calls out ("Keep logbook trip state in useState a little longer" — same shape of shortcut, just one layer down).
- **Treating per-trip odometer as required input:** contradicts the verified official SARS eLogbook template (FEATURES.md, HIGH confidence, direct PDF read). Only year-level opening/closing odometer is mandatory.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation for new Vehicle/Logbook/Trip IDs | A custom ID scheme (`Date.now() + Math.random()`, matching the existing weak pattern) | `crypto.randomUUID()` (Node/browser built-in, zero dependency) | PITFALLS.md Security Mistakes section flags the existing pattern as collision-prone for exactly this kind of new audit-facing record; built-in UUID needs no new package |
| Rounding/precision for cost calculations | Ad hoc per-trip rounding | Follow the existing `r2()` convention (`Math.round(value * 100) / 100`) applied ONLY at final output boundaries, per `travel-schedule.ts` line 6 and Pitfall 7's guidance | Existing codebase convention; premature per-trip rounding compounds error across thousands of trips |
| Client/tax-year uniqueness enforcement | Manual duplicate-checking logic scattered across service methods | A Prisma `@@unique([clientId, vehicleId, assessmentYear])` constraint (see schema above) plus a service-level pre-check for the demo-mode path (array `.find()`) | Matches existing patterns (`Client.code @unique`, etc.) and gives a hard guarantee at the DB layer, not just application logic |

**Key insight:** Every "hard problem" in this phase (persistence branching, ID generation, rounding) already has a codebase-internal answer. The research risk in this phase is not technical novelty — it's compliance-data precision (see Common Pitfalls) and staying disciplined about scope (not reaching into Phase 3/4/6 territory).

## Common Pitfalls

### Pitfall 1: Deemed/actual cost method mixing (highest-severity, phase-specific)
**What goes wrong:** UI or data model allows both `actualExpenses` and a `DEEMED` costMethod to coexist with real (non-zero) data, or the calculation function picks "whichever has data" instead of an explicit switch.
**Why it happens:** Natural to build both cost-method form sections in parallel and let a later toggle "just work."
**How to avoid:** `costMethod: "DEEMED" | "ACTUAL"` is a required, persisted field (already reflected in the Prisma schema above). `calculateDeemedCost()` and `calculateActualCost()` are two independent pure functions; `service.ts`'s `getTravelResult()` computes both (for the LOG-05 comparison) but the schedule-facing "current claim" always resolves via the explicit `costMethod` selector, never a fallback chain.
**Warning signs:** A single function that does `deemedResult ?? actualResult`.
**Verification:** Unit test asserting a Zod-level rejection of a payload with `costMethod === "DEEMED"` and non-empty `actualExpenses`.

### Pitfall 2: Odometer continuity — deferred to Phase 4/6 for imports, but must exist NOW for manual trip capture
**What goes wrong:** `service.addTrip()` accepts a trip without validating it against the logbook's `openingOdometer`/`closingOdometer` or prior trips.
**How to avoid:** Even without an import pipeline yet, this phase's `service.ts`/`validation.ts` must validate: `sum(businessKm) <= closingOdometer - openingOdometer` (when closing odometer is set), and if per-trip odometer readings are supplied, `trip.odometerStart <= trip.odometerEnd` and cross-trip non-decreasing order when sorted by date. Build this once here; Phase 4's import pipeline reuses the same validation function rather than re-implementing it.
**Verification:** Unit test with a deliberately reversed-odometer trip and a business-km-exceeds-total-km case, asserting each is rejected/flagged.

### Pitfall 3: Floating-point currency drift across many trips
**What goes wrong:** Rounding each trip's cost contribution to 2 decimals before summing compounds error at scale (10,000+ trips is a later-phase concern, but the calculation function's *design* is set in this phase and must not bake in premature rounding).
**How to avoid:** `calculateDeemedCost`/`calculateActualCost` must sum unrounded per-trip/per-km contributions and apply `r2()` only once, on the final total.
**Verification:** A test summing many (e.g., 1,000+) synthetic trips at fractional cent-per-km rates, asserting the total matches a precisely pre-computed expected value.

### Pitfall 4: Wrong-year rate table resolution
**What goes wrong:** `calculateDeemedCost` resolves the bracket table via `new Date().getFullYear()` or the trip's calendar date instead of the logbook's `assessmentYear`.
**How to avoid:** Always resolve via `getIndividualTaxRulePackByYear(logbook.assessmentYear).travelDeemedCostTable` — the assessment year is a property of the `Logbook` record itself (set at creation, per LOG-01), never re-derived from trip dates.
**Verification:** Test with a logbook `assessmentYear: 2027` and trips dated in the 2027 fiscal window (Mar 2026–Feb 2027), asserting the 2027 rulepack's R115k-increment brackets are used, not 2026's R100k-increment brackets (Phase 1 already confirmed these differ structurally).

### Pitfall 5: Weak ID generation propagating into new logbook/trip/vehicle records
**How to avoid:** Use `crypto.randomUUID()` for every new ID in `repository.ts`'s demo-mode create paths — do not copy the `Date.now() + Math.random()` pattern from `individual-tax/repository.ts` lines 266/372, even though it's the "nearby" example to copy from for everything else.

## Code Examples

### Deemed cost calculation (verified pattern, using Phase 1's actual rulepack shape)
```typescript
// src/modules/logbook/calculation.ts
import type { TravelDeemedCostBracket } from "@/modules/individual-tax/types";

function r2(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateDeemedCost(
  vehicleCostPrice: number,
  businessKm: number,
  travelDeemedCostTable: TravelDeemedCostBracket[],
): number {
  const bracket =
    travelDeemedCostTable.find(
      (b) => vehicleCostPrice >= b.min && (b.max === null || vehicleCostPrice <= b.max),
    ) ?? travelDeemedCostTable[travelDeemedCostTable.length - 1];

  // fixedCostAnnual is a full-year rand figure; fuelCostPerKm/maintenanceCostPerKm
  // are already rand-per-km (Phase 1 pre-converted from SARS cents/km — see
  // types.ts doc comments on TravelDeemedCostBracket).
  const total =
    bracket.fixedCostAnnual + businessKm * (bracket.fuelCostPerKm + bracket.maintenanceCostPerKm);

  return r2(total);
}
```
Source: direct read of `src/modules/individual-tax/types.ts` lines 142–153 (Phase 1 output) and ARCHITECTURE.md Pattern 2's example, cross-checked against FEATURES.md's verified per-year tables — HIGH confidence, no external research needed since Phase 1 already resolved and unit-tested this data.

### Actual cost calculation — wear-and-tear cap resolved this pass
```typescript
// src/modules/logbook/calculation.ts
const ACTUAL_COST_VEHICLE_VALUE_CAP = 665_000; // s8(1)(b)(iiiA)(bb) — see Open Questions/Sources
const WEAR_AND_TEAR_WRITE_OFF_YEARS = 7;

export interface ActualCostExpenses {
  fuel: number;
  maintenance: number;
  insurance: number;
  licence: number;
  financeCharges: number;
}

export function calculateActualCost(
  vehicleCostPriceExclVatFinance: number,
  businessKm: number,
  totalKm: number,
  expenses: ActualCostExpenses,
): number {
  const cappedValue = Math.min(vehicleCostPriceExclVatFinance, ACTUAL_COST_VEHICLE_VALUE_CAP);
  const wearAndTear = cappedValue / WEAR_AND_TEAR_WRITE_OFF_YEARS;
  const cappedFinanceCharges = Math.min(expenses.financeCharges, /* apply same cap-derived limit if applicable */ expenses.financeCharges);

  const totalQualifyingCosts =
    expenses.fuel + expenses.maintenance + expenses.insurance + expenses.licence + cappedFinanceCharges + wearAndTear;

  const businessRatio = totalKm > 0 ? Math.min(1, businessKm / totalKm) : 0;
  return r2(totalQualifyingCosts * businessRatio);
}
```
**Note:** the finance-charge capping mechanics beyond the R665,000 vehicle-value threshold (i.e., exactly how the cap interacts with a finance agreement's actual interest schedule) are not fully resolved — see Open Questions. The vehicle-value cap itself (R665,000) is now MEDIUM confidence, not the earlier LOW-confidence "R800,000, possibly conflated" flag from FEATURES.md.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Crude allowance × (businessKm/totalKm) ratio, `travel-schedule.ts` | Persisted vehicle + trip-level logbook feeding a deemed/actual cost engine | This milestone (Phase 2 builds the engine; Phase 3 wires it in) | Replaces a non-SARS-compliant estimate with the actual statutory methods |
| Single hardcoded `DEEMED_COST_TABLE` in `tax-tools.tsx` (one year only) | Per-year `travelDeemedCostTable` on each `IndividualTaxRulePack` (Phase 1, already done) | Phase 1 (completed 2026-07-02) | This phase's `calculateDeemedCost()` consumes Phase 1's output directly — zero new rate research needed |

**Deprecated/outdated:** The in-component `DEEMED_COST_TABLE` constant (`tax-tools.tsx` line ~19) is superseded by Phase 1's rulepack field; this phase's calculation engine must read from the rulepack, never re-declare a local table (Anti-Pattern 2 in ARCHITECTURE.md).

## Open Questions

1. **Exact vehicle-value cap for actual-cost wear-and-tear/finance-charge purposes: R665,000, not R800,000**
   - What we know: Two independent secondary sources (taxconsulting.co.za, cross-verified via a second WebSearch pass) explicitly cite **R665,000** and the specific statutory reference **section 8(1)(b)(iiiA)(bb)** — "For the purpose of finance charges (section 8(1)(b)(iiiA)(bb)(B)) and wear-and-tear expenses (section 8(1)(b)(iiiA)(bb)(A)) the maximum vehicle value is R665,000." This directly resolves FEATURES.md's earlier flagged ambiguity, which had surfaced R800,000 as "suspiciously identical to the deemed-cost table's top bracket" and recommended independent verification. That suspicion is confirmed correct — R800,000 was very likely a conflation with the deemed-cost table's 2025/2026 top bracket ceiling; R665,000 is a distinct, separately-legislated, non-year-indexed statutory cap for the *actual*-cost method specifically.
   - What's unclear: Whether R665,000 itself is current for the 2025–2027 years in scope, or whether it has itself been adjusted by a more recent Budget (this figure did not surface any per-year variants in this pass — unlike the deemed-cost table, this cap does not appear to be re-gazetted annually, but this absence-of-evidence is not certainty). WebFetch could not parse the primary-source SARS IN47 PDF or PAYE-GEN-01-G03 guide directly (both returned "binary/encoded, unparseable" errors) — this cap is therefore MEDIUM confidence (two independent secondary sources agreeing on both the figure and the exact section citation), not HIGH.
   - Recommendation: Use R665,000 as the vehicle-value cap constant for `calculateActualCost()`, cite the section reference in a code comment exactly as found (`s8(1)(b)(iiiA)(bb)`), and add a TODO/flag comment recommending a final check against the current PAYE-GEN-01-G03 guide (2027 tax year edition) or IN47 (Issue 5) before this ships to a real client — consistent with how Phase 1 flagged its 2024 placeholder data. Do not block this phase on getting PDF-level primary confirmation; the two-source cross-verification is sufficient to proceed, per the researcher's MEDIUM-confidence threshold.

2. **Exact finance-charge capping mechanics beyond the vehicle-value threshold**
   - What we know: Finance charges are a qualifying actual-cost category (confirmed HIGH confidence, multiple sources), but the *vehicle's value* for computing both wear-and-tear AND the finance-charge component is capped at R665,000 — and separately, the vehicle's value itself must EXCLUDE finance charges/interest from its own valuation (i.e., you don't finance-charge-inflate the cost base you're capping).
   - What's unclear: Whether the R665,000 cap is applied by (a) capping the *finance charges actually incurred* pro-rata to the ratio of R665,000/actual-vehicle-value, or (b) some other formula. The taxconsulting.co.za source's worked example only demonstrated the wear-and-tear leg (`R280,000 ÷ 7`), not a worked finance-charge-cap example.
   - Recommendation: Implement the simpler, defensible interpretation — cap the *depreciable/finance-charge-relevant vehicle value* at R665,000 (as done in the code example above for wear-and-tear) and treat actual finance charges paid as directly deductible up to that value-derived proportion; flag this specific mechanic with a code comment for practitioner review (`reviewRequired`-style flag, matching the existing codebase convention) rather than asserting it's fully resolved. This is a genuinely underdocumented corner of SARS practice even in professional secondary sources — treat the output as advisory/reviewable, not a hard-coded certainty, consistent with how the rest of this codebase surfaces `reviewRequired` flags for judgment-call areas.

3. **Where does CSV export (LOG-06) logic live: `service.ts` or deferred entirely to Phase 6 UI?**
   - What we know: PROJECT.md/REQUIREMENTS.md scope LOG-06 ("export as CSV + printable summary") into Phase 2 explicitly (not Phase 6, which is UI/import/performance). ARCHITECTURE.md's Build Order doesn't explicitly place CSV *export* (as opposed to CSV *import*, which is Phase 4) — it's implicitly part of the logbook module itself, since it's a read-only transform of already-computed `LogbookRecord`/`LogbookTravelResult` data with no UI/parsing dependency.
   - What's unclear: Whether "printable summary" (the second half of LOG-06) means a data-shaping function in `service.ts` (e.g., `getLogbookSummaryForExport()`) that Phase 6 later renders into HTML/PDF via the existing `report-transformer.ts` + Playwright-print pattern (`src/app/reports/individual-tax/[assessmentId]/print/page.tsx`, `withPooledPage` PDF generation), or whether a minimal print view needs to ship in this phase too.
   - Recommendation: This phase should implement the **CSV export** as a pure function (`exportLogbookToCsv(record: LogbookRecord): string`, manual RFC4180-style quoting since no CSV library is installed yet — a small hand-rolled *serializer* for well-known internal data is a different risk profile than hand-rolling a *parser* for arbitrary user input, so this doesn't conflict with the "don't hand-roll CSV parsing" guidance elsewhere) and produce the **data shape** for a printable summary (a `LogbookAuditSummary` object: vehicle details, odometer readings, trip list, both methods' totals) but leave the actual print-page/route (mirroring `src/app/reports/individual-tax/[assessmentId]/print/`) to whichever phase builds the logbook's UI routes — likely Phase 6, since that's where all other logbook UI surfaces land per the roadmap. Confirm this split with the planner; it's a reasonable phase-boundary interpretation but not dictated explicitly by REQUIREMENTS.md's phase-to-requirement mapping.

4. **RBAC permission key for new logbook routes/API**
   - What we know: `src/lib/rbac.ts`'s `ROUTE_PERMISSIONS` map and `rolePermissions` currently have no `logbook:*` permission key; `middleware.ts`'s `config.matcher` also has no `/logbook` or `/api/logbook` path. Existing pattern: `/individual-tax` maps to `"itax:list"` in `ROUTE_PERMISSIONS`, though notably `"itax:list"` does not actually appear in any role's `rolePermissions` array (a pre-existing gap in the codebase, not something to fix in this phase, but worth noting so it isn't copied).
   - What's unclear: Whether logbook data needs its own permission key (`logbook:read`/`logbook:write`) or should simply inherit `clients:read`/`clients:write` (since a logbook is scoped to a client) or `itax:list`-style individual-tax permissions (since it ultimately feeds ITR12).
   - Recommendation: If this phase adds API routes at all (it may not — a pure domain-module phase might only need `service.ts` functions called directly from a later phase's UI/route layer), reuse `clients:read`/`clients:write` permissions rather than inventing a new key, since a logbook is fundamentally client-scoped data with the same access shape as the client record itself. If no API routes are built this phase (service functions only, consumed by Phase 6 UI), this is a non-issue for now — flag it for whichever phase adds the first `/api/logbook` or `/logbook` route.

## Validation Architecture

Skipped — `.planning/config.json` has no `workflow.nyquist_validation` key (only `research`, `plan_check`, `verifier` are set), so per the researcher instructions this section is omitted. Standard testing guidance: this phase's verification should rely on Vitest co-located unit tests (`calculation.test.ts`, `repository.test.ts`, `validation.test.ts`, `service.test.ts`) following the exact existing convention (`rulepack.test.ts`, `service-audit.test.ts`, etc. in `src/modules/individual-tax/`), plus a full `npm run test` run as a gate (per Pitfall 8 in PITFALLS.md, though that pitfall is Phase-3-specific, running the full suite after any shared-type touch is good practice here too since `IndividualTaxRulePack`'s `travelDeemedCostTable`/`getIndividualTaxRulePackByYear` will be imported, not modified, by this phase).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| LOG-01 | Create a logbook per client + tax year with vehicle details (make, model, registration, cost/purchase price) | `Vehicle`/`Logbook` Prisma models (Pattern 2) + `LogbookRecord`/`Vehicle` types (Pattern 1/3) + `DemoLogbookRepository.createLogbook()` mirroring `individual-tax/repository.ts`'s create-assessment structure |
| LOG-02 | Record tax-year opening and closing odometer readings | `Logbook.openingOdometer`/`closingOdometer` fields (Pattern 2 schema); validation in `validation.ts` per Pitfall 2 (odometer continuity: business km cannot exceed closing−opening) |
| LOG-03 | Capture trips manually with SARS-required fields (date, business km, from, to, reason; per-trip odometer optional) | `LogbookTrip` Prisma model + `LogbookTrip` type with nullable `odometerStart`/`odometerEnd` (Pattern 2), confirmed against FEATURES.md's direct read of the official SARS eLogbook PDF's compulsory-field list |
| LOG-04 | Logbook data persists in storage (like assessments) and survives refresh/navigation | Pattern 1: `DemoLogbookRepository` + `storage/demo-logbooks.json`, structurally identical to `storage/demo-individual-tax-assessments.json`/`storage/demo-clients.json` (both confirmed present in the actual `storage/` directory) |
| LOG-05 | Compute travel deduction under BOTH deemed-cost and actual-cost methods, side-by-side, methods never mixed | `calculation.ts`'s `calculateDeemedCost()` (Code Examples, consumes Phase 1's verified `travelDeemedCostTable`) and `calculateActualCost()` (Code Examples, R665,000 cap resolved in Open Questions #1) + `LogbookTravelResult` type (Pattern 3) computing both and returning a `recommendedMethod`; exclusivity enforced via required `costMethod` field + Zod refine (Pitfall 1) |
| LOG-06 | Export logbook as CSV + printable summary suitable for SARS audit | Addressed as a data-producing concern for this phase (`exportLogbookToCsv()` pure function + `LogbookAuditSummary` shape) — see Open Questions #3 for the phase-boundary split with the eventual print-page UI |
</phase_requirements>

## Sources

### Primary (HIGH confidence)
- Direct codebase reads: `src/modules/individual-tax/types.ts`, `repository.ts`, `service.ts`, `validation.ts` (full file reads, this session) — the exact pattern to replicate
- Direct codebase read: `src/modules/clients/client-service.ts` (full file read) — confirms the demo-mode file-persistence pattern is identical across two independent modules, not a one-off
- Direct codebase read: `prisma/schema.prisma` (`EstateMatter`/`EstateAsset`/`EstateLiability`/`IndividualTaxAssessment`/`IndividualTaxLineItem` models) — confirms the parent/child cascade-delete pattern to copy for `Vehicle`/`Logbook`/`LogbookTrip`
- Direct codebase read: `src/lib/env.ts`, `src/lib/rbac.ts`, `middleware.ts` — confirms `isDemoMode`/`STORAGE_ROOT` mechanics and current RBAC gaps (Open Question #4)
- Direct codebase read: `src/modules/individual-tax/schedules/travel-schedule.ts` — confirms the `r2()` rounding convention and current crude-estimate logic this phase's output will eventually replace (Phase 3, not this phase)
- `.planning/phases/01-rulepack-extension/01-01-SUMMARY.md` and `.planning/research/ARCHITECTURE.md`/`FEATURES.md`/`PITFALLS.md` — prior verified research and completed Phase 1 output (`travelDeemedCostTable`, `TravelDeemedCostBracket`), directly consumable with no new verification needed
- `git status` output / `ls storage/` — confirms `storage/demo-individual-tax-assessments.json`, `storage/demo-clients.json` exist as real files at the expected path, validating the persistence pattern's actual on-disk behavior

### Secondary (MEDIUM confidence)
- [Travel Allowances: A Guide to Tax Implications and Benefits (taxconsulting.co.za)](https://www.taxconsulting.co.za/travel-allowances/) — WebFetch direct read; cites R665,000 cap and section 8(1)(b)(iiiA)(bb) explicitly, with a worked wear-and-tear example (R280,000 ÷ 7 = R40,000/year)
- [Tax Faculty FAQ #1117 on vehicle value/finance charges](https://taxfaculty.ac.za/faq/general_faqs/solution/1117) — WebFetch direct read; independently corroborates the R665,000 figure and the exclusion of finance charges from the vehicle's own valuation base, citing the same statutory section
- Cross-verification via WebSearch: both sources independently surfaced the same R665,000 figure and section citation without prompting for that specific number, which is stronger corroboration than a single search returning one source twice

### Tertiary (LOW confidence — explicitly not relied upon)
- WebSearch synthesis alone (without the two WebFetch reads above) had surfaced a contradictory "R800,000" figure in one auto-generated summary — this was traced to FEATURES.md's own earlier-flagged suspicion of conflation with the deemed-cost table's top bracket, now resolved in favor of R665,000 by direct source reads
- WebFetch attempts on the primary SARS PDFs themselves (`LAPD-IntR-IN-2012-47-Wear-And-Tear-Depreciation-Allowance.pdf`, `PAYE-GEN-01-G03-Guide-for-Employers...pdf`) both failed to extract readable text (binary/encoded content) — flagged, not used as a source; a human with a PDF reader should ideally confirm the R665,000 figure directly against IN47 (Issue 5) or the current PAYE-GEN-01-G03 guide before this ships to a real client, per Open Question #1's recommendation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, pattern fully derived from direct reads of three existing modules
- Architecture: HIGH — direct codebase precedent for every structural decision (repository split, Prisma cascade shape, demo-file persistence)
- Deemed-cost calculation: HIGH — consumes Phase 1's already-verified, already-tested rulepack data with no new research
- Actual-cost calculation: MEDIUM — vehicle-value cap resolved from LOW to MEDIUM confidence this pass (R665,000, two independent secondary sources with matching statutory citation); finance-charge-cap exact mechanics remain genuinely underdocumented, flagged as reviewable/advisory in the implementation
- Pitfalls: HIGH — grounded in direct codebase reads (existing ID-generation weakness, existing rounding convention) plus prior PITFALLS.md research already specific to this exact domain

**Research date:** 2026-07-02
**Valid until:** Architecture/stack findings are stable (no expiry concern — internal codebase pattern). The R665,000 actual-cost cap and other SARS-figure findings should be treated as valid for the 30-day GSD research-freshness window but ideally re-confirmed against a primary-source PDF (with a proper PDF text extractor, not WebFetch) before this ships to a real client filing — recommend flagging this as a follow-up task alongside Phase 1's precedent of loudly-commented unverified data.
