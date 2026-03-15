# ITR12 Phase 2a Design (2026 Assessment Year)

Date: 2026-03-06

## Objective
Deliver the first tax-form specific engine module for ITR12 with professional workflow controls and calculation scaffolds. This phase targets the 2026 assessment year baseline and is intentionally scaffold-first (review-required, no automated legal certainty claims).

## Scope
- ITR12 case workspace and lifecycle states.
- Core calculation scaffolds:
  - taxable income summary
  - PAYE credits
  - provisional payments
  - medical credits
  - retirement contribution cap checks
  - estimated liability/refund
- Source, assumptions, and review-required metadata on each output block.
- Repository interface abstraction to allow immediate demo adapter and later Prisma adapter swap.

## Non-Scope
- Final legal-rule automation for every ITR12 field.
- SARS API integration.
- Full document assembly and filing submission automation.

## Workflow Design
State machine (ITR12-specific):
- `INTAKE`
- `DATA_COLLECTION`
- `WORKING_PAPERS_PREP`
- `CALCULATION_DRAFT`
- `REVIEW_REQUIRED`
- `REVIEW_IN_PROGRESS`
- `READY_FOR_SUBMISSION`
- `SUBMITTED`
- `POST_SUBMISSION`

Rules:
- Every transition captures actor, timestamp, and summary.
- Direct jump to `READY_FOR_SUBMISSION` blocked unless `REVIEW_REQUIRED` passed.
- `REVIEW_REQUIRED` is mandatory before any filing-ready status.

## Calculation Scaffold Design
A calculation run is composed of line items with:
- `lineCode`
- `label`
- `amount`
- `working`
- `assumptions`
- `sourceReference`
- `reviewRequired`

Scaffold outputs are marked:
- `calculationStatus = DRAFT`
- `reviewRequired = true`
- `legalDisclaimer = required`

2026 baseline period:
- Assessment year label: `2026`
- Period: `2025-03-01` to `2026-02-28`

## Architecture
New module:
- `src/modules/itr12/types.ts`
- `src/modules/itr12/repository.ts`
- `src/modules/itr12/workflow-service.ts`
- `src/modules/itr12/calculation-service.ts`
- `src/modules/itr12/validation.ts`

Adapters:
- `DemoITR12Repository` for current UI operation.
- Future Prisma adapter in next phase with no UI contract changes.

## Data Model Extensions
Add placeholders to Prisma for phase continuity:
- `ITR12Profile`
- `ITR12Workpaper`
- `ITR12CalculationRun`
- `ITR12CalculationLineItem`
- `ITR12Assumption`
- `ITR12ReviewChecklist`

## UX Design
New routes:
- `/itr12` list view of ITR12 cases
- `/itr12/[caseId]` workflow summary + review state
- `/itr12/[caseId]/workpapers` schedules and assumptions
- `/itr12/[caseId]/calculation` line-item scaffold outputs

## Compliance Guardrails
- All tax outputs include: source placeholders + assumptions + review state.
- All outputs explicitly marked as draft and subject to professional review.
- No automated final advice claims.

## Testing Strategy
- Unit tests for workflow transition constraints.
- Unit tests for calculation scaffold formulas and summary totals.
- Unit tests for ITR12 input schema validation.
- Build/lint verification before completion claims.
