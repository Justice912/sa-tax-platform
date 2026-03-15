# Individual Tax Calculator + TaxOps PDF Design

Date: 2026-03-09

## Objective
Implement a production-style individual tax calculator for the 2026 assessment year with TaxOps-branded assessment output in an ITA34-inspired structure and downloadable PDF generation.

## Scope
- Individual tax calculator (2026 baseline scaffold, review-required).
- TaxOps-branded assessment report structure aligned to provided notice format.
- Downloadable PDF generation from print-ready HTML.
- Audit trail event on report generation.

## Format Alignment (from provided notice)
The output layout follows the same section pattern:
1. Header and assessment metadata
2. Balance of account summary
3. Compliance information
4. Assessment summary (previous/current/adjustments style)
5. Income table (code, description, computations, assessed amount)
6. Deductions table
7. Taxable income container
8. Tax calculation table
9. Notes and assumptions

## Branding and Compliance
- TaxOps ZA branded header/footer (not SARS-branded).
- Explicit draft/review state label.
- Mandatory disclaimer:
  - generated output is workflow assistance only
  - professional review and legal verification required before filing

## Architecture
New module: `src/modules/individual-tax/`
- `types.ts`
- `rules-2026.ts`
- `validation.ts`
- `calculation-service.ts`
- `report-transformer.ts`
- `repository.ts`

New routes:
- `/individual-tax` (calculator input/list)
- `/individual-tax/[assessmentId]` (web result)
- `/reports/individual-tax/[assessmentId]/print` (print layout)
- `/api/reports/individual-tax/[assessmentId]/pdf` (PDF generation + download)

## PDF Generation
- Render print route in Playwright and export PDF (A4, print backgrounds).
- Save PDF using existing storage abstraction.
- Return streamed file response for download.

## Data Model Additions
- `IndividualTaxProfile`
- `IndividualTaxAssessment`
- `IndividualTaxLineItem`
- `IndividualTaxNote`
- `IndividualTaxRuleVersion`
- `GeneratedReport`

## Testing Strategy
- Unit: 2026 rules, tax totals, and report row mapping.
- Unit: validation schemas.
- Integration: print-page data contract.
- Build/lint/test verification before phase completion claims.
