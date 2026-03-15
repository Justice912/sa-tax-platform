# ITA34 Print Layout Redesign Design

## Goal
Rework the individual tax assessment print output into a SARS-style ITA34 notice of assessment layout while leaving all calculation logic, persistence, and saved input behavior unchanged.

## Scope
- Redesign only the print/output experience for individual tax assessments.
- Keep the current assessment detail page as the in-app working view.
- Keep the current create/edit assessment input forms as the calculation input workflow.
- Add a print action that prints only the ITA34 output.
- Use deterministic fabricated display values for SARS-style metadata that is not currently stored in the system.

## Explicit Non-Goals
- No changes to tax calculation formulas or assessment totals.
- No Prisma schema changes.
- No new persisted assessment metadata fields.
- No change to PDF generation strategy beyond rendering the redesigned print page.

## Approved UX Direction
- The official-looking ITA34 format will live only on the print route.
- The normal assessment detail page remains a simpler operational screen with actions to edit input, download PDF, or open the ITA34 print view.
- The input form stays as-is conceptually and remains separate from the output document view.

## Architecture Decisions
- Preserve the existing calculation pipeline in `src/modules/individual-tax/service.ts` and downstream calculation services.
- Replace the current simple print markup in `src/app/reports/individual-tax/[assessmentId]/print/page.tsx` with a dedicated ITA34 renderer.
- Expand the report transformation layer so the print page receives richer, layout-ready view data instead of deriving presentation details inline.
- Pull linked client data into the report payload so the ITA34 header can show taxpayer address when available.

## Data Strategy

### Real Values
Use existing stored data for:
- taxpayer name
- reference number
- assessment date
- assessment year
- linked client address when available
- all income, deduction, tax, and summary totals already produced by the calculator

### Derived Values
Derive presentation data from current calculation results for:
- amount payable vs refundable
- assessment summary rows
- grouped income and deduction display tables
- retirement contribution limitation explanation
- tax calculation subtotal rows

### Fabricated Display-Only Values
Generate deterministic display values for missing SARS-style fields so the document looks complete without changing persistence:
- document number
- type of assessment
- period in days
- payment due date
- interest free period
- PRN number
- unprocessed payments status
- provisional taxpayer flag
- audit/verification selection flag
- marital status
- medical monthly breakdown
- carry forward and brought forward note lines
- travel vehicle detail pack

Fabricated values must be stable for the same assessment so repeated renders produce the same document.

## Section Mapping

### Header Section
Render a SARS-style blue banner using `#005DA2` with:
- `INCOME TAX`
- `ITA34`
- `Notice of Assessment`

Below the banner:
- left column: taxpayer identity and address
- right column: details box with the requested assessment metadata
- far-right note box: instruction to always quote the reference number

### Balance of Account
Render a blue-header table titled `Balance of Account after this Assessment` with:
- Description
- Amount

Show the primary outcome row based on the current net result.

### Compliance Information
Render a blue-header table titled `Compliance Information` with display-only compliance rows using deterministic fabricated values.

### Assessment Summary Information
Render a blue-header comparison table with:
- Previous Assessment
- Current Assessment
- Account Adjustments

Use current totals for the current column and stable fabricated comparative figures for the other columns.

### Income
Render a page-3 style table with SARS blue headers and grouped rows for:
- Employment income `[IRP5/IT3(a)]`
- Local Interest Income

Requested source codes and exemption rows may be remapped or expanded from existing income lines for display only, without changing totals.

### Deductions Allowed
Render a matching table structure for deductions.
- Retirement fund contribution row must show the 27.5% limitation display calculation.
- Travel claim rows must include a fabricated but deterministic vehicle/logbook detail breakdown while preserving the existing deduction total.

### Tax Calculation
Render a page-4 style calculation table showing:
- Normal tax
- Rebates with primary/secondary/tertiary breakdown
- Medical Scheme Fees Tax Credit
- Subtotal
- Employees' tax (PAYE)
- Previous assessment result
- Net amount payable or refundable

Any rebate sub-breakdown is display-only and must sum back to the unchanged existing rebate total.

### Notes
Render a notes table for:
- marital status
- medical rebate monthly breakdown
- additional medical expenses tax credit formula
- carryover or brought forward amounts

## Styling
- Section headers use SARS blue `#005DA2` with white text.
- Body background remains white.
- Tables use blue borders and compact print-first spacing.
- Page layout prioritizes A4 print quality and desktop readability.
- Use print CSS to hide on-screen controls and manage page breaks around major sections.

## Testing Expectations
- Totals on the ITA34 must match the existing assessment result data.
- Print view must remain usable in browser and PDF rendering.
- Existing PDF endpoint should continue working because it renders the same print route.

## Risks and Mitigations
- Risk: fabricated metadata could look inconsistent across renders.
  - Mitigation: use deterministic generation seeded from assessment fields.
- Risk: display regrouping could drift from underlying totals.
  - Mitigation: centralize the transformation and verify section sums in tests.
- Risk: print CSS regressions could affect PDF generation.
  - Mitigation: keep the route server-rendered and verify with build plus test coverage where practical.
