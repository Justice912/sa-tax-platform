# Deceased Estates Phase 2 Tax Engines Design

## Goal
Add the Phase 2 tax, valuation, and formal filing capabilities to the deceased estates module so one estate workspace can produce a complete multi-year South African estate filing pack with traceable, review-gated calculations and formal SARS/Master outputs.

## Source References
- `C:\Users\HP\Downloads\Deceased_Estate_Module_System_Spec.docx`
- `docs/plans/2026-03-11-deceased-estates-operational-module-design.md`
- `docs/plans/2026-03-11-deceased-estates-operational-module-implementation.md`

## Approved Scope
Phase 2 ships as one integrated release that includes:
- pre-death ITR12 calculation engine
- CGT on death engine
- estate duty engine
- post-death IT-AE engine
- business valuation engine
- formal SARS/Master-ready generated outputs
- default consolidated filing pack generation

The first release must support multiple tax years from day one through database-managed year packs rather than hard-coded annual rules in application code.

## Product Boundary
Phase 1 established the operational estate workspace. Phase 2 does not replace it. Instead, it adds a new estate-tax layer on top of the existing operational case file so staff can move from intake and workflow control into formal tax and filing work without leaving the estate workspace.

This phase remains review-gated. Engine outputs, schedules, and generated documents are never silently treated as final. Every engine run and every filing artifact carries explicit review state, year-pack versioning, and audit history.

## Architecture
Phase 2 should be implemented as a unified estate engine platform rather than six disconnected tools.

The platform has three major layers:

### 1. Estate Year-Pack Configuration
Store all year/version-specific rules, thresholds, rates, allowances, template versions, and field mappings in database-backed year-pack records. This allows staff and future administrators to add new years without shipping a new application release for every update.

### 2. Estate Engine Run Framework
Create a shared engine-run model that all Phase 2 calculators use. Each engine run stores:
- estate reference
- engine type
- selected year pack
- structured inputs
- structured outputs
- warnings and assumptions
- approval/review state
- upstream dependency references
- audit timestamps and actor trail

### 3. Formal Output and Filing-Pack Layer
Treat document generation as a downstream renderer of structured engine outputs, not as the primary source of truth. Every formal SARS/Master output is produced from validated schedules and approved engine runs. The filing pack aggregates those formal outputs plus supporting schedules and a review summary into one deliverable.

## Route Design
The operational estate routes stay in place. Phase 2 adds:
- `/estates/[estateId]/valuation`
- `/estates/[estateId]/tax/pre-death`
- `/estates/[estateId]/tax/cgt`
- `/estates/[estateId]/tax/estate-duty`
- `/estates/[estateId]/tax/post-death`
- `/estates/[estateId]/filing-pack`

These routes should reuse the existing protected app shell, estate navigation patterns, and staff-role permissions established in Phase 1.

## Data Model

### Year-Pack Configuration
Add database-backed year-pack records such as:
- `TaxYearPack`
- `TaxYearPackIncomeTaxBracket`
- `TaxYearPackCgtSetting`
- `TaxYearPackEstateDutySetting`
- `TaxYearPackPostDeathSetting`
- `TaxYearPackValuationSetting`
- `TaxYearPackFormTemplate`
- `TaxYearPackFormFieldMap`

Each year pack must:
- support version labels like `2026 v1`
- track publication/effective metadata
- distinguish draft vs approved configuration
- support reproducible reruns against historic versions

### Estate Engine Runs
Add a shared `EstateEngineRun` root record with engine-specific child records where strong structure matters.

Core fields:
- `estateId`
- `engineType`
- `taxYearPackId`
- `status`
- `reviewRequired`
- `inputsJson`
- `outputsJson`
- `warningsJson`
- `assumptionsJson`
- `approvedAt`
- `approvedBy`
- `createdAt`
- `updatedAt`

Engine-specific child structures should exist for:
- pre-death ITR12 schedules and lines
- CGT deemed-disposal asset lines
- estate-duty deductions and dutiable-estate schedules
- post-death IT-AE income and expense schedules
- business-valuation methods, assumptions, and conclusion ranges
- generated filing artifacts and filing-pack manifests

## Workflow
The user flow remains estate-first.

Recommended sequence:
1. Business valuation, where applicable
2. Pre-death ITR12
3. CGT on death
4. Estate duty
5. Post-death IT-AE
6. Full filing pack generation

Each workspace follows the same pattern:
- source-data summary
- engine input forms
- calculated schedules
- warnings and assumptions
- dependency status
- approval state
- formal output preview/generate controls

## Engine Dependencies
The platform must make dependencies explicit.

Primary dependency flow:
- valuation -> CGT
- CGT + liabilities + deductions -> estate duty
- estate and deceased taxpayer data -> pre-death ITR12
- post-death income and expense data -> IT-AE
- all approved engine runs -> full filing pack

Downstream modules must not silently consume draft or stale upstream results. If a dependency is unapproved or outdated, the UI must surface that state and either block formal generation or clearly mark the result as draft.

## Formal Outputs
Every engine ships with its formal output in the same phase.

Expected deliverables include:
- pre-death ITR12 summary and formal output set
- CGT deemed-disposal schedules
- estate duty output pack including Rev 267-ready material
- post-death IT-AE output pack
- business valuation report pack
- Master-ready estate administration outputs and structured supporting schedules

The default estate deliverable is a single full filing pack that bundles:
- approved engine summaries
- formal SARS/Master outputs
- working schedules
- supporting schedules and assumptions
- review status summary
- filing checklist / readiness cover sheet

## Multi-Year Strategy
Multi-year support is required from day one.

This means:
- no engine may hard-code a single year as its only supported year
- formal document generation must resolve template and field-map versions by year pack
- old runs must remain reproducible after newer years are added
- approval and artifact history must identify exactly which year-pack version was used

## Controls and Error Handling
Phase 2 must treat missing or conflicting data as workflow states, not only form errors.

Examples:
- missing acquisition/base-cost data creates asset-level CGT exceptions
- missing spouse support or section 4 deduction support blocks estate-duty readiness
- missing form templates or field maps blocks formal generation for that year pack
- regenerated filing packs create version history rather than overwriting prior artifacts invisibly

Every significant state change writes audit entries:
- year-pack selection
- engine run save/recalculate
- warnings acknowledged
- approval/rejection
- formal output generation
- filing-pack generation

## Testing Strategy
Testing should be layered:
- unit tests for each engine’s multi-year logic
- integration tests for dependency flow and approval gates
- document-generation tests for formal field mapping
- end-to-end estate-to-filing-pack tests
- golden/reference tests for year-pack reproducibility

## Recommended Build Order
1. Year-pack configuration and shared engine-run foundation
2. Business valuation engine
3. Pre-death ITR12 engine
4. CGT on death engine
5. Estate duty engine
6. Post-death IT-AE engine
7. Formal output generation
8. Filing-pack assembly
9. Full verification and desktop refresh
