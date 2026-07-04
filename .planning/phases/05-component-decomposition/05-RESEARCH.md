# Phase 5: Component Decomposition - Research

**Researched:** 2026-07-04
**Domain:** React 19 / Next.js 16 client-component decomposition — splitting a 2,156-line stateful monolith into independently-rendering pieces without changing behavior
**Confidence:** HIGH (codebase facts, direct file reads) / MEDIUM (React 19 Context/Profiler API details, verified via official docs but not Context7)

## Summary

`src/components/individual-tax/tax-tools.tsx` is 2,156 lines, one `"use client"` function component (`TaxTools`) rendering 8 tab-switched sections (Dashboard, Travel Logbook, Medical Credits, Retirement, CGT, Provisional Tax, Rental Income, Home Office). Phase 1 (plan 01-03) already did the rates work: every calculator sources numbers from `getIndividualTaxRulePackByYear(assessmentYear)` — there are zero hardcoded SARS constants left. That plan explicitly deferred two things to this phase: (1) splitting the component, (2) redirecting the local `calcTax`/`getMarginalRate`/`getDeemedRate` helpers to a shared module instead of keeping them file-local. This phase is a pure architecture refactor — no calculator math changes (that's Phase 7's job).

The actual re-render culprit is **not** a single shared `useState` object (there isn't one). It's structural: all 8 tabs' state (`med`, `ret`, `cgt`, `prov`, `rent`, `ho`, plus travel/logbook state: `trips`, `tripForm`, `uploadData`, etc.) lives in **one component function**, and all 6 non-trivial calculators' derived results (`calcMedical()`, `calcRetire()`, `calcCGT()`, `calcProv()`, `calcRental()`, `calcHO()`) plus the travel/logbook aggregates (`tripStats`, `monthlyData`, `filteredTrips`) are computed **unconditionally on every render**, regardless of which tab is visible. Typing one character in any input re-runs the entire 2,156-line function body — every calculator's math, plus a `trips.reduce()` and a 12-bucket `monthlyData` map over the full trips array. That last part is the sharpest edge: Phase 4 just shipped 10,000+ row CSV/XLSX import (IMP-04), so once a logbook of that size is loaded, typing in the *unrelated* CGT calculator will re-run an O(n) reduce and an O(12n) map over 10,000 trips on every keystroke. Decomposition directly prevents this because Phase 6 (virtualized trip tables, PERF-02/03) explicitly depends on Phase 5 landing first.

**Primary recommendation:** Extract each of the 8 tabs into its own component file with colocated `useState`, wrap the tree in a `RulePackContext` provider (exposing `{ assessmentYear, setAssessmentYear, rulePack }`) that replaces the current closure-based access to `rulePack`, and switch tab visibility from conditional-mount (`{tab === "x" && <X/>}`) to always-mounted + CSS-hidden (`hidden` attribute) so in-progress input in one tab is not lost when the user switches to another tab (this is real, tested-for-granted current behavior since all state lives in the one never-unmounting parent). Prove render isolation in vitest/testing-library using React's built-in `<Profiler onRender>` wrapped around each calculator in the *test file only* — no production code instrumentation needed.

## Phase Requirements

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| PERF-01 | `tax-tools.tsx` is decomposed into per-calculator components with colocated state — typing in one calculator does not re-render the others | Architecture Patterns (component boundary map, RulePackContext, always-mounted+CSS-hide tabs); Common Pitfalls (tab-switch state loss, Dashboard cross-dependency, trips-array O(n) recompute); Code Examples (Profiler-based render-isolation test, React 19 Context syntax) |
</phase_requirements>

## The Monolith: What's Actually There

**File:** `src/components/individual-tax/tax-tools.tsx`, 2,156 lines, single `export function TaxTools()`.

### Module-level (outside the component, lines 1-163)
- Imports: `useState/useEffect/useRef/useCallback`, `getIndividualTaxRulePackByYear`, `IndividualTaxRulePack`/`SupportedAssessmentYear` types.
- Pure helpers (already rulepack-parameterized by Phase 1): `calcTax(rulePack, taxable)`, `getMarginalRate(rulePack, taxable)`, `getDeemedRate(rulePack, v)`.
- Format helpers: `fmt`, `fmtKm`, `pct`, `MONTHS` array.
- Types: `TabKey` (the 8 tab keys), `Trip` interface, `UploadData` interface.
- Presentational components: `StatCard`, `ResultCard`, `Highlight`, `Field` — all stateless, prop-driven, trivial. `inputCls`/`selectCls` Tailwind class strings.

**Finding:** `getBracketTax` in `src/modules/individual-tax/calculation-service.ts` (line 62, currently unexported/private) is line-for-line identical logic to `calcTax` here (`bracket.baseTax + (taxableIncome - bracket.min + 1) * bracket.rate`). Two independent copies of the same formula exist today. Phase 1's summary flagged this exact consolidation as deferred to Phase 5.

### The 8 tabs (= "the 8 calculators")
Matches the `NAV` array (line ~645) exactly:

| Tab key | Label | Own `useState`? | Notes |
|---|---|---|---|
| `dashboard` | Dashboard | **No** | Pure aggregator — reads `travelDeduction`, `medResult.total`, `retResult.headroom`, `rentalResult.net`, `hoResult.annual` computed by the other 6 calculators. Has no inputs of its own. |
| `travel` | Travel Logbook | Yes — `trips`, `tripForm`, `editId`, `filterMonth`, `vehicleValue`, `vehicleName`, `uploadData`, `colMap`, `importTrips`, `uploadStep`, `fileRef` (10 separate state slots) | Also owns the file-upload CSV parsing (`handleFile`, naive `FileReader` + comma-split — **not** the Phase 4 import pipeline; that's wired up in Phase 6, not here), trip CRUD, deemed-cost calc (`sRate`/`deemedFixed`/`deemedFuel`/`deemedMaint`/`deemedTotal`/`travelDeduction`). Owns the only `toast`/`notify` call sites in the whole file. |
| `medical` | Medical Credits | Yes — `med` object (6 fields) | s6A now rulepack-sourced; s6B multipliers (0.333/0.25/0.075/3x) are hardcoded formula constants, explicitly out of scope (Phase 7 CALC-01) — do not touch. |
| `retirement` | Retirement | Yes — `ret` object (5 fields) | Uses `rulePack.retirement.{deductiblePercentageLimit,annualCap}` + `getMarginalRate`. |
| `cgt` | Capital Gains | Yes — `cgt` object (7 fields) | Uses `rulePack.cgt.{annualExclusion,deathExclusion,inclusionRate,primaryResidenceExclusion}` + `getMarginalRate`. |
| `provisional` | Provisional Tax | Yes — `prov` object (6 fields) | Uses `calcTax`, `rulePack.rebates.primary`, `rulePack.provisionalTax.*`. Contains the Phase-1-corrected safe-harbour branch orientation — do not re-invert. |
| `rental` | Rental Income | Yes — `rent` object (16 fields) | No rulepack dependency at all — pure arithmetic sum over a fixed expense-key list. Simplest extraction candidate. |
| `homeoffice` | Home Office | Yes — `ho` object (9 fields) | No rulepack dependency either. Simplest extraction candidate alongside Rental. |

Plus shell-level state that doesn't belong to any one tab: `tab` (`TabKey`, controls which section renders), `assessmentYear`/`rulePack` (global, drives every calculator), `toast` (only actually used by `travel`).

### The re-render mechanism (verified by reading, not assumed)
There is **no single shared `useState` object** — `med`, `ret`, `cgt`, `prov`, `rent`, `ho` are six independent `useState` calls, already reasonably scoped. The freeze is caused by:
1. All of the above state, plus `calcMedical()`, `calcRetire()`, `calcCGT()`, `calcProv()`, `calcRental()`, `calcHO()`, plus `tripStats` (a `trips.reduce`) and `monthlyData` (a 12-element map, each doing a `trips.filter` + two `reduce`s), execute **every render of `TaxTools`**, unconditionally, regardless of `tab`. Only the *JSX* is gated by `tab === "x" && (...)` — the calculations backing every tab, including inactive ones, are not.
2. Because it's all one function component, any `setState` call anywhere inside it (typing a character into a `rent.grossRent` input, for example) re-invokes the *entire* 2,156-line function body, re-running all 6 calculators' math and the trips aggregation, before React even gets to diffing the returned tree.
3. At current data volumes this is invisible. At Phase-4-scale data (10,000+ imported trips, IMP-04) it will not be: every keystroke in *any* calculator re-walks the full trips array twice (once for `tripStats`, 12 times more for `monthlyData`). This is the concrete mechanism behind "the shared-state re-render freeze" the phase goal describes, and it's precisely why Phase 6 (trip-table virtualization, PERF-02/03) is declared dependent on Phase 5 landing first.

### Shared vs. duplicated values (success criterion 3)
Post-Phase-1, there is nothing left to "de-duplicate" at the rate-table level — `rulePack` is already the single source for every rate. What's missing is a **sharing mechanism**: today `rulePack` is just a `const` in `TaxTools`'s function scope, available to every calculator only because they're all textually inside the same function. Once split into separate components, each one needs an explicit way to reach `rulePack`/`assessmentYear` — a React Context is the natural mechanism and is exactly what criterion 3 asks for ("read... from rulepack-derived context").

## Prior Work (Phase 1, plan 01-03)

Read in full: `.planning/phases/01-rulepack-extension/01-03-SUMMARY.md` and `01-03-PLAN.md`.

- Added the tax-year `<select>` (2025/2026/2027, default 2026) at line ~693, right next to tab navigation. **This UI element and its `assessmentYear` state must be preserved** — Phase 5 relocates it into whatever shell/context wrapper replaces `TaxTools`, it doesn't redesign it.
- Deleted the entire hardcoded-constants block and rewired every calculator to `rulePack.*`.
- Deliberately kept `calcTax`/`getMarginalRate`/`getDeemedRate` as module-level pure functions parameterized by `rulePack` (not redirected into `calculation-service.ts`) — explicitly flagged this refactor as Phase 5's job.
- Deliberately did **not** touch component structure — explicitly flagged full decomposition as Phase 5's job.
- Fixed a real bug in passing (inverted provisional safe-harbour branches) — Phase 5 must not regress this; the corrected orientation (0.90 at/below R1m, 0.80 above) must survive extraction verbatim.
- Left s6B medical multipliers and the `payment < safeHarbour * 0.8` risk-band heuristic untouched — both are explicitly Phase 7 scope, not Phase 5.

**Net effect for this phase:** the data-sourcing is already correct. Phase 5 is scoped purely to *where the code lives and how it's split*, not to *what it computes*. "Behavior must be preserved exactly" is a strict, literal constraint — this is a refactor, not a rewrite.

## Architecture Patterns

### Recommended component structure
```
src/components/individual-tax/
  tax-tools.tsx                     # thin shell: tab state, RulePackProvider, renders nav + 8 children
  tax-tools/
    rulepack-context.tsx            # RulePackContext + RulePackProvider + useRulePack() hook
    shared.tsx                      # StatCard, ResultCard, Highlight, Field, inputCls/selectCls, fmt/fmtKm/pct, MONTHS
    calc-helpers.ts                 # calcTax, getMarginalRate, getDeemedRate (or import from calculation-service.ts — see Open Questions)
    dashboard-tab.tsx
    travel-logbook-tab.tsx          # largest: trips CRUD + CSV upload + deemed-cost calc + toast/notify (moves here, no longer shell-level)
    medical-tab.tsx
    retirement-tab.tsx
    cgt-tab.tsx
    provisional-tax-tab.tsx
    rental-tab.tsx
    home-office-tab.tsx
```
No existing precedent for this subfolder-per-feature pattern in `src/components/` (the repo's other component dirs — `estates/`, `reports/` — are flatter), so this is a new structural choice for the planner to make explicit, not something to infer from an established convention. Note also: `src/components/logbook/` does not exist yet — the Phase 2/3/4 logbook domain module has no dedicated UI yet. Phase 6 ("Logbook UI, Import Wizard...") is where the *real* logbook UI gets built and wired to the new domain module. **Do not** try to integrate the new logbook module into the extracted `travel-logbook-tab.tsx` in this phase — extract the existing (CSV-upload, in-memory `Trip[]`) behavior as-is; Phase 6 depends on Phase 5 and will replace this tab's internals afterward.

### Pattern 1: RulePackContext replaces closure-based rulePack access
**What:** A context provider at the shell level holding `{ assessmentYear, setAssessmentYear, rulePack }`, consumed by every calculator via a `useRulePack()` hook instead of relying on JS closures over a shared function scope.
**When to use:** Any calculator that reads `rulePack.*` (all except Rental and Home Office, which have no rulepack dependency at all and don't need to consume this context).
**Example (React 19 syntax — Context can be rendered directly, `.Provider` is no longer required):**
```tsx
// tax-tools/rulepack-context.tsx
"use client";
import { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import { getIndividualTaxRulePackByYear } from "@/modules/individual-tax/rulepack-registry";
import type { IndividualTaxRulePack, SupportedAssessmentYear } from "@/modules/individual-tax/types";

interface RulePackContextValue {
  assessmentYear: SupportedAssessmentYear;
  setAssessmentYear: (year: SupportedAssessmentYear) => void;
  rulePack: IndividualTaxRulePack;
}

const RulePackContext = createContext<RulePackContextValue | null>(null);

export function RulePackProvider({ children }: { children: ReactNode }) {
  const [assessmentYear, setAssessmentYear] = useState<SupportedAssessmentYear>(2026);
  const rulePack = useMemo(() => getIndividualTaxRulePackByYear(assessmentYear), [assessmentYear]);
  const value = useMemo(() => ({ assessmentYear, setAssessmentYear, rulePack }), [assessmentYear, rulePack]);
  // React 19: <RulePackContext value={value}> works directly, no .Provider needed.
  // (Context.Provider still works and is fine to use for broader compatibility/lint-rule familiarity.)
  return <RulePackContext value={value}>{children}</RulePackContext>;
}

export function useRulePack() {
  const ctx = useContext(RulePackContext);
  if (!ctx) throw new Error("useRulePack must be used within RulePackProvider");
  return ctx;
}
```
Source: [React 19 Context-as-provider](https://react.dev/reference/react/createContext), confirmed by community writeups ([mostlyfocused.com](https://mostlyfocused.com/pages/articles/react_context), [Medium: React 19 Context as a Provider](https://medium.com/@ogundipe.eniola/react-19-context-as-a-provider-and-other-updates-eb6ff3b18c52)). `Context.Provider` remains supported (scheduled for eventual deprecation with a codemod), so using the classic `<RulePackContext.Provider value={value}>` form is equally valid if the team prefers the more familiar/lint-friendly syntax.

**Why this doesn't reintroduce the freeze:** `assessmentYear` only changes when the user picks a different year from the `<select>` — a rare, deliberate action, not a per-keystroke one. Changing it legitimately should re-render every consumer (that's the whole point of a shared tax year), and that's fine because it's infrequent. Typing inside a calculator's *own* local `useState` never touches this context, so it never triggers a context re-render — only the one component whose own state changed re-renders.

### Pattern 2: Always-mounted, CSS-hidden tabs (preserves cross-tab input persistence)
**What:** Today, switching tabs does **not** lose in-progress input, because all state lives in the one parent that never unmounts — only the JSX (`{tab === "x" && (...)}`) is conditionally rendered, the state backing it is not. If the decomposition naively does `{tab === "medical" && <MedicalTab/>}`, switching away from Medical unmounts it, destroying its local `useState` — a real behavior regression the phase brief requires avoiding ("behavior must be preserved exactly").
**When to use:** For all 8 tab components, in the shell.
**Example:**
```tsx
// tax-tools.tsx (shell)
<div className={tab === "medical" ? "" : "hidden"}>
  <MedicalTab />
</div>
<div className={tab === "retirement" ? "" : "hidden"}>
  <RetirementTab />
</div>
{/* ...one per tab, all always mounted */}
```
This is the standard React pattern for "tabs that don't reset on switch" (CSS-only visibility toggle rather than conditional mounting) and requires no new dependency. Cost: all 8 tabs mount up front (cheap — these are simple forms) and hidden tabs stay in the DOM with `display:none`. This is a strict improvement over risking data loss, and it's a natural regression test to write: fill in one tab, switch away, switch back, assert the value survived.

**Interaction with render isolation:** a hidden-but-mounted sibling still re-renders if *its own* state changes, and does **not** re-render just because a visible sibling's state changes (React only re-renders the subtree whose state actually changed, plus any context consumers of a context value that changed) — visibility via CSS class has no bearing on this. So this pattern is compatible with, not in tension with, criterion 2.

### Pattern 3: Isolating the Dashboard's cross-calculator dependency
**What:** Dashboard is the one tab with no inputs of its own — it only *reads* `travelDeduction`, `medResult.total`, `retResult.headroom`, `rentalResult.net`, `hoResult.annual`, which today are computed by the other calculators in the same render pass. Once those calculators are split into independent components with locally-computed results, Dashboard has no direct way to see them.
**Options (recommend deciding this before extracting any calculator, since it affects every extraction's shape):**
1. **Small pub/sub "summary" context**, separate from `RulePackContext`. Each calculator, after computing its own result, calls a stable setter (e.g., `useEffect(() => setSummary(prev => ({...prev, medical: medResult.total})), [medResult.total])`) into a `TaxToolsSummaryContext` that only `Dashboard` reads. Because the setter reference is stable and calculators don't *read* from this context, writing to it doesn't cause the writing calculator (or its siblings) to re-render — only `Dashboard` (the sole reader) does. This preserves criterion 2 for the 7 input-bearing calculators while keeping Dashboard's aggregate view live.
2. **Dashboard shows stale/last-visited-tab data only** (simplest, but a real behavior change — current Dashboard is always live regardless of which tab was last open — likely not acceptable given "behavior must be preserved exactly").
3. **Keep Dashboard's aggregation logic duplicated in the shell** (shell re-runs cheap summary-only calculations independently) — avoids a new context but risks the exact duplication-of-truth problem decomposition is meant to eliminate, and still requires the shell to hold copies of `med`, `ret`, etc., which is the anti-pattern being removed.

Option 1 is the closest fit to both success criteria simultaneously and is flagged as an **Open Question** below for the planner to lock in, because it's a real design decision, not a mechanical extraction.

### Pattern 4: Proving render isolation in vitest (no React DevTools needed)
**What:** React's built-in `<Profiler>` component (`import { Profiler } from "react"`) fires an `onRender(id, phase, ...)` callback on every commit of the subtree it wraps. `phase` is `"mount"`, `"update"`, or `"nested-update"`. This works in jsdom (this repo's configured vitest environment) with no extra dependency, and needs zero changes to production code — the test wraps rendered output in `<Profiler>`, not the component itself.
**When to use:** The render-isolation test(s) proving PERF-01's success criterion 2.
**Example:**
```tsx
import { Profiler } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaxTools } from "@/components/individual-tax/tax-tools";

it("typing in Medical does not re-render Retirement", async () => {
  const user = userEvent.setup();
  const medicalRenders = vi.fn();
  const retirementRenders = vi.fn();

  // Wrap TaxTools's own tree isn't directly possible without editing it, so instead
  // render each extracted tab standalone under its own Profiler, OR (if testing the
  // composed shell) wrap the two tabs of interest at the point they're rendered by
  // instrumenting via a test-only render helper that mounts <MedicalTab/> and
  // <RetirementTab/> together under a shared <RulePackProvider>, each in its own
  // <Profiler id="..." onRender={...}>.
  render(
    <RulePackProvider>
      <Profiler id="medical" onRender={medicalRenders}><MedicalTab /></Profiler>
      <Profiler id="retirement" onRender={retirementRenders}><RetirementTab /></Profiler>
    </RulePackProvider>,
  );

  medicalRenders.mockClear();
  retirementRenders.mockClear();

  await user.type(screen.getByLabelText(/monthly medical aid contribution/i), "500");

  expect(medicalRenders).toHaveBeenCalled();       // Medical re-rendered (expected — its own state changed)
  expect(retirementRenders).not.toHaveBeenCalled(); // Retirement did NOT re-render
});
```
Source: [React docs — `<Profiler>`](https://react.dev/reference/react/Profiler) (`onRender` fires per commit; a component whose subtree does not re-render never fires it, which is exactly the negative assertion needed here). Corroborated by community patterns for wrapping `render()` output in `Profiler` for exactly this kind of commit-tracking in tests ([gist: Profiling react in tests](https://gist.github.com/mfrachet/c50f7f4bd2031a3191e965f898d3bc34)).

**Practical note for the planner:** this test is easiest to write *after* each tab is a standalone exported component (rather than trying to reach into the still-monolithic `TaxTools` and assert on internal renders) — so the natural place for this proof is a new `tax-tools/render-isolation.test.tsx` written once at least two calculators have been extracted, extended as more are split out, rather than a Wave-0 test that has nothing to import yet.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progressive tax bracket lookup (`baseTax + (taxable - min + 1) * rate`) | A second/third copy of the same formula in each extracted file | Extract `calcTax`/`getMarginalRate`/`getDeemedRate` into one shared module (`tax-tools/calc-helpers.ts`) imported by every calculator that needs them — or go further and export `getBracketTax` from `calculation-service.ts` and have `calcTax` call it, closing the duplication Phase 1 flagged | Two independently-maintained copies of the same SARS bracket formula is exactly the kind of drift Phase 1/RULE-03 was trying to eliminate at the data level; don't reintroduce it at the code level while decomposing |
| Cross-component "did the other component change" render tracking | A custom render-counter hook baked into production components | React's built-in `<Profiler>` in the *test* file only | Zero production code cost, official API, already proven pattern above |
| Tab-content show/hide with state preservation | A custom mini-router or manual DOM-detach/reattach trick | Plain CSS class toggle (`hidden` / `display:none`) on an always-mounted wrapper `div` | This is the standard, dependency-free way to do "tabs that don't reset on switch" in React; no library needed |

**Key insight:** everything this phase needs is already in React 19 + existing repo conventions (Tailwind `hidden` class is already used elsewhere in this file, e.g. the file input at line 668-674). No new npm dependency is required for this phase.

## Common Pitfalls

### Pitfall 1: Naive conditional-mount decomposition loses in-progress input on tab switch
**What goes wrong:** Extracting each tab as `{tab === "x" && <XTab/>}` looks like the obvious refactor, but since each `XTab` now owns its own `useState`, unmounting it (by switching tabs) destroys that state. A user who fills in the Retirement calculator, checks something in CGT, and comes back to Retirement would find it reset.
**Why it happens:** Today's monolith accidentally gets "state survives tab switch" for free because nothing ever unmounts — only JSX visibility toggles. Decomposing into components with "colocated local state" (as criterion 1 literally asks for) breaks this unless mount lifecycle is handled deliberately.
**How to avoid:** Always-mount + CSS-hide (Pattern 2 above), not conditional JSX truthy-rendering.
**Warning signs:** Any plan/task that writes `{tab === "..." && <Component/>}` for the new per-tab components.

### Pitfall 2: Publishing calculator results to a shared context the calculators themselves also read
**What goes wrong:** If Dashboard's summary context is combined with (or read by) the calculators — e.g., a single `TaxToolsContext` that holds both `rulePack` and the cross-calculator summary — then any calculator's result changing (i.e., typing) updates a context value that *other calculators also subscribe to*, re-rendering all of them and silently reintroducing the freeze this phase exists to remove.
**Why it happens:** It's tempting to fold "shared state" into one context object for simplicity.
**How to avoid:** Keep `RulePackContext` (read by all, changes rarely) and any Dashboard summary mechanism (written by calculators, read only by Dashboard) as two separate contexts, or ensure calculators only ever call the summary context's *setter* (which doesn't subscribe them to re-renders) and never its *value*.
**Warning signs:** A single `TaxToolsContext.Provider` wrapping both `rulePack` and per-calculator result fields.

### Pitfall 3: Forgetting the trips-array computations are today unconditional
**What goes wrong:** If `travel-logbook-tab.tsx` is extracted but `tripStats`/`monthlyData` are left computed inline on every render without `useMemo`, the extraction still isolates it from *other* tabs (real win), but doesn't address the fact that at 10,000+ trips, the Travel tab itself will still recompute on every keystroke *within that tab* (e.g., typing the vehicle value). This is somewhat out of strict PERF-01 scope (criterion 2 is about cross-calculator isolation, not intra-calculator memoization) but is worth flagging since Phase 6 (virtualization) assumes Phase 5 didn't leave this pathological.
**Why it happens:** Extraction focuses on component boundaries, not on memoizing expensive derived values within a boundary.
**How to avoid:** At minimum, note this as a candidate for `useMemo` in the Travel tab extraction; a hard requirement isn't necessary for PERF-01 itself but is cheap to add while the code is already being touched, and directly benefits Phase 6.

### Pitfall 4: Re-inverting the provisional tax safe-harbour branches during extraction
**What goes wrong:** Phase 1 fixed an inverted safe-harbour comparison (`safeHarbourActualPctAboveThreshold` vs `...BelowThreshold`, lines ~472-475 of the current file). A mechanical copy-paste during extraction that "cleans up" or reorders the ternary risks flipping it back.
**Why it happens:** The corrected code is a subtle one-line semantic fix, easy to miss when moving code between files.
**How to avoid:** Copy the provisional tax block verbatim into `provisional-tax-tab.tsx`; verify with the same spot-check Phase 1 used (2026 threshold R1m, 0.90 at/below, 0.80 above) as part of this phase's own verification, not just trusting the diff looks similar.

### Pitfall 5: Moving `toast`/`notify` to the shell "for safety" when it belongs to one tab
**What goes wrong:** `toast` state and `notify()` are currently declared at `TaxTools` top level but are **only ever called from Travel Logbook code** (`saveTrip`, `processImport`, `finaliseImport`, `handleFile`). Leaving them in a shared shell/context "just in case another tab needs them later" reintroduces shared state with no current justification, and risks a shell-level re-render on every toast (rare, but pointless) that any accidentally-added future consumer could turn into a real cross-tab re-render source.
**How to avoid:** Move `toast`/`notify` into `travel-logbook-tab.tsx` as fully local state, confirmed via grep (`notify\(` matches only appear inside the six travel/logbook functions in the current file).

## Migration Order

Behavior must be preserved exactly and the phase is architecturally independent (no upstream dependency to wait on), so an incremental, always-green approach is lower risk than a big-bang rewrite:

1. **Scaffold first, behavior-neutral:** create the `tax-tools/` folder; move `StatCard`/`ResultCard`/`Highlight`/`Field`/`inputCls`/`selectCls`/`fmt`/`fmtKm`/`pct`/`MONTHS`/`Trip`/`UploadData` types into `shared.tsx`, re-exported/imported by the still-monolithic `tax-tools.tsx`. Verify `npx tsc --noEmit && npm run test && npm run build` after this step alone — zero behavior change, pure file move.
2. **Introduce `RulePackProvider`/`useRulePack()`** and decide the Dashboard summary-sharing mechanism (Pattern 3) *before* extracting any calculator — this shape affects every subsequent extraction, so deciding it late means redoing earlier extractions.
3. **Extract calculators in increasing order of coupling risk:** Home Office and Rental first (no rulepack dependency, no cross-tab reads — lowest risk, good pattern-proving step), then CGT, Retirement, Medical, Provisional (each needs `useRulePack()` but nothing else), then Travel Logbook (largest, owns `toast`, file upload, and feeds Dashboard), then Dashboard last (needs the summary mechanism from every other tab already wired up).
4. **After each single-calculator extraction:** run `npm run test && npm run build`, and manually spot-check that tab's outputs against the same known-good numbers Phase 1 used (or the calculator's own current on-screen values before/after) — this is a refactor, so "identical output" is the acceptance bar per-step, not just at the end.
5. **Switch tab rendering to always-mounted + CSS-hidden** as part of step 3 (each extraction should immediately move its tab wrapper to the `hidden`-class pattern rather than doing this as one big-bang change at the end) — this keeps the fill-in/switch/switch-back regression check meaningful throughout, rather than only at the very end.
6. **Render-isolation tests** (Pattern 4) can be added incrementally too — write the isolation test for the first two extracted calculators, then extend it as more come online, rather than deferring all proof to the end.

This order lets the test suite stay green after every single task, matches this repo's established plan-per-task/commit-per-task GSD convention (seen in every prior phase's SUMMARY.md), and avoids a large multi-file diff that's hard to bisect if something regresses.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `<Context.Provider value={...}>` | `<Context value={...}>` (Context itself usable as the provider) | React 19 (this repo is on React 19.2.3) | Less boilerplate; `.Provider` still works today and isn't removed yet — either form is fine for this phase, but new code in a React-19-only codebase should prefer the shorter form where the team is comfortable with it |

**Not deprecated, still current:** `<Profiler onRender>` — unchanged, stable API since React 16, still the documented way to observe commit-level render behavior. `useContext` remains valid alongside the newer `use()` hook (React 19 also added `use()` for reading context/promises, including inside conditionals — not required for this phase since standard `useContext` inside a small custom hook is sufficient and matches the codebase's current hook style, e.g. `useCallback` usage already present in this file).

## Open Questions

1. **How should Dashboard's cross-calculator summary be wired?**
   - What we know: Dashboard has no inputs, reads 5 derived values from 6 other calculators, and today gets them "for free" because everything shares one render scope.
   - What's unclear: Whether a separate pub/sub "summary" context (Pattern 3, option 1) is worth the added complexity versus accepting that Dashboard re-rendering when *any* calculator's summary changes is fine (it's cheap, read-only, and arguably not "another calculator" for the purposes of criterion 2's intent).
   - Recommendation: Treat Dashboard as an explicit, documented exception to criterion 2 (it may legitimately re-render when any calculator's total changes — that's its entire purpose) and use the lightweight write-only-context approach so the 7 *input-bearing* calculators remain strictly isolated from each other. Confirm this reading of "does not trigger a re-render of any other calculator" (does "other calculator" include the input-less Dashboard tile?) explicitly in the plan rather than leaving it implicit.

2. **Should `calcTax`/`getMarginalRate` be consolidated with `calculation-service.ts`'s private `getBracketTax`, or just relocated as-is?**
   - What we know: The formulas are identical; `getBracketTax` is currently unexported and used only by `calculateIndividualTax2026`/near-eFiling estimate flow, a different call path from tax-tools' quick calculators.
   - What's unclear: Whether cross-module consolidation (exporting `getBracketTax` and having tax-tools import it) is in-scope for a phase whose stated goal is component decomposition, not code-sharing across modules — versus just relocating the existing tax-tools-local copy into `tax-tools/calc-helpers.ts` unchanged (lower risk, satisfies "behavior preserved exactly" with the least surface area touched).
   - Recommendation: Default to relocation-only (keep tax-tools' own copy, moved not merged) unless the planner judges the dedup worth the small cross-module coupling risk — this is a nice-to-have, not required by any of the 3 success criteria.

3. **Does `assessmentYear`/`rulePack` belong in the same context as `tab`, or should `tab` stay local to the shell?**
   - What we know: `tab` only needs to be read by the shell (to decide which wrapper gets the `hidden` class) and by the nav buttons — no calculator's internal logic reads `tab`.
   - What's unclear: None really — this is a low-risk call.
   - Recommendation: Keep `tab` as plain shell-local `useState`, not part of `RulePackContext`. No calculator needs to know which tab is active, and bundling it into the shared context would mean every tab-click re-renders every context consumer for no reason (harmless today given tab clicks are rare, but unnecessary coupling).

## Validation Architecture

Skipped — `.planning/config.json`'s `workflow` object contains only `research`, `plan_check`, and `verifier` keys; there is no `nyquist_validation` key, consistent with every prior phase's RESEARCH.md (01-04) which skipped this section for the identical reason. Standard guidance for this phase: co-located Vitest + `@testing-library/react` tests (matching the existing `estimate-wizard.test.tsx` precedent in the same directory), run via `npm run test` (Vitest 4, jsdom environment per `vitest.config.ts`). The one new pattern this phase needs beyond existing conventions is the `<Profiler>`-wrapped render-isolation test described in Code Examples/Pattern 4 above — that test is the only way to give PERF-01's success criterion 2 an automated, repeatable proof in this stack (no React DevTools access in CI/vitest).

## Sources

### Primary (HIGH confidence)
- Direct reads: `src/components/individual-tax/tax-tools.tsx` (full file, both halves), `src/modules/individual-tax/types.ts`, `src/modules/individual-tax/rulepack-registry.ts`, `src/modules/individual-tax/calculation-service.ts` (relevant sections), `.planning/phases/01-rulepack-extension/01-03-SUMMARY.md`, `01-03-PLAN.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `package.json`, `vitest.config.ts`, `src/components/individual-tax/estimate-wizard.test.tsx`

### Secondary (MEDIUM confidence)
- [React docs — `<Profiler>`](https://react.dev/reference/react/Profiler) — onRender/phase semantics, verified via WebSearch against official react.dev
- [React docs — `createContext`](https://react.dev/reference/react/createContext) — React 19 Context-as-provider syntax
- [mostlyfocused.com — React Context (v19 + TypeScript)](https://mostlyfocused.com/pages/articles/react_context)
- [Medium — React 19: Context as a Provider and Other Updates](https://medium.com/@ogundipe.eniola/react-19-context-as-a-provider-and-other-updates-eb6ff3b18c52)
- [Gist — Profiling react in tests](https://gist.github.com/mfrachet/c50f7f4bd2031a3191e965f898d3bc34) — community pattern for Profiler-wrapped render tracking in tests

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries needed; all versions read directly from `package.json` (React 19.2.3, Next 16.1.6, Vitest ^4.0.0, @testing-library/react ^16.3.0)
- Architecture: HIGH for the codebase-specific facts (component boundaries, state shape, what's shared vs. duplicated) — MEDIUM for the React 19 Context/Profiler API specifics, which are corroborated by official docs plus secondary sources but not independently verified against Context7 (no Context7 MCP tool was available in this session's tool set)
- Pitfalls: HIGH — all five pitfalls are derived from direct reading of the current file's actual behavior (grep-verified `notify()` call sites, direct reading of the safe-harbour branch, direct reading of the always-mounted-today tab structure), not speculation

**Research date:** 2026-07-04
**Valid until:** 30 days (stable React/Next APIs; the codebase facts are only valid until tax-tools.tsx is actually touched by this phase's own plans)
