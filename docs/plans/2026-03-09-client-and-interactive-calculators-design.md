# Client Creation + Interactive Calculator Design

## Goal
Add a production-ready client creation option and make current calculators interactive, with persisted outputs linked to clients/cases.

## Approved Scope
- Add client creation UI and persistence.
- Make `Individual Tax` calculator interactive and save each run as an assessment linked to a selected individual client.
- Make `ITR12` calculator interactive and save each run against its case.

## Architecture Decisions
- Keep business logic in services/modules, not UI.
- Use server actions in protected routes for writes.
- Validate all write payloads with existing Zod schemas.
- Preserve review/disclaimer workflow (`REVIEW_REQUIRED` by default).

## Data + Persistence
- Client create uses existing `Client` model and `clientFormSchema`.
- Individual calculator writes:
  - `IndividualTaxProfile` (linked to `Client`)
  - `IndividualTaxAssessment`
  - `IndividualTaxLineItem`
- ITR12 interactive save writes:
  - `ITR12CalculationRun`
  - `ITR12CalculationLineItem`
  - summary payload includes both summary and input snapshot.

## UX
- Clients list gets `New Client` action.
- New page `/clients/new` with full create form.
- Individual tax gets `/individual-tax/new` calculator form and redirects to existing detail/report format after save.
- ITR12 calculation page gets editable input form + save action; saved run becomes the active displayed calculation.

## Compliance/Controls
- All generated outputs remain flagged `REVIEW_REQUIRED`.
- Existing legal disclaimers remain visible.
- No automatic legal-final advice behavior introduced.

