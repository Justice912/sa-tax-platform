# Phase 6: Logbook UI, Import Wizard & Performance Hardening - Research

**Researched:** 2026-07-04
**Domain:** React 19 / Next.js 16 UI wiring — list virtualization, multi-step import wizard, Server Actions, persistence-backed calculation
**Confidence:** HIGH (codebase facts, read directly) / MEDIUM (virtualization library ecosystem, verified via npm registry) / LOW-MEDIUM (architecture decisions this phase must make, since no prior CONTEXT.md exists)

## Summary

This phase's actual challenge is not "add a virtualization library" — it's reconciling three things that were built in isolation and never connected:

1. **`travel-logbook-tab.tsx` (964 lines, read in full) is a self-contained toy.** It manages `Trip[]` in local `useState` only. It has its own CSV-only, naive, non-worker upload path (`FileReader` + `line.split(",")`, `travel-logbook-tab.tsx:172-235`) that duplicates — and must be *replaced by*, not run alongside — the real Phase 4 pipeline. It shows **only the deemed-cost result** (`travel-logbook-tab.tsx:921-959`); there is no actual-cost UI, no expense capture, no cost-method election, despite LOG-05 (side-by-side comparison) being marked complete at the domain layer. Its trip table is a plain `.map()` over an array (`travel-logbook-tab.tsx:737-806`) — no virtualization exists anywhere in the repo (`package.json` has no `react-window`/`react-virtual`/`react-virtuoso`).

2. **The persisted domain model (Phase 2) uses a different trip shape than the UI.** `LogbookTripRecord` (`src/modules/logbook/types.ts:14-27`) captures `businessKm` **directly** (a single required number) plus **optional** per-trip odometer readings — this is the real SARS eLogbook shape and what Phase 4's import pipeline produces. The UI's `Trip` type (`shared.tsx:37-50`) instead requires odometer start/end and a Business/Private/Mixed classifier with a mixed-split percentage, deriving `businessKm`/`privateKm` from that. **There is no field in the domain model for `privateKm`, `tripType`, or `mixedSplit`** — this classification concept cannot round-trip through `service.ts`/`repository.ts` at all. The planner must decide to rebuild trip capture around the real schema (direct business-km entry), not preserve the current classifier UI.

3. **There is no `clientId` anywhere in this UI tree.** `TaxTools()` (`tax-tools.tsx:26`) takes zero props, is rendered from `/individual-tax/tools/page.tsx` with zero props, and `TravelLogbookTab()` takes zero props. But `service.ts`'s real functions (`getLogbookForClientYear`, `getLogbookTravelResult`, `importTripsToLogbook`, etc.) all require a `clientId` + `assessmentYear` to resolve a specific persisted `LogbookRecord`. Success criterion 4 ("real, not stubbed" results) is unreachable until this phase decides how the tab learns which client's logbook it's editing.

Additionally: `repository.ts` imports `node:fs`/`node:path` directly — `service.ts` is **server-only** and cannot be imported into `travel-logbook-tab.tsx` (a `"use client"` component) at all. Every mutation must cross a Server Action or route-handler boundary; the codebase's established convention (used identically in `estimate-wizard.tsx` + `individual-tax/new/page.tsx`, and throughout `estates/`) is inline `"use server"` functions passed down as props, not new API routes.

**Primary recommendation:** Install `@tanstack/react-virtual@^3.14.5` (confirmed React 19 peer-dep support) for both the persisted trip table and the import-preview table. Rebuild trip capture/editing around the real `LogbookTripRecord` shape (drop tripType/mixedSplit/privateKm from the persisted model; if a business/private split UX is wanted, it can stay as an input *helper* that computes `businessKm` before submit, but never as stored/round-tripped state). Add a client + tax-year resolution point at the top of the tools page (a `listClients()`-backed selector, mirroring `estimate-wizard.tsx`'s existing pattern) so the tab has a real `logbookId` to operate against. Wire the entire naive upload path out in favor of `parseImportFile` → `detectSarsElogbookLayout`/manual mapping → `applyColumnMapping` → `buildImportPreview` → `importTripsToLogbook`, exposed through dedicated `"use server"` action functions that call `service.ts` directly and return the updated record/result for client-side state merge (not a full `revalidatePath` round trip, which would be too slow/jarring at 10,000-trip scale for every single edit).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| LOG-06 | UI surface: user can export the logbook in a SARS-acceptable format for audit (CSV and printable summary) | `export.ts` (`exportLogbookToCsv`, `buildLogbookAuditSummary`) is already pure/tested and explicitly documents "the printable HTML/PDF rendering is explicitly Phase 6" (`export.ts:56-57`). A print-page precedent already exists at `src/app/reports/individual-tax/[assessmentId]/print/page.tsx` (async server component, `@page` print CSS) to mirror for a `/reports/logbook/[logbookId]/print` route. Current tab's `exportCSV` (`travel-logbook-tab.tsx:241-255`) is a hand-rolled duplicate that must be replaced by `getLogbookCsv`/`getLogbookAuditSummary`. |
| PERF-02 | Trip tables (logbook AND import preview) are virtualized | No virtualization library installed. `@tanstack/react-virtual@3.14.5` confirmed React-19-compatible via npm peerDependencies (`^19.0.0`). Both the persisted trip table (`travel-logbook-tab.tsx:722-843`) and the import-preview table (`travel-logbook-tab.tsx:451-513`, to be rebuilt against `ImportPreviewResult.rows`, up to `MAX_IMPORT_ROWS = 50_000`) need it. |
| PERF-03 | Logbook with 10,000+ trips stays responsive for scroll/edit/filter | Requires: (a) virtualized render (bounded DOM nodes regardless of dataset size), (b) `useMemo`'d filter/stat derivations (already the established Phase-5 pattern — `tripStats`, `filteredTrips`, `monthlyData` at `travel-logbook-tab.tsx:139-151, 257-269, 272-286` are already memoized "to pre-empt a per-keystroke O(n) recompute before Phase 6 virtualization work begins" per STATE.md), (c) single-trip edits must not trigger a full-array-clone re-render of all 10,000 rows — needs a keyed/indexed update path, not `trips.map(...)` on every keystroke. |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `@tanstack/react-virtual` | `^3.14.5` | Virtualizes the persisted trip table and the import-preview table | Headless (no imposed markup/CSS), so it drops into the *existing* hand-rolled `<table>`/Tailwind structure with a scroll-container wrapper rather than forcing a rewrite to a different component model. Confirmed peer-dependency support for React `^19.0.0` (fetched directly from the npm-published `package.json`, HIGH confidence). Actively maintained (published days before this research). |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@tanstack/react-virtual` | `react-virtuoso@4.18.10` | Richer batteries-included API (sticky headers, dynamic heights, groups) but imposes its own list/table component model — a bigger structural rewrite of the existing hand-rolled `<table>` than headless TanStack Virtual needs. Reasonable if the planner wants less custom virtualization glue code; MEDIUM confidence on its React 19 peer-dep declaration specifically (WebSearch found the version but not an explicit peer-dep confirmation — verify before committing if chosen). |
| `@tanstack/react-virtual` | `react-window@2.2.7` | v2 line requires React ^18+ (React-19-compatible per its own changelog), smaller bundle, but community consensus (multiple 2026 sources cross-referenced) describes it as mature/stable but no longer actively developed, and fixed-size-row-only in its common usage — a real constraint here since import-preview rows may wrap (long "reason" text) and the "Purpose" truncation in the current UI (`travel-logbook-tab.tsx:781`) suggests variable content is already a concern. |

**Installation:**
```bash
npm install @tanstack/react-virtual
```

### Supporting (no new installs needed — already present)

| Library | Version | Purpose | Note |
|---------|---------|---------|------|
| `papaparse` | `^5.5.4` | CSV parsing, already worker-backed (`worker: true` in `parse-csv.ts:61`) | No UI work needed here — just call `parseImportFile`. |
| `xlsx` (SheetJS, CDN tarball) | `0.20.3` | XLSX parsing via dedicated `xlsx.worker.ts`, confirmed working under Turbopack+webpack (Phase 4 spike) | Same — call `parseImportFile`, don't touch. |
| `zod` | `^4.1.8` | Trip validation (`tripInputSchema`) reused unchanged by the import preview | Already the single source of truth per-row; don't re-validate in the UI layer. |
| React `useTransition`/Server Actions | React 19.2.3 / Next 16.1.6 built-in | Commit-step mutation boundary | No existing precedent for *directly invoking* a Server Action from a client component in this codebase (grep found zero `useTransition`/`startTransition` usage) — every existing Server Action is wired through `<form action={...}>` on a server-component page (`estimate-wizard.tsx`, all of `estates/[estateId]/*`). This phase would be the first to call one directly for a non-form bulk payload (an array of parsed trips); flagged as new pattern, not "don't hand-roll" — it's standard React/Next.js, just new to this repo. |

## Architecture Patterns

### Recommended Project Structure

```
src/
├── modules/logbook/
│   ├── service.ts                    # UNCHANGED — server-only, already has every function this phase needs
│   ├── import/                       # UNCHANGED — pure pipeline, already tested
│   └── actions.ts                    # NEW — "use server" wrappers around service.ts for client-invoked mutations
├── app/(protected)/individual-tax/tools/
│   └── page.tsx                      # MODIFIED — becomes async; resolves clientId (query param or selector), server-fetches initial LogbookRecord via getLogbookForClientYear + getLogbookTravelResult, passes as props
├── app/reports/logbook/[logbookId]/print/
│   └── page.tsx                      # NEW — mirrors reports/individual-tax/[assessmentId]/print pattern; renders buildLogbookAuditSummary data
├── components/individual-tax/tax-tools/
│   ├── travel-logbook-tab.tsx        # REWRITTEN — real LogbookTripRecord shape, real deemed+actual display, cost-method election, virtualized table
│   ├── logbook-import-wizard.tsx     # NEW — file select → parse → detect/map → preview → commit, replacing uploadStep 0/1/2 inline blocks
│   └── shared.tsx                    # MODIFIED — Trip type replaced/aligned with LogbookTripRecord; UploadData may be replaced by ParsedImportData
```

### Pattern 1: Headless virtualization over an existing `<table>`

**What:** Wrap the existing `<tbody>` rows in `useVirtualizer`'s `getVirtualItems()` loop; the scroll container becomes a fixed-height `div` with `overflow-y: auto`, and each virtual row is absolutely positioned via `transform: translateY(...)`.
**When to use:** Both the main trip table (`travel-logbook-tab.tsx:722-843`) and the import-preview table (currently `max-h-96 overflow-auto`, `travel-logbook-tab.tsx:451`).
**Example (TanStack Virtual v3 API shape, from official docs — HIGH confidence for the API surface, adapt to this repo's `<table>` markup):**
```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: filteredTrips.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 40, // row height in px, tune to actual row
  overscan: 10,
});

// render: <div ref={parentRef} style={{ height: 480, overflow: "auto" }}>
//   <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
//     {virtualizer.getVirtualItems().map((vRow) => (
//       <TripRow key={filteredTrips[vRow.index].id}
//                style={{ position: "absolute", top: 0, transform: `translateY(${vRow.start}px)` }}
//                trip={filteredTrips[vRow.index]} />
//     ))}
//   </div>
// </div>
```
**Known React 19 caveat (MEDIUM confidence, from GitHub issue search):** the React Compiler can over-aggressively memoize `virtualizer.getVirtualItems()` in some setups, causing it to return a frozen `0`-length result. Workaround reported in the wild: hold the virtualizer instance in a `useRef` rather than relying purely on the hook's own memoization. Also: React 19's `flushSync` batching can print a console warning during scroll — passing `useFlushSync: false` to `useVirtualizer` silences it without a behavior change. Both should be spot-checked once wired up, not assumed away.

### Pattern 2: Real persistence via Server Actions returning updated state (not `revalidatePath`)

**What:** Each mutation (`addTripToLogbook`, `updateLogbookTrip`, `deleteLogbookTrip`, `importTripsToLogbook`, `setLogbookCostMethod`, `setLogbookActualExpenses`) gets a thin `"use server"` wrapper in a new `src/modules/logbook/actions.ts` (or colocated under the tools route) that parses/authorizes, calls the real `service.ts` function, and **returns the updated `LogbookRecord`/`LogbookTravelResult` directly** to the caller.
**When to use:** Every mutation from `travel-logbook-tab.tsx` and the import wizard.
**Why not the existing `<form action>` + `revalidatePath` convention used elsewhere (`estates/*`, `individual-tax/new`):** those pages are single-record CRUD forms where a full-page-data reload is cheap and expected. At 10,000+ trips, `revalidatePath` + a full server round-trip re-render for every single-trip edit conflicts directly with PERF-03. Calling the Server Action as a plain async function from a `"use client"` component (a supported Next.js pattern, not exercised elsewhere in this repo — verify current Next 16 behavior isn't confusingly different from training-era knowledge before relying on it) and merging the returned record into local state (or via `useOptimistic`) keeps the interaction paint-fast without inventing a new caching layer.
**Anti-pattern to avoid:** Do NOT have the client re-derive `deemedCostDeduction`/`actualCostDeduction` itself from raw trips — `buildTravelResult`/`calculateDeemedCost`/`calculateActualCost` (`calculation.ts`) are the single source of truth and must run server-side after every mutation, with the result returned to the client. Re-implementing the per-km rate math client-side to "feel faster" would silently reintroduce Pitfall 1 (a second, divergent calculation path) that Phase 2/3 explicitly guarded against.

### Pattern 3: Client/year resolution before anything else renders

**What:** The tools page (or a wrapper around `TravelLogbookTab`) must resolve a `clientId` + `assessmentYear` before it can call `getLogbookForClientYear`. `assessmentYear` already exists in `RulePackContext` (`rulepack-context.tsx:16-42`, currently defaults to 2026) — reuse it rather than adding a second year selector.
**Recommended approach:** Add a client selector at the top of the tools page/shell, backed by `listClients()` (`@/modules/clients/client-service.ts:133`) exactly as `individual-tax/new/page.tsx:19` already does. Default to the demo seed client (`client_001`, which has a pre-existing 2026 logbook per `demo-data.ts:763-793` and STATE.md's note about ambiguous clientId+year lookups against that seed) when no client is explicitly chosen, or show an explicit "no logbook yet — create one" empty state that calls `createLogbookForClient`.
**Anti-pattern to avoid:** Silently defaulting to a hardcoded client without a visible selector — this would make the "real, not stubbed" success criterion technically true but practically undiscoverable/untestable by a user with more than one client.

### Pattern 4: Wizard as an in-place multi-step block, not a modal library

**What:** Neither a modal/dialog nor a stepper primitive exists in `src/components/ui/` (only `card.tsx`, `data-table.tsx`, `status-badge.tsx` — confirmed via glob). The two existing multi-step UIs in this codebase (`estimate-wizard.tsx`, `estate-create-wizard.tsx`) are both hand-rolled: a `useState<number>` step index, an array of step labels, and conditional rendering of the current step's fields — no dependency, no abstraction layer.
**When to use:** The import wizard's 5 steps (file select → parse → detect/map → preview → commit). The current tab's `uploadStep` 0/1/2 state (`travel-logbook-tab.tsx:47, 380-529`) is the direct ancestor of this pattern already in this exact file — extend it to 5 real steps wired to the Phase 4 functions instead of the naive parser, rather than introducing a new UI abstraction.
**Modal chrome precedent:** The trip-form modal (`travel-logbook-tab.tsx:532-696`, `fixed inset-0 z-50 ... bg-black/50 backdrop-blur-sm`, click-outside-to-close) is the only existing modal pattern in this codebase — reuse this exact chrome for the wizard if a modal (rather than inline stepper) presentation is chosen.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| CSV/XLSX parsing, delimiter/date normalization | A second parser in the UI layer | `parseImportFile` (`src/modules/logbook/import/import-file.ts:72`) | Already handles both formats, worker-backed, DoS-guarded (10MB/50k rows), fully unit-tested. The current tab's `handleFile`/`processImport` (`travel-logbook-tab.tsx:173-227`) is exactly the thing to delete. |
| SARS eLogbook column detection | Header-name heuristics in the wizard | `detectSarsElogbookLayout` (`detect-elogbook.ts:48`) | Already encodes the verified official column aliases and refuses to guess on ambiguity — reimplementing risks silently drifting from the verified signature. |
| Odometer continuity / reversed-trip checks | Client-side sanity checks before commit | `validateOdometerContinuity` (`validation.ts:130`), already run inside both `buildImportPreview` and every `service.ts` mutator | Phase 2 explicitly built this once so Phase 4/6 never re-implement it (STATE.md Pitfall-2 gate). A UI-side re-check would be a second, potentially divergent, source of truth. |
| Deemed/actual cost math | Any per-km rate formula in a component | `buildTravelResult`/`calculateDeemedCost`/`calculateActualCost` (`calculation.ts`) | This is Pitfall 1 territory — a UI-side shortcut here is the single highest-severity defect class in this domain per STATE.md. |
| Trip-table performance ("just don't re-render") | Manual `React.memo`/`shouldComponentUpdate` gymnastics on every row | `@tanstack/react-virtual`'s bounded visible-row rendering | Virtualization solves the DOM-node-count problem structurally; memoization alone doesn't bound initial mount cost at 10,000 rows. |

**Key insight:** every non-UI piece of this phase already exists, tested, and is documented as "the entry point Phase 6's import wizard calls" (`import-file.ts:68`) or "the LOG-05 surface" (`service.ts:365`) in its own doc comments. The actual net-new code this phase should produce is UI wiring, the client/year resolution point, the Server Action boundary, and virtualization — not new business logic.

## Common Pitfalls

### Pitfall 1: Silently keeping the old Trip-classification UX instead of confronting the schema mismatch
**What goes wrong:** A planner tempted to "just add persistence under the existing UI" will hit a wall: `privateKm`/`tripType`/`mixedSplit` have no home in `LogbookTripRecord`, `tripInputSchema`, or `validateOdometerContinuity`. Trying to preserve them means inventing a shadow field that isn't real SARS data and isn't validated.
**Why it happens:** The Phase-5 extraction explicitly deferred this ("a pure relocation... not wiring in the Phase 4 import pipeline or Phase 2/3 logbook domain module" — STATE.md Phase 05 decisions), so the mismatch was invisible until this phase.
**How to avoid:** Rebuild the trip form/table around `businessKm` (direct entry) + optional `odometerStart`/`odometerEnd`, matching `tripInputSchema` (`validation.ts:33-42`) exactly. If a "how much of this trip was business" helper UX is still wanted, compute `businessKm` as a derived *input aid* only, never as separate persisted state.
**Warning signs:** Any new code that tries to pass `tripType`/`privateKm`/`mixedSplit` into `addTripToLogbook`/`importTripsToLogbook` will fail Zod validation (`tripInputSchema` doesn't accept those keys) — that failure is a useful canary, not a bug to work around.

### Pitfall 2: Treating `revalidatePath` + full refetch as "the" mutation pattern at this scale
**What goes wrong:** Copying the `estates`/`individual-tax/new` Server Action pattern verbatim (form submit → `revalidatePath` → full server re-render) for a single-trip edit inside a 10,000-row table causes a full round trip and re-render for every keystroke-adjacent save, directly undermining PERF-03.
**Why it happens:** It's the only Server-Action precedent in the codebase, so it's the path of least resistance to copy.
**How to avoid:** Return the updated record/result directly from the action; merge client-side. Reserve `revalidatePath`/redirect for whole-page navigations (e.g., after creating a brand-new logbook), not per-trip edits.

### Pitfall 3: Re-running `buildTravelResult` client-side after import/edit "for responsiveness"
**What goes wrong:** Reimplementing the deemed/actual math in the browser to avoid an extra round trip reintroduces a second calculation path that can drift from `calculation.ts` (e.g., a rulepack update or a bug fix applied only server-side).
**How to avoid:** The mutation Server Action is the one place that recomputes `LogbookTravelResult` via `getLogbookTravelResult`/`computeTravelResult`, returned alongside the updated record.

### Pitfall 4: Assuming jsdom/vitest can prove PERF-02/PERF-03 by measuring real scroll performance
**What goes wrong:** Attempting to assert actual frame timing or scroll-jank numbers in a vitest+jsdom suite — jsdom has no layout/paint engine, so FPS/frame-time numbers are meaningless there.
**Testable proxies that DO work in this stack (established precedent, both already used in this repo):**
- **Bounded DOM node count regardless of dataset size:** render the virtualized table with e.g. 10,000 trips and assert `container.querySelectorAll("tr").length` (or similar) stays roughly constant (bounded by viewport height / overscan), not proportional to input size. This directly proves virtualization is active, which is the actual PERF-02 requirement.
- **Time-budget assertions over pure logic**, exactly like Phase 4's own precedent: `import-pipeline.integration.test.ts:164-195` builds 10,000 candidate rows and asserts `Date.now()`-measured elapsed time `toBeLessThan(10_000)` for `buildImportPreview`, with an explicit comment that this is a "logic-side" throughput proxy, not a UI-responsiveness proof. Apply the same pattern to recompute/filter operations over a 10k-trip in-memory array.
- **React Profiler render-count assertions**, exactly like the Phase 5 precedent at `render-isolation.test.tsx:352-387`: wrap the trip table (or a single row) in `<Profiler onRender={...}>` and assert that editing/adding one trip does not trigger an `onRender` call for sibling components (or, for the virtualized case, that only the visible row range re-renders) — this is the testable proxy for "edit stays responsive" (PERF-03).
**Recommendation:** Combine all three — DOM-node-count-bounded (virtualization proof), Profiler render-count (isolation proof), and a `Date.now()`-based time budget (throughput proof) — since no single one fully covers "responsive at 10,000+ trips."

### Pitfall 5: Building a new API route when a Server Action already fits
**What goes wrong:** Given `import-file.ts`'s doc comment ("the single entry point Phase 6's import wizard calls"), it's tempting to expose it via a new `/api/logbook/import` route handler for symmetry with other REST-ish endpoints in the app. But `parseImportFile` runs client-side (Web Worker) by design — only the final `importTripsToLogbook` commit needs a server boundary, and that's better served by a Server Action consistent with every other mutation in this codebase (no API routes were found backing `estates`/`individual-tax` mutations — grep found zero non-`"use server"` mutation routes for these modules).
**How to avoid:** Keep parsing entirely client-side (already the Phase 4 design); only the commit call crosses to the server.

## Code Examples

### Import pipeline call sequence (verified against source, not assumed)
```typescript
// Source: src/modules/logbook/import/{import-file,detect-elogbook,column-mapping,validate-import}.ts
import { parseImportFile } from "@/modules/logbook/import/import-file";
import { detectSarsElogbookLayout } from "@/modules/logbook/import/detect-elogbook";
import { applyColumnMapping } from "@/modules/logbook/import/column-mapping";
import { buildImportPreview } from "@/modules/logbook/import/validate-import";

const parsed = await parseImportFile(file);              // { headers, rows, errors }
const detected = detectSarsElogbookLayout(parsed.headers); // ColumnMapping suggestion or null — ALWAYS require user confirmation, never auto-commit
const mapping = detected?.mapping ?? userSuppliedMapping;  // fall back to manual mapping UI
const candidates = applyColumnMapping(parsed.rows, mapping); // RawTripCandidate[]
const preview = buildImportPreview(candidates, {
  openingOdometer: logbook.openingOdometer,
  closingOdometer: logbook.closingOdometer,
  existingTrips: logbook.trips, // OdometerContinuityTripInput shape — same shape as LogbookTripRecord already
});
// preview.rows / validCount / invalidCount / continuityErrors / continuityWarnings drive the preview step UI
// On commit: only preview.rows.filter(r => r.status === "valid").map(r => r.trip) gets passed to the server action
```

### Commit Server Action shape (pattern to follow, not existing code)
```typescript
// Source: pattern synthesized from src/modules/logbook/service.ts's importTripsToLogbook signature
// and the existing "use server" convention in src/app/(protected)/individual-tax/new/page.tsx:24-33
"use server";
import { importTripsToLogbook, getLogbookTravelResult } from "@/modules/logbook/service";

export async function commitLogbookImportAction(
  logbookId: string,
  validTrips: unknown[], // already filtered to status === "valid" by the client preview step
  source: "CSV" | "XLSX",
) {
  const record = await importTripsToLogbook(logbookId, validTrips, source);
  const travelResult = await getLogbookTravelResult(logbookId);
  return { record, travelResult }; // returned directly for client-side state merge — no revalidatePath round trip
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| Manual `FileReader` + `.split(",")` CSV parsing in the component | `parseImportFile` (worker-backed, both CSV/XLSX, DoS-guarded) | Built in Phase 4, never wired into the UI | Phase 6 must delete `handleFile`/`processImport` (`travel-logbook-tab.tsx:172-235`) entirely, not layer the new pipeline alongside it. |
| Deemed-cost-only display | `LogbookTravelResult` with both `deemedCostDeduction` and `actualCostDeduction`, a `recommendedMethod`, and `warnings` | Built in Phase 2, never surfaced in the UI | Phase 6 must add actual-expense capture fields and a cost-method election control that didn't exist before. |
| Ephemeral local-state trips | Persisted `LogbookRecord` per client+year via `logbookRepository` (demo-mode: JSON file under `.storage/`, ephemeral on Vercel serverless per project constraint; production: Prisma) | Built in Phase 2 | Phase 6 must add the missing `clientId` resolution point before this can be reached at all. |

**Deprecated/outdated:**
- The `UploadData`/`colMap` types and `Trip.tripType`/`mixedSplit`/`privateKm` fields in `shared.tsx` (`shared.tsx:37-56`) are the pre-Phase-4/pre-Phase-2-integration shape and should not be extended further — replace, don't patch.

## Open Questions

1. **How does the tools page/tab learn which client + logbook it's operating on?**
   - What we know: `assessmentYear` already flows through `RulePackContext`; `clientId` flows through nowhere in this route. `listClients()` exists and is already used identically in `estimate-wizard.tsx`'s launch page.
   - What's unclear: Whether the planner should add a client selector directly to the tools page (affects the *entire* `TaxTools` shell, all 8 tabs, since `TaxTools()`/`TaxToolsInner()` currently take no props) or scope the change to just the travel tab (e.g., a client picker rendered only inside `TravelLogbookTab`, independent of the other calculators which remain client-agnostic sandboxes).
   - Recommendation: Scope it to the travel tab only — the other 7 calculators (medical, retirement, CGT, provisional, rental, home office, dashboard) are genuinely client-agnostic "what-if" sandboxes per their current design, and widening `TaxTools`'s prop surface risks scope creep into calculators this phase doesn't touch. A client selector local to `TravelLogbookTab` (or a thin wrapper around it) keeps the blast radius contained.

2. **Should the whole `/individual-tax/tools/page.tsx` become `async` to server-fetch the initial logbook, or should the client tab fetch on mount via a "read" Server Action?**
   - What we know: Every other data-bearing page in this codebase (`individual-tax/[assessmentId]/page.tsx`, the print page) is an `async` server component that fetches via `service.ts` and passes props down — this is the dominant convention.
   - What's unclear: Whether making `tools/page.tsx` async conflicts with it hosting 7 *other* client-agnostic calculator tabs that have no server data dependency (it can still be async and simply not block on unrelated tabs — Next.js allows this) — worth a quick spike rather than assuming either way.
   - Recommendation: Make it async, fetch only the travel tab's initial data server-side (guarded by the resolved clientId being present), pass as props into `TravelLogbookTab`; leave the other 6 tabs untouched.

3. **Exact virtualized row height / dynamic height handling for the trip table's "Purpose"/"reason" column**, which currently truncates (`max-w-[160px] truncate`, `travel-logbook-tab.tsx:781`) — if truncation is kept, fixed-height virtualization is trivial; if wrapping is wanted instead, `@tanstack/react-virtual`'s dynamic-measurement mode (`measureElement`) is needed, which is more code. Recommendation: keep truncation (already the existing UX), use fixed `estimateSize`, defer dynamic height to a future phase — not required by any of the three success criteria.

4. **Confidence on `@tanstack/react-virtual`'s React 19 + React Compiler interaction** is MEDIUM, not HIGH: the peer-dependency declaration is HIGH confidence (fetched directly from the published `package.json`), but the specific `getVirtualItems()`-returns-frozen-`0` compiler interaction is a single GitHub issue, not independently cross-verified. Recommendation: the planner should budget a small spike/smoke-test task (analogous to Phase 4's worker-bundling spike) before committing fully, and note `useFlushSync: false` as a known tuning knob.

## Sources

### Primary (HIGH confidence)
- `src/components/individual-tax/tax-tools/travel-logbook-tab.tsx` (read in full, 964 lines) — current UI state, naive upload, deemed-only display, plain-map table
- `src/components/individual-tax/tax-tools/shared.tsx`, `tax-tools.tsx`, `rulepack-context.tsx`, `summary-context.tsx` — Trip type, TabKey, provider wiring, zero-clientId confirmation
- `src/modules/logbook/{types,service,calculation,validation,repository,export}.ts` — persisted domain model, real deemed/actual calc, continuity checks, demo-mode JSON-file repository confirming `node:fs` server-only boundary
- `src/modules/logbook/import/{types,import-file,detect-elogbook,column-mapping,parse-csv,validate-import}.ts` — full pipeline entry points and data shapes
- `src/app/(protected)/individual-tax/{tools/page.tsx,new/page.tsx,[assessmentId]/page.tsx}`, `src/app/reports/individual-tax/[assessmentId]/print/page.tsx` — routing/props/Server-Action/print-page conventions
- `src/components/individual-tax/{estimate-wizard.tsx}`, `src/components/estates/estate-create-wizard.tsx` — existing hand-rolled wizard pattern precedent
- `src/components/individual-tax/tax-tools/render-isolation.test.tsx` (lines 340-430) — existing Profiler-based render-isolation test precedent
- `src/modules/logbook/import/import-pipeline.integration.test.ts` (lines 164-195) — existing 10,000-row time-budget test precedent
- `package.json` — confirmed no virtualization library installed; confirmed dependency versions (React 19.2.3, Next 16.1.6, Vitest 4.0.0, Testing Library 16.3.0)
- `unpkg.com/@tanstack/react-virtual/package.json` (fetched directly) — version `3.14.5`, `peerDependencies: { react: "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0" }`
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md` — requirement text, Phase 1-5 decisions and Phase-5-deferred-to-Phase-6 notes

### Secondary (MEDIUM confidence)
- WebSearch: react-virtuoso latest version (4.18.10) and general React-19 ecosystem lag in peer-dep declarations — version number not independently re-verified against npm directly (only TanStack Virtual was)
- WebSearch: react-window 2.2.7, "requires React 18+" per its own changelog (community-reported, not fetched directly from the changelog file)
- WebSearch: TanStack Virtual + React 19 Compiler `getVirtualItems()` zero-length bug and `useFlushSync: false` workaround — single GitHub issue reference, not cross-verified against a second source

### Tertiary (LOW confidence)
- None flagged beyond what's noted inline in Open Questions.

## Metadata

**Confidence breakdown:**
- Standard stack (virtualization library choice): MEDIUM-HIGH — the recommended library's React 19 support is HIGH confidence (fetched package.json directly); the *comparative* ecosystem claims (downloads, "no longer actively developed" for react-window) are WebSearch-sourced and not independently re-verified.
- Architecture (gap map: local-state vs persisted, missing clientId, schema mismatch, Server Action boundary): HIGH — every claim here is a direct source-code read, not inference.
- Pitfalls: HIGH for the codebase-specific ones (schema mismatch, revalidatePath-at-scale, testable-proxy precedents all cite exact file/line); MEDIUM for the React-19-compiler virtualization caveat (single source).

**Research date:** 2026-07-04
**Valid until:** ~30 days for the architecture/codebase findings (stable unless another phase touches these files first); ~14 days for the virtualization library version/compatibility claims (fast-moving ecosystem, React 19 peer-dep support is still actively being backfilled across libraries as of this research).
