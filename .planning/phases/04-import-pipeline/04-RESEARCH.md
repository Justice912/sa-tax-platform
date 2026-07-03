# Phase 4: Import Pipeline - Research

**Researched:** 2026-07-03
**Domain:** Client-side file parsing (CSV/XLSX) + column auto-detection/mapping + pre-commit validation, for a South African travel-logbook import feature, on Next.js 16.1.6 (Turbopack) / React 19
**Confidence:** HIGH for architecture, library choice, and phase-boundary scoping (direct codebase reads + prior project-level research already resolved the hard technology decisions); MEDIUM for the exact Next.js 16.1.6 + Turbopack Web Worker bundling syntax (documented as supported, but no worked example verified against this repo's pinned version — flagged for an early spike, not a blocker); HIGH for the official SARS eLogbook column layout (verified from the actual downloaded PDF in prior research).

## Summary

This phase has already been substantially de-risked by two rounds of prior research: the project-level research done before Phase 1 (`.planning/research/ARCHITECTURE.md`, `STACK.md`, `PITFALLS.md`, `FEATURES.md`) specifically scoped the import pipeline's libraries, file layout, and pitfalls, and Phase 2's `02-RESEARCH.md`/implementation already built and unit-tested the exact validation function (`validateOdometerContinuity` in `src/modules/logbook/validation.ts`) this phase is told to reuse rather than reimplement. The remaining work for Phase 4 is almost entirely "wire the already-chosen libraries into a new `src/modules/logbook/import/` submodule, following the existing domain-module pattern" — not a technology-selection problem.

The one genuinely unresolved technical risk is confirming that `new Worker(new URL(...))` bundles correctly under this repo's exact pinned Next.js version (16.1.6) with Turbopack (the project's bundler — `next.config.ts` has no `--webpack` opt-out). Turbopack's official docs confirm `new Worker()` expressions are supported with webpack-compatible magic comments, and a worker-origin bug (blob:// URL giving an empty `location.origin`) was fixed in Next.js 16.2 — but that fix affects workers that do relative `fetch()`/WASM-loading from inside the worker, which this phase's workers do not do (they receive a file's raw text/bytes via `postMessage` and return parsed JSON; no worker-side fetch). The risk is therefore LOW in practice but unverified in this exact version, so a same-day spike (create a trivial worker file, confirm `next dev` and `next build` both bundle and run it) is recommended as the first task, exactly as `STATE.md`'s existing blocker note already recommends.

**Primary recommendation:** Build `src/modules/logbook/import/` as a new subfolder of the existing `src/modules/logbook/` domain module — `parse-csv.ts` (PapaParse, CSV, `worker: true`), `parse-xlsx.ts` (SheetJS `xlsx` installed from `cdn.sheetjs.com`, NOT npm), `detect-elogbook.ts` (header-signature matching against the verified official SARS eLogbook columns), `column-mapping.ts` (types + apply-mapping helpers), and `validate-import.ts` (per-row validation reusing Phase 2's `tripInputSchema`/`validateOdometerContinuity`, producing a row-level preview report). Add one new service function, `importTripsToLogbook(logbookId, trips[])`, that does a single bulk persistence write and a single audit-log entry (never one write per row). Do NOT touch `tax-tools.tsx` or build any wizard UI component in this phase — that is explicitly Phase 6's job per the roadmap; this phase's deliverable is the pipeline, independently unit-tested against fixture files, callable by Phase 6's UI later.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **PapaParse** | **5.5.4** (verify current at install time) | Robust CSV parsing: quoted fields, embedded commas/newlines, delimiter auto-detection (`,` vs `;`), built-in `worker: true` mode | Purpose-built for exactly the gaps in the current naive `.split(",")` code (`src/components/individual-tax/tax-tools.tsx` lines 547-560); has first-class Web Worker support with zero manual `postMessage` plumbing; confirmed via official docs (papaparse.com) this session |
| **SheetJS `xlsx`** | **0.20.3**, installed from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` — **NOT the npm registry** | Parse `.xlsx` files including the official SARS eLogbook workbook, client-side | Confirmed via WebSearch this session (2026-07-03) that 0.20.3 remains current on `cdn.sheetjs.com`; the npm-registry `xlsx@0.18.5` is a 4+-year-stale, abandoned package with two unpatched high-severity CVEs (ReDoS, prototype pollution) — SheetJS stopped publishing to npm over an npm Inc. dispute and now distributes only via their own CDN. A plain `npm install xlsx` silently pulls the vulnerable version. |
| **Native Web Worker API** | Browser built-in | Run parsing off the main thread (IMP-04) | PapaParse's `worker: true` handles CSV internally with no extra code. XLSX needs a small hand-rolled dedicated worker module (`new Worker(new URL("./xlsx.worker.ts", import.meta.url))`) since SheetJS has no built-in worker mode. Confirmed supported syntax in Turbopack via official Next.js docs (magic comments work with `new Worker()` expressions) — fetched and read this session. |
| Zod (already installed, `^4.1.8`) | existing | Per-row validation of parsed import rows before commit | Reuse `tripInputSchema`/`tripFieldsSchema` (looser variants as needed) from `src/modules/logbook/validation.ts` — do not invent a parallel validation library |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Comlink** | 4.4.2 | Simplify main-thread ↔ worker RPC | Only if the hand-rolled XLSX worker's messaging grows past a single request/response round trip (e.g., progress events during a huge workbook parse). Skip for a v1 implementation — plain `postMessage`/`onmessage` is enough for "parse this buffer, return these rows." |
| `date-fns` (already installed, `^4.1.0`) | existing | Explicit DD/MM/YYYY date parsing for CSV string cells | Use `parse(dateString, "dd/MM/yyyy", new Date())` (or a small hand-rolled equivalent) instead of `new Date(dateString)`, which is locale-ambiguous and silently swaps day/month for SA-format dates. Already a project dependency — no new install needed for this specific need. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SheetJS `xlsx` (CDN) for `.xlsx` reading | ExcelJS | Better for *writing* richly formatted Excel or server-side streaming of huge files, but narrower format tolerance for *reading* arbitrary client-supplied `.xlsx` variants (old `.xls`, ODS-as-xlsx, oddly-encoded files) than SheetJS. Re-evaluate only if a later phase needs to *generate* formatted `.xlsx` exports. |
| SheetJS `xlsx` (CDN) | `read-excel-file` (9.2.0) | Smaller/simpler API, weaker on edge cases (merged cells, multiple sheets, mixed types) a real client-supplied elogbook is likely to have. Fine as a lighter fallback only if bundle size becomes a hard constraint. |
| PapaParse for CSV | SheetJS's own CSV support (`XLSX.read` accepts CSV text) | Tempting to use one library for both formats, but PapaParse is purpose-built for CSV edge cases (RFC 4180 quoting, delimiter auto-detect, streaming, built-in worker mode) and is much lighter when only CSV is needed. Use PapaParse for `.csv`, SheetJS for `.xlsx` — don't collapse to one library. |
| Native Web Worker + PapaParse's built-in mode | Comlink for everything | Comlink adds value for richer bidirectional RPC. Unneeded for a single request/response parse call — an extra dependency with no benefit at this phase's scope. |

**Installation:**
```bash
npm install --save papaparse
npm install --save-dev @types/papaparse

# XLSX — MUST install from SheetJS's own CDN, NOT plain `npm install xlsx`
npm install --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
# (verify the latest version at https://cdn.sheetjs.com/ before installing;
#  0.20.3 confirmed current via WebSearch on 2026-07-03)

# Optional — only if the XLSX worker's messaging outgrows plain postMessage
npm install --save comlink
```

Note on lockfile hygiene: because the XLSX package installs from a tarball URL rather than the npm registry, confirm `package-lock.json` records the resolved CDN URL and integrity hash correctly. There is no `npm outdated` auto-detection for CDN-sourced packages — version bumps require manually re-checking `cdn.sheetjs.com`/`docs.sheetjs.com`.

## Architecture Patterns

### Recommended Project Structure

```
src/modules/logbook/
├── types.ts                    # existing (Phase 2) — LogbookTripRecord, VehicleDetails, etc.
├── validation.ts                # existing (Phase 2) — tripInputSchema, validateOdometerContinuity (REUSE, don't reimplement)
├── calculation.ts                # existing (Phase 2) — untouched by this phase
├── repository.ts                  # existing (Phase 2) — add a bulk-insert path for imported trips (one write, not N)
├── service.ts                      # existing (Phase 2) — add importTripsToLogbook()
├── export.ts                        # existing (Phase 2) — untouched by this phase
└── import/                            # NEW this phase
    ├── types.ts                         # ParsedImportData, RawImportRow, ColumnMapping, ImportPreviewRow, ImportPreviewResult
    ├── parse-csv.ts                       # PapaParse wrapper — text/File in, { headers, rows } out
    ├── parse-csv.test.ts
    ├── parse-xlsx.ts                       # SheetJS wrapper — ArrayBuffer/File in, { headers, rows } out
    ├── parse-xlsx.test.ts
    ├── detect-elogbook.ts                    # header-signature matching → suggested ColumnMapping | null
    ├── detect-elogbook.test.ts
    ├── column-mapping.ts                       # apply a ColumnMapping to raw rows → candidate trip objects
    ├── column-mapping.test.ts
    ├── parse-dates.ts                            # DD/MM/YYYY string parser + Excel-serial-date converter (shared by both parsers)
    ├── parse-dates.test.ts
    ├── validate-import.ts                          # per-row Zod validation + validateOdometerContinuity reuse → ImportPreviewResult
    ├── validate-import.test.ts
    ├── csv.worker.ts                                 # thin worker entry (or rely on PapaParse's internal worker: true — see Pattern 2)
    ├── xlsx.worker.ts                                  # hand-rolled dedicated worker wrapping parse-xlsx.ts
    └── __fixtures__/
        ├── quoted-fields.csv                             # commas/newlines inside quoted fields
        ├── semicolon-delimited.csv                        # SA/EU-locale Excel export
        ├── sars-elogbook-template.xlsx                     # canonical official column layout (or a faithful reconstruction)
        ├── sars-elogbook-variant.xlsx                       # reordered/renamed columns, to prove detection degrades to manual mapping, not silent misdetection
        ├── excel-serial-dates.xlsx                           # real Excel date-formatted cells
        ├── large-10000-rows.csv                               # synthetic fixture for IMP-04 responsiveness/throughput testing
        └── broken-odometer-continuity.csv                     # deliberately discontinuous/reversed readings for IMP-05
```

This mirrors the exact `import/` subfolder ARCHITECTURE.md already speced during project-level research, and follows Phase 2's established convention of one domain concern per pure, independently-Vitest-tested file, co-located `*.test.ts`.

### Pattern 1: Import pipeline as pure, framework-free transform functions

**What:** `parse-csv.ts`, `parse-xlsx.ts`, `detect-elogbook.ts`, `column-mapping.ts`, `parse-dates.ts`, and `validate-import.ts` take plain data in (text, `ArrayBuffer`, or already-parsed rows) and return plain data out (`{ headers, rows }`, a `ColumnMapping`, an `ImportPreviewResult`). None of them import React, Next.js, or DOM APIs directly — the browser-only pieces (`FileReader`, `Worker`, `File`) live at the thin call-site boundary (a worker entry file or, later, Phase 6's wizard component), not inside the parsing logic itself.

**When:** Always for this phase. This is the same pattern Phase 2 already used for `calculation.ts` (pure functions, unit-testable without a browser) and gives Phase 6 a stable, already-verified contract to build the wizard UI against.

**Example — CSV parser shape (PapaParse wrapper):**
```typescript
// src/modules/logbook/import/parse-csv.ts
import Papa from "papaparse";

export interface ParsedImportData {
  headers: string[];
  rows: Record<string, string>[];
  errors: { row: number; message: string }[];
}

/** Synchronous convenience wrapper for small files / unit tests. For real (potentially
    10,000+ row) files, use parseCsvInWorker() instead — see Pattern 2. */
export function parseCsvText(rawText: string): ParsedImportData {
  const result = Papa.parse<Record<string, string>>(rawText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // keep everything as strings; typed conversion happens in validate-import.ts
  });

  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
    errors: result.errors.map((e) => ({ row: e.row ?? -1, message: e.message })),
  };
}
```
Source: PapaParse official docs (papaparse.com/docs), fetched/confirmed this session — HIGH confidence.

### Pattern 2: Off-main-thread parsing (IMP-04) — different mechanism per format

**What:** CSV and XLSX need two different worker strategies because only PapaParse has built-in worker support.

- **CSV:** Pass `worker: true` directly to `Papa.parse(file, { worker: true, header: true, complete, error })`. PapaParse spins up and manages its own Web Worker internally — no manual `postMessage` plumbing required. This is the simplest, lowest-risk path to satisfying IMP-04 for CSV.
- **XLSX:** SheetJS has no built-in worker mode, so wrap the parse call in a small dedicated worker module:

```typescript
// src/modules/logbook/import/xlsx.worker.ts
import { read, utils } from "xlsx";

self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  const workbook = read(event.data, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  self.postMessage({ headers: Object.keys(rows[0] ?? {}), rows });
};
```
```typescript
// call site (later, Phase 6's wizard — shown here for the pipeline's contract)
const worker = new Worker(new URL("./xlsx.worker.ts", import.meta.url));
worker.postMessage(await file.arrayBuffer());
worker.onmessage = (e) => { /* handle { headers, rows } */ };
```

**When:** Both parsers must be reachable via a worker path for any file that could plausibly be 10,000+ rows (the phase's explicit IMP-04 scale target). A small/typical file (dozens of rows) can still call the synchronous wrapper directly without a worker — the worker path is what proves the success criterion, not a hard requirement for every single call site.

**Critical unresolved detail (spike required):** `cellDates: true` on `XLSX.read()` is the documented way to get JS `Date` objects instead of raw serial numbers for date-formatted cells — verify this actually converts as expected against a *real* `.xlsx` fixture (not just a CSV-derived expectation) as a fixture test, per Pitfall 1 below. Also confirm `new Worker(new URL(...))` bundles correctly under Next.js 16.1.6 + Turbopack specifically (this repo's pinned version) with a minimal spike before investing in the full worker module — Turbopack's docs confirm `new Worker()` is a supported magic-comment target, and the only known worker-related bug (empty `location.origin` on the blob:// bootstrap URL) was fixed in 16.2 and only affects workers doing their own relative `fetch()`/WASM loading, which this pipeline's workers do not do (they only exchange data via `postMessage`). Risk assessed as LOW but genuinely unverified in this exact version — do the spike first, not last.

### Pattern 3: SARS eLogbook auto-detection with mandatory user-confirmed preview (IMP-03, IMP-05)

**What:** `detect-elogbook.ts` compares the parsed file's header row against the verified official SARS eLogbook column signature and returns either a suggested `ColumnMapping` (high-confidence match) or `null` (fall through to manual mapping). Crucially, per PITFALLS.md's Pitfall 11 (brittle auto-detection), a "detected" mapping is never auto-committed — it is always shown to the user as an editable, confirmable preview before any row is imported. This phase does not need to build that UI (Phase 6 does), but the pipeline's contract must return a mapping-with-confidence shape that a UI can render, not a boolean "did it work."

**Verified official SARS eLogbook column headers** (confirmed via direct PDF read in the prior project-level research, `.planning/research/FEATURES.md` — HIGH confidence): `Date`, `*Opening Km`, `*Closing Km`, `Total Business Km`, `From`, `To`, `Reason`, `Actual Fuel & Oil Costs`, `Actual Repairs & Maintenance Costs`. Note per-trip odometer is explicitly marked "*not compulsory*" on the official template — this matches Phase 2's already-implemented `LogbookTripRecord.odometerStart/odometerEnd` being nullable; do not make the detector require those columns to declare a match.

```typescript
// src/modules/logbook/import/detect-elogbook.ts
export interface DetectedMapping {
  mapping: ColumnMapping;
  confidence: "high" | "medium";
  matchedHeaders: string[];
}

const SARS_ELOGBOOK_SIGNATURE: Record<keyof ColumnMapping, string[]> = {
  date: ["date"],
  businessKm: ["total business km", "business km"],
  fromLocation: ["from"],
  toLocation: ["to"],
  reason: ["reason"],
  odometerStart: ["*opening km", "opening km"],
  odometerEnd: ["*closing km", "closing km"],
};

export function detectSarsElogbookLayout(headers: string[]): DetectedMapping | null {
  // Fuzzy match: lowercase, trim, strip leading "*", compare against known aliases per field.
  // Require the mandatory fields (date, businessKm, from, to, reason) to all match before
  // returning non-null; odometer columns are optional per the official template.
}
```

**When:** Always run detection first; only fall back to requiring manual mapping (a `ColumnMapping` supplied by the user, validated the same way) when detection returns `null` or the user overrides it. Do not hardcode exact header *positions* — SARS periodically revises the published workbook and users frequently reorder/rename columns; match by header text (fuzzily), never by column index.

### Pattern 4: Reuse Phase 2's validation, don't reimplement it (IMP-05)

**What:** `src/modules/logbook/validation.ts`'s `validateOdometerContinuity()` was explicitly built in Phase 2 to be reused by this phase's import pipeline ("Pitfall 2... Build this once here; Phase 4's import pipeline reuses the same validation function rather than re-implementing it" — direct quote from `02-RESEARCH.md`, and the function's own doc comment confirms: *"Pure validator reused by both the interactive capture flow (this milestone) and Phase 4's import pipeline"*). `validate-import.ts` in this phase should call it directly, passing the mapped+parsed candidate trips, rather than writing new continuity logic.

**Example:**
```typescript
// src/modules/logbook/import/validate-import.ts
import { tripFieldsSchema, validateOdometerContinuity } from "@/modules/logbook/validation";
import type { LogbookWarning } from "@/modules/logbook/types";

export interface ImportRowResult {
  rowIndex: number;
  status: "valid" | "invalid" | "warning";
  trip?: { date: string; businessKm: number; fromLocation: string; toLocation: string; reason: string; odometerStart: number | null; odometerEnd: number | null };
  errors: string[];
}

export interface ImportPreviewResult {
  rows: ImportRowResult[];
  validCount: number;
  invalidCount: number;
  continuityWarnings: LogbookWarning[];
}

export function buildImportPreview(
  candidateRows: unknown[],
  logbookOdometers: { openingOdometer: number; closingOdometer: number | null },
): ImportPreviewResult {
  // 1. Per-row: tripFieldsSchema.safeParse() each candidate → per-row valid/invalid + reasons
  //    (unparseable dates, negative/non-numeric business km, missing mandatory fields all
  //    surface here as row-level errors, not a single generic "import failed").
  // 2. Cross-row: pass ALL structurally-valid rows to validateOdometerContinuity() (imported
  //    from validation.ts, not reimplemented) to catch discontinuities/reversals/business-km-
  //    exceeds-total-km as warnings/errors on top of the per-row result.
  // (full implementation is a planning/execution concern, not a research concern)
}
```

**When:** Always — this is the seam that satisfies IMP-05 ("odometer discontinuities, invalid dates, and unparseable rows are flagged in the preview before the user finalizes the import"). Do not build a second, import-specific odometer-continuity checker.

### Pattern 5: Bulk commit as one write, one audit entry

**What:** Add `importTripsToLogbook(logbookId, validatedTrips)` to `service.ts`, following the exact audit-log pattern every other `service.ts` mutator already uses (`writeAuditLog` with a single summary describing the batch, e.g., `"Imported 247 trips from CSV import into the 2027 logbook."`), and extend `repository.ts` with a bulk-insert path (`addTrips(logbookId, trips[])` — plural) so demo-mode does one `writeDemoLogbooksToDisk()` call and the Prisma path does one `createMany` (or a single transaction), never N sequential `addTrip()` calls. Re-run `assertOdometerContinuity` once against the full merged trip set (existing + imported) before committing, exactly as `addTripToLogbook`/`updateLogbookTrip` already do for single trips.

**When:** This phase — the "commit" step is explicitly in scope per the phase boundary note (parsing, detection, mapping, validation, preview data, **commit** are Phase 4; only the wizard UI chrome is Phase 6).

### Anti-Patterns to Avoid

- **Naive CSV parsing (`split("\n")`/`split(",")`):** This is the literal, named bug in the existing `tax-tools.tsx` (`handleFile`, lines 542-567) that this milestone exists to fix. Breaks on any field containing a comma (e.g., a trip reason like `"Client meeting, Sandton"`), breaks on `\r\n` line endings from Excel-exported CSVs, cannot auto-detect `;`-delimited SA/EU-locale exports, and cannot handle `.xlsx` at all. Do not reference or extend this code from the new `import/` module — it is a separate, disconnected legacy path that Phase 5/6 will eventually remove, not integrate with.
- **`new Date(dateString)` on any CSV/XLSX cell value:** Locale-ambiguous; silently swaps day/month for SA-format DD/MM/YYYY dates (`new Date("03/04/2026")` parses as March 4, not the intended 3 April) — a silent wrong-answer bug, not a crash. Use an explicit DD/MM/YYYY-first parser (`parse-dates.ts`) for CSV strings, and explicit Excel-serial-number detection (`cellDates: true` + a fixture test verifying it) for XLSX cells.
- **Synchronous parsing of a large file on the main thread "because the file is usually small":** The exact root cause of the freeze bug named in `PROJECT.md`. `FileReader.readAsText()`/`readAsArrayBuffer()` being asynchronous at the I/O level creates a false sense that the whole pipeline is non-blocking — the CSV/XLSX parsing, header mapping, and per-row validation that runs inside the `onload` callback is what actually blocks, and it's easy to fix rendering-side performance (virtualization) while leaving import-time parsing itself still synchronous. Always route files above a size/row threshold through the worker path.
- **Auto-detecting and silently committing a column mapping without a confirmation preview:** SARS periodically revises the published eLogbook workbook, and users routinely reorder/rename columns or add a title row. Detection logic written against one exact template snapshot will either correctly fall back to `null` (fine) or — worse — misdetect and silently map the wrong column (e.g., treating a "Notes" column as "Reason" because it landed in the expected position), corrupting data with no visible error. Never skip the user-confirmable preview step, even on a "high confidence" detection.
- **Reimplementing odometer-continuity validation inside the import module:** `validateOdometerContinuity()` already exists in `src/modules/logbook/validation.ts`, was explicitly designed for this exact reuse, and is already unit-tested. A second, import-specific implementation risks the two checkers drifting and disagreeing.
- **One persistence write per imported row:** At 10,000+ rows this is both a performance problem and an audit-log-noise problem (10,000 separate `LOGBOOK_TRIP_ADDED` audit entries for one import event). Batch into a single write and a single `LOGBOOK_TRIPS_IMPORTED`-style audit entry.
- **Trusting file size/row count with no upper bound:** A crafted or accidentally huge file (millions of rows, or a zip-bomb-style XLSX) can exhaust memory/CPU during import — a real DoS vector even on a single-practitioner deployment. Enforce a maximum file size and row count check immediately after the file is selected, before full parsing begins, and reject with a clear error.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing (quoted fields, delimiter detection, embedded newlines) | A regex- or split-based CSV parser | PapaParse | RFC 4180 quoting edge cases (escaped quotes, embedded commas/newlines/CRLF) are exactly the kind of "looks easy, isn't" problem a mature library has already solved and fuzz-tested; this is the literal bug class this milestone is named to fix |
| `.xlsx` binary parsing | A hand-rolled ZIP+XML reader for the Open XML spreadsheet format | SheetJS `xlsx` (from `cdn.sheetjs.com`) | `.xlsx` is a zipped XML document format with cell-type/date-serial/multi-sheet complexity; this is not a "quick script" problem, and the project already has `jszip` installed for unrelated reasons — that is not a reason to hand-roll spreadsheet parsing on top of it |
| Off-main-thread execution for CSV | Manual `postMessage`/`onmessage` boilerplate for CSV | PapaParse's built-in `worker: true` | PapaParse already ships this exact feature; writing a custom CSV worker duplicates functionality the dependency already provides for free |
| Odometer/business-km continuity checks on imported rows | A second continuity checker inside `import/` | `validateOdometerContinuity()` from `src/modules/logbook/validation.ts` (Phase 2) | Already built, already unit-tested, and explicitly designed for this exact reuse per its own doc comment and Phase 2's research |
| Per-row structural validation (required fields, types) | Ad hoc `if` checks per field | `tripFieldsSchema`/`tripInputSchema` (or a looser pre-mapping variant) from `validation.ts` | Same Zod schemas already encode the mandatory/optional field rules (e.g., odometer optional, business km/date/from/to/reason mandatory) verified against the real SARS eLogbook |

**Key insight:** Every hard problem in this phase's domain (CSV robustness, XLSX binary parsing, off-main-thread execution, odometer continuity) already has either a well-established external library or an already-built, already-tested internal function. The actual work is integration and column-mapping/detection logic specific to the SARS template — not any of the "hard" parsing primitives.

## Common Pitfalls

### Pitfall 1: Date parsing breaks across CSV conventions and Excel serial dates
**What goes wrong:** `new Date(dateString)` on a CSV cell silently swaps day/month for SA-format DD/MM/YYYY dates. Separately, a naive XLSX read returns a raw serial number (e.g., `46020`), a formatted string, or a JS `Date`, depending on cell formatting and library options — code that only handles one shape will silently corrupt dates from real-world files.
**Why it happens:** JS's `Date` constructor accepts ambiguous string formats without erroring, so the bug produces a wrong-but-plausible date, not a crash. XLSX's serial-date behavior is easy to miss because `cellDates: true` must be set explicitly and even then some cells (numbers not formatted as dates) legitimately stay numeric.
**How to avoid:** Never call `new Date(dateString)` on raw CSV/XLSX cell values. Write an explicit `parse-dates.ts` with a DD/MM/YYYY-first string parser (or use `date-fns`'s `parse(str, "dd/MM/yyyy", new Date())`, already a project dependency) and an explicit Excel-serial-number branch, verified with `cellDates: true` on `XLSX.read()`.
**Warning signs:** Any `new Date(...)` call reachable from parsed import data; no fixture test using an actual `.xlsx` file with real Excel date-formatted cells (only CSV string dates tested).
**Verification:** Fixture tests with deliberately ambiguous dates (e.g., "05/06/2026") for both CSV and XLSX paths, asserting the DD/MM/YYYY-first interpretation; a real `.xlsx` fixture (not a CSV-derived assumption) exercising the serial-date path.

### Pitfall 2: FileReader/parsing blocking the main thread on large files
**What goes wrong:** `FileReader` firing an `onload` event creates a false sense that the whole pipeline is non-blocking, but everything inside that callback — CSV/XLSX parsing, header mapping, per-row validation — runs synchronously on the main thread unless explicitly chunked or offloaded. At 10,000+ rows (this phase's named scale target, IMP-04) this can freeze the UI for seconds.
**Why it happens:** It's easy to fix the rendering-side symptom (a later phase's virtualized table) while leaving the actual import-time parsing step still blocking, since the freeze during *import* and the freeze during *render* look similar to a user but have different root causes and different fixes.
**How to avoid:** Route CSV through PapaParse's `worker: true`; route XLSX through a dedicated worker module (Pattern 2). Show a progress/row-count indicator during import so the UI's non-blocking state is visible (not just true).
**Verification:** A synthetic 10,000-row fixture test asserting the parse completes within an acceptable time budget; ideally a manual/E2E check that a click handler still responds during import (this is a Phase 6 UI-level check once the wizard exists, but the underlying worker-based parsing this phase builds is the prerequisite).

### Pitfall 3: Brittle SARS eLogbook auto-detection
**What goes wrong:** Detection logic written against one exact downloaded template snapshot silently fails to detect (acceptable — falls back to manual mapping) or, worse, misdetects and silently maps the wrong column, corrupting data with no visible error, because SARS periodically revises the published template and users routinely reorder/rename/add columns.
**Why it happens:** It's tempting to hardcode exact header strings and/or column positions from the one template that was downloaded and inspected.
**How to avoid:** Fuzzy header matching (case-insensitive, trimmed, strip a leading `*`) against known aliases per field, never by column position; always require the user to confirm/edit the detected mapping before committing (Pattern 3); test against both the canonical template and at least one deliberately varied version.
**Verification:** Fixture tests covering both the canonical SARS layout and a reordered/renamed variant, asserting the varied one either correctly still detects (via fuzzy matching) or cleanly falls through to `null` — never a wrong silent mapping.

### Pitfall 4: Odometer continuity validated on manual entry but bypassed on import
**What goes wrong:** The newer bulk-import path re-derives its own (possibly weaker or absent) continuity check instead of reusing the one Phase 2 already built for manual trip capture, so imported data gets a different, possibly laxer, validation bar than manually-entered data.
**How to avoid:** Call `validateOdometerContinuity()` directly from `validate-import.ts`, passing the full candidate trip set (existing logbook trips + newly-parsed rows) exactly as `service.ts`'s `assertOdometerContinuity` helper already does for single-trip mutations.
**Verification:** A test importing a deliberately discontinuous fixture (gap, overlap, and a reversed-reading row) and asserting each surfaces as a row-level warning/error in the preview, not a silent accept — using the identical error/warning codes Phase 2's tests already assert on (`BUSINESS_KM_EXCEEDS_TOTAL`, `TRIP_ODOMETER_REVERSED`, `TRIP_ODOMETER_DISCONTINUITY`, `CLOSING_ODOMETER_MISSING`).

### Pitfall 5: Untrusted file size/row count with no upper bound
**What goes wrong:** A crafted or accidentally huge file is processed without limit, exhausting memory/CPU — a denial-of-service vector even on a single-practitioner deployment, and worse on any shared instance.
**How to avoid:** Enforce a maximum file size (e.g., a few MB — SARS eLogbook exports for a full tax year of daily trips are nowhere near this) and a maximum row count, checked immediately after file selection/before full parsing, with a clear rejection error rather than an attempted process-then-fail.
**Verification:** A test asserting an oversized/over-row-count fixture is rejected before parsing completes, not after.

### Pitfall 6: Floating-point currency drift compounding across 10,000+ imported rows
**What goes wrong:** This phase doesn't itself compute deemed/actual cost (Phase 2 already does, and Phase 2's `calculation.ts` already sums unrounded and rounds once at the end — see `r2()` convention), but a naive per-row transform inside the import pipeline that rounds intermediate values (e.g., a per-row cost estimate shown in the preview) before the real calculation runs would introduce a second, inconsistent rounding pass.
**How to avoid:** The import pipeline's preview should show raw parsed/validated values (dates, km, text fields) — not a duplicate cost calculation. If a preview total is shown (e.g., "247 trips, X total business km"), sum first, round once, exactly like `calculation.ts`/`export.ts` already do.
**Verification:** Not a primary risk for this phase since cost calculation is out of scope here, but worth a lint-level check: no `Math.round`/`r2()`-style rounding anywhere in `import/` except at a genuine final display boundary.

## Code Examples

### Excel serial-date conversion (verified formula, standard reference)
```typescript
// src/modules/logbook/import/parse-dates.ts
// Excel's epoch is 1899-12-30 (not 1900-01-01) due to the historical Lotus 1-2-3 leap-year bug
// that Excel preserved for compatibility. With SheetJS's cellDates: true, this conversion is
// normally done for you — but verify explicitly with a real .xlsx fixture rather than assuming.
export function excelSerialDateToIso(serial: number): string {
  const utcMs = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(utcMs).toISOString().slice(0, 10);
}
```
Source: standard, widely-documented Excel serial-date epoch conversion (25569 = days between 1899-12-30 and 1970-01-01 Unix epoch), cross-referenced against PITFALLS.md's prior research on this exact conversion — MEDIUM-HIGH confidence (well-known formula, but SheetJS's `cellDates: true` should be the primary mechanism; this is the fallback/verification path).

### DD/MM/YYYY-first parsing using the already-installed `date-fns`
```typescript
import { parse, isValid } from "date-fns";

export function parseSaDateString(raw: string): string | null {
  const parsed = parse(raw.trim(), "dd/MM/yyyy", new Date());
  if (!isValid(parsed)) return null;
  return parsed.toISOString().slice(0, 10);
}
```
Source: `date-fns` official API (already a verified project dependency, `^4.1.0`, per `package.json`) — HIGH confidence.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `tax-tools.tsx`'s `handleFile`/`processImport`: `FileReader.readAsText()` + `split("\n")`/`split(",")`, synchronous, main-thread, requires Start/End KM as mandatory | New `src/modules/logbook/import/` pipeline: PapaParse/SheetJS, worker-based, mandatory-field set matches the verified official SARS eLogbook (odometer optional) | This phase | Fixes the named quoted-field/delimiter/freeze bugs and aligns mandatory-field validation with the actual SARS template rather than an invented stricter rule |
| No `.xlsx` support at all | SheetJS-based XLSX parsing, including the official SARS eLogbook workbook and Excel serial-date handling | This phase | Directly satisfies IMP-02 |
| No column auto-detection | `detect-elogbook.ts` fuzzy header-signature matching with mandatory user-confirmed preview | This phase | Satisfies IMP-03 while avoiding the brittle-detection pitfall the prior research explicitly flagged |

**Deprecated/outdated:** The `tax-tools.tsx` upload/import code path (`handleFile`, `processImport`, `finaliseImport`, lines ~542-605) is not deprecated by this phase directly (Phase 5/6 own removing/replacing it), but this phase's new pipeline must not extend or depend on it — it is dead-end legacy code being superseded, not a pattern to build on.

## Open Questions

1. **Exact Next.js 16.1.6 + Turbopack Web Worker bundling syntax in this repo — needs a same-day spike, not a blocker**
   - What we know: Turbopack's official docs (fetched live this session, docs dated 2026-05-31 / version 16.2.10 of the docs site) confirm `new Worker()` expressions are a supported target for webpack-compatible magic comments, and that a worker-origin bug (workers bootstrapped via a `blob://` URL giving an empty `location.origin`, breaking relative `fetch()`/WASM loading inside a worker) was fixed in Next.js 16.2. This repo is pinned to `16.1.6` (`package.json`), one minor version before that fix.
   - What's unclear: Whether the pre-16.2 origin bug affects this phase's workers at all — they only exchange data via `postMessage` (no worker-side `fetch()` or WASM loading), so it plausibly does not apply, but there is no verified worked example specific to 16.1.6 + Turbopack for a plain data-only worker.
   - Recommendation: Do a 15-minute spike as the very first task of this phase — create a trivial worker file (`echo.worker.ts` that just posts back what it receives), instantiate it with `new Worker(new URL("./echo.worker.ts", import.meta.url))` from a client component, and confirm it works under both `next dev` and `next build` (Turbopack is the default bundler for both in this Next.js version; `next.config.ts` has no `--webpack` fallback configured). If it fails, the fallback is either (a) bumping to Next.js 16.2+ (a larger, out-of-scope-for-this-phase change) or (b) using PapaParse's CSV worker (self-contained, doesn't depend on this repo's worker bundling) while chunking XLSX parsing with `requestIdleCallback`/`setTimeout` batching instead of a dedicated worker, as a documented fallback per PITFALLS.md's Pitfall 10 guidance.

2. **Where exactly does the file-upload entry point live — a Next.js API route, or purely client-side with no server round-trip for the raw file?**
   - What we know: The deployment constraint (Vercel serverless = ephemeral writes) and the "Web Workers are a client-side concern" framing in this phase's brief both point toward parsing happening entirely in the browser — the file never needs to reach the server as a raw CSV/XLSX blob; only the already-parsed, already-validated `LogbookTripRecord[]` array needs to reach the server (via the existing service-layer pattern, e.g. a server action or a small API route calling `importTripsToLogbook`).
   - What's unclear: Whether this phase should also define that commit-side API route/server action, or whether that plumbing belongs to Phase 6 (which builds the actual UI that would call it). The phase description explicitly lists "commit" as in-scope for this phase, which suggests the `service.ts`/`repository.ts` bulk-import function is this phase's responsibility, but the actual HTTP-layer wiring (route handler or server action) is arguably UI-adjacent.
   - Recommendation: This phase should ship `importTripsToLogbook()` in `service.ts` (data-layer commit, directly unit-testable, matching Phase 2's `addTripToLogbook` pattern) and stop there — leave the route/server-action wiring to Phase 6, consistent with how Phase 2 left CSV-export's actual HTTP/download route to a later phase (per `02-RESEARCH.md`'s Open Question 3, which set exactly this precedent: data-shape and pure logic now, HTTP/UI plumbing later). Confirm this split with the planner.

3. **Real vs. reconstructed SARS eLogbook `.xlsx` fixture for testing**
   - What we know: The exact official column headers are confirmed (HIGH confidence, direct PDF read in prior research: `Date`, `*Opening Km`, `*Closing Km`, `Total Business Km`, `From`, `To`, `Reason`, `Actual Fuel & Oil Costs`, `Actual Repairs & Maintenance Costs`).
   - What's unclear: Whether an actual official SARS `.xlsx` workbook file is available to use as a test fixture, or whether the test suite needs to construct a faithful `.xlsx` fixture programmatically (e.g., using SheetJS's own write capability to build a fixture matching the verified column layout) since downloading and committing a third-party government PDF-derived spreadsheet into the repo may not be desirable/appropriate.
   - Recommendation: Construct fixture `.xlsx` files programmatically in a test-setup script (using SheetJS to write a workbook matching the verified header list, including some cells with genuine Excel date formatting to exercise the serial-date path) rather than sourcing/committing the actual SARS-published file. This keeps the fixture reproducible and avoids any licensing ambiguity around redistributing a downloaded government document.

## Validation Architecture

Skipped — `.planning/config.json`'s `workflow` object contains only `research`, `plan_check`, and `verifier` keys; there is no `nyquist_validation` key, so per the researcher's own instructions this section is omitted (consistent with Phase 2's and Phase 3's RESEARCH.md, which both skipped this section for the identical reason). Standard guidance: this phase's tests should be co-located Vitest suites (`parse-csv.test.ts`, `parse-xlsx.test.ts`, `detect-elogbook.test.ts`, `column-mapping.test.ts`, `parse-dates.test.ts`, `validate-import.test.ts`) following the exact existing convention, run via `npm run test` (Vitest 4). Because `jsdom` (the configured Vitest environment, per `vitest.config.ts`) does not implement real Web Workers, the worker-wrapped code paths (`csv.worker.ts`/`xlsx.worker.ts`) should be tested by unit-testing the underlying pure functions directly (bypassing the worker boundary in tests) plus a manual/Playwright-level smoke check (this repo already has `@playwright/test` installed) confirming the worker actually instantiates and returns data in a real browser context — a pure Vitest/jsdom suite cannot prove IMP-04's "UI stays responsive" claim, only that the parsing logic itself is correct.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| IMP-01 | User can import trips from CSV with robust parsing (quoted fields, delimiter detection, SA DD/MM/YYYY date handling) | PapaParse (`parse-csv.ts`, Pattern 1) for quoted-field/delimiter-robust parsing; `parse-dates.ts`/`date-fns` `parse(str, "dd/MM/yyyy", ...)` (Code Examples) for SA-format dates, replacing the locale-ambiguous `new Date(dateString)` anti-pattern (Pitfall 1) |
| IMP-02 | User can import trips from Excel (.xlsx), including Excel serial-date handling | SheetJS `xlsx` from `cdn.sheetjs.com` (Standard Stack), `cellDates: true` + explicit serial-number fallback conversion (Code Examples, Pitfall 1) |
| IMP-03 | The official SARS elogbook layout is auto-detected and columns mapped automatically; manual column mapping remains available for other layouts | `detect-elogbook.ts` fuzzy header-signature matching against the verified official column list (Pattern 3), `column-mapping.ts` for the shared apply-mapping logic used by both auto-detected and manually-supplied mappings; mandatory user-confirmable preview per Pitfall 3 |
| IMP-04 | Importing 10,000+ rows does not freeze the UI (parsing off the main thread, preview before commit) | PapaParse `worker: true` for CSV, dedicated `xlsx.worker.ts` for XLSX (Pattern 2); Open Question 1 flags the one unverified detail (Turbopack/Next.js 16.1.6 worker bundling) with a same-day spike recommendation |
| IMP-05 | Import validation flags odometer discontinuities, invalid dates and unparseable rows before the user finalises | `validate-import.ts` reusing Phase 2's `validateOdometerContinuity()` and `tripFieldsSchema` directly (Pattern 4, Pitfall 4) rather than reimplementing continuity/structural validation |
</phase_requirements>

## Sources

### Primary (HIGH confidence)
- Direct codebase reads: `src/modules/logbook/types.ts`, `validation.ts`, `calculation.ts`, `service.ts`, `repository.ts`, `export.ts` (full files, this session) — confirms the exact existing domain-module pattern, the already-built `validateOdometerContinuity()`/`tripInputSchema` this phase must reuse, and the exact `LogbookTripRecord`/`LogbookRecord` shapes the import pipeline must produce
- Direct codebase read: `src/components/individual-tax/tax-tools.tsx` (lines 78, 185, 525-627, 671-889) — confirms the exact legacy naive-CSV-parsing anti-pattern (`handleFile`/`processImport`) this phase's pipeline supersedes, and that a rudimentary manual column-mapping UI already exists there (informs, but does not constrain, Phase 6's later UI)
- Direct codebase read: `package.json` — confirms no CSV/XLSX/worker library currently installed; Next.js `16.1.6`, React `19.2.3`, `date-fns ^4.1.0`, `zod ^4.1.8` already present
- Direct codebase read: `next.config.ts` — confirms Turbopack is active with no webpack fallback configured, and no existing worker-related config
- `.planning/phases/02-logbook-domain-module/02-RESEARCH.md` and Phase 2's actual implementation — confirms `validateOdometerContinuity()` was purpose-built for this phase's reuse
- `.planning/research/ARCHITECTURE.md`, `STACK.md`, `PITFALLS.md`, `FEATURES.md` (prior project-level research, dated 2026-07-02) — the `import/` subfolder structure, library choices (PapaParse/SheetJS/Web Worker/Comlink), and the verified official SARS eLogbook column headers were already resolved here with HIGH confidence (direct PDF reads); this session's research verified these findings are still current rather than re-deriving them
- WebFetch of `https://nextjs.org/docs/app/api-reference/turbopack` (this session, page dated 2026-05-31 / docs version 16.2.10) — confirms `new Worker()` magic-comment support and the 16.2 worker-origin fix, HIGH confidence, official source

### Secondary (MEDIUM confidence)
- WebSearch confirming SheetJS `xlsx` 0.20.3 remains current at `cdn.sheetjs.com` as of 2026-07-03 (one day after the original STACK.md research) — consistent with the prior finding, no version drift found
- WebSearch confirming PapaParse's `worker: true` + `step` streaming API remains the documented current pattern (papaparse.com) — functionality confirmed, exact current version number not independently re-verified this session (5.5.4 carried forward from prior STACK.md research)
- WebSearch on `new Worker(new URL(...))` Next.js App Router usage patterns — confirms the standard `"use client"` + instantiate-in-effect-or-handler pattern is current community practice, cross-referenced against the official Turbopack docs above

### Tertiary (LOW confidence)
- None new this session — the one flagged low-certainty item (exact Turbopack + Next.js 16.1.6 worker behavior for this repo specifically) is explicitly called out in Open Questions with a recommended spike, not stated as fact

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — library choices (PapaParse, SheetJS-from-CDN) were already resolved with primary-source verification in prior project-level research and reconfirmed current this session
- Architecture: HIGH — direct codebase precedent for the domain-module pattern (Phase 2), and the `import/` subfolder structure was already speced in prior research; this session added the phase-boundary clarification (pipeline now, wizard UI in Phase 6) grounded in the roadmap and phase brief
- Pitfalls: HIGH — grounded in both direct codebase reads (the actual naive-CSV bug in `tax-tools.tsx`) and prior domain-specific research (PITFALLS.md's dedicated CSV/XLSX/date/worker pitfalls)
- Worker bundling under this repo's exact Next.js version: MEDIUM — documented as supported in principle, genuinely unverified for this exact pinned version; explicitly flagged as an Open Question with a concrete spike recommendation, not asserted as resolved

**Research date:** 2026-07-03
**Valid until:** Architecture/stack findings are stable for the ~30-day GSD research-freshness window (internal codebase patterns don't expire; PapaParse/SheetJS version pins should be re-checked against their respective registries/CDN if this phase's implementation is delayed more than a few weeks). The Turbopack worker-bundling Open Question should be resolved by a spike at the start of implementation, not by further research — it is an empirical "does it run" question, not a documentation gap.
