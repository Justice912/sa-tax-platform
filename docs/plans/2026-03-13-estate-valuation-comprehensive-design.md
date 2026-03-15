# Estate Valuation Authoritative DOCX Design

**Date:** 2026-03-13

## Goal

Fix the live desktop valuation failure and replace the current lightweight valuation output with an authoritative business-valuation report that is generated as a real `.docx` document based on the attached sample:

- [Valuation_Report_Deceased_Estate_Demo.docx](C:/Users/HP/Downloads/Valuation_Report_Deceased_Estate_Demo.docx)

The in-app valuation view remains, but it becomes a close preview of the `.docx` payload rather than the authoritative report format.

## Root Cause Findings

### 1. Live valuation crash

The latest valuation-page failure in the desktop runtime is not the original calculation validation problem. The current crash path is in:

- [page.tsx](C:/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/src/app/(protected)/estates/[estateId]/valuation/page.tsx)

The page reads `searchParams.error` and calls `decodeURIComponent` on it. Next.js has already decoded the query value, so any `%` in the message causes:

- `URIError: URI malformed`

That page-level error prevents the valuation workspace from rendering the inline validation banner.

### 2. Old report still showing

The desktop runtime restores golden demo engine runs at startup. The restored valuation run in:

- [demo-estate-engine-runs.json](C:/Users/HP/AppData/Roaming/sa-tax-platform/storage/demo-estate-engine-runs.json)

still contains the old legacy valuation report snapshot. That means the app can render the old report even when the current code supports a richer structure.

### 3. Export gap

The filing-pack/report route currently renders only PDF and JSON payloads. There is no authoritative `.docx` generation path yet, so the app cannot currently match the attached Word document exactly.

## Approved Product Direction

The attached Word document is authoritative for valuation reporting. The app should:

1. generate a real `.docx` valuation report that structurally matches the sample
2. use the same canonical valuation payload to drive the in-app preview
3. keep the in-app preview close to the document, but not treat it as the source of truth

## Scope

This change applies to both:

- `COMPANY_SHAREHOLDING`
- `SOLE_PROPRIETORSHIP`

The valuation output must remain usable by downstream estate workflows:

- pre-death ITR12
- CGT on death
- estate duty
- post-death IT-AE
- filing pack

## Approach

### 1. Stabilize the live valuation page

Fix the page-level error path first.

- Stop double-decoding `searchParams.error`
- Keep server-action failures inside the valuation workspace as an inline error
- Preserve redirect-based error roundtrips where appropriate

### 2. Introduce a canonical valuation report model

The engine output should no longer be a short support-pack summary. It should produce a canonical valuation report payload covering the full sample report structure:

1. Executive summary
2. Purpose, scope and mandate
3. Company overview
4. Economic and industry context
5. Historical financial analysis
6. Methodology selection
7. DCF workings
8. Capitalisation of maintainable earnings
9. Adjusted NAV
10. Valuation conclusion and reconciliation
11. Tax implications for the deceased estate
12. Section 9HA rollover considerations
13. Qualifications, disclaimers and representations
14. Appendices, glossary, and signature blocks

This payload becomes the single source for:

- the in-app preview
- the `.docx` report generation
- downstream filing-pack references

### 3. Treat the sample Word file as the authoritative layout

The new export path should produce a `.docx` file whose section ordering, headings, tables, and sign-off structure track the sample closely.

The recommended implementation is template-first:

- create a project-owned valuation report template derived from the approved sample
- populate that template from the canonical report payload
- generate a true Word document with the correct MIME type and storage metadata

If a direct reusable template cannot be maintained cleanly, the fallback is programmatic `.docx` generation that mirrors the sample exactly enough to preserve structure and filing usability.

### 4. Expand valuation inputs so the report can be populated properly

The valuation workspace needs additional structured inputs for the document sections that are currently under-modeled.

Required groups:

- engagement and mandate details
- company particulars
- business description and market context
- historical income statement lines
- ratio lines
- balance sheet summary lines
- DCF assumptions, FCFF schedule, WACC inputs, terminal value inputs
- maintainable earnings normalization lines and selected multiple rationale
- NAV asset and liability revaluation lines with explanation notes
- reconciliation rationale and sensitivity scenarios
- tax cross-check inputs for CGT and estate duty commentary
- disclaimers, appendices, glossary references, and signature captions

### 5. Upgrade demo and legacy compatibility

Two compatibility paths are required:

- legacy valuation runs must still render
- restored golden demo valuation runs must be upgraded so the desktop app shows the new report immediately

For new code:

- if a run has a canonical report payload, use it
- if a run has only legacy data, transform or regenerate a preview from stored inputs/output where possible

For the golden demo bundle:

- replace the legacy valuation run snapshot with a canonical one that reflects the new report model

## Canonical Report Data Model

### Header and mandate

- report title
- confidentiality marker
- estate/deceased details
- subject legal name and registration number
- date of death
- effective valuation date
- report date
- preparer and executor details

### Executive summary

- purpose summary
- concluded fair market value
- methodology comparison table
- weighted average and rounded conclusion

### Company overview

- legal and tax particulars
- operations summary
- shareholding/ownership
- key personnel and succession
- products and market

### Economic and industry context

- macroeconomic conditions
- industry analysis
- key value drivers and risks

### Historical financial analysis

- income statement summary
- financial ratio table
- balance sheet summary
- narrative observations

### Methodology detail

- methodology selection table
- DCF schedules and WACC build-up
- maintainable earnings normalization table
- NAV asset/liability table with explanations

### Conclusion and tax sections

- reconciliation table
- sensitivity analysis table
- CGT calculation summary
- estate duty illustration
- section 9HA notes

### Closing sections

- qualifications/disclaimers
- appendices
- glossary
- signature blocks

## File Impact

Primary files:

- [page.tsx](C:/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/src/app/(protected)/estates/[estateId]/valuation/page.tsx)
- [estate-valuation-workspace.tsx](C:/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/src/components/estates/phase2/estate-valuation-workspace.tsx)
- [valuation-report.tsx](C:/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/src/components/reports/estates/valuation-report.tsx)
- [service.ts](C:/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/src/modules/estates/engines/valuation/service.ts)
- [types.ts](C:/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/src/modules/estates/engines/valuation/types.ts)
- [validation.ts](C:/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/src/modules/estates/engines/valuation/validation.ts)
- [calculation.ts](C:/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/src/modules/estates/engines/valuation/calculation.ts)
- [report-transformer.ts](C:/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/src/modules/estates/engines/valuation/report-transformer.ts)
- [field-mapper.ts](C:/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/src/modules/estates/forms/field-mapper.ts)
- [service.ts](C:/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/src/modules/estates/forms/service.ts)
- [route.ts](C:/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/src/app/api/reports/estates/[estateId]/filing-pack/route.ts)
- [golden-demo-bundle.json](C:/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/desktop/golden-demo-bundle.json)

Likely new files:

- valuation docx generator module
- valuation docx template asset or programmatic builder
- tests for template mapping and export behavior

## Risks

- Exact Word parity is a document-layout problem, not just a data problem. The report generator must be validated against the sample structure, not only by type checks.
- The canonical report payload is significantly broader than the current engine model; calculation output and narrative assembly must remain internally consistent.
- The golden demo restore process can hide code changes behind old stored snapshots unless the restored baseline is upgraded with the new report shape.

## Recommended Execution Order

1. Fix the valuation page crash path
2. Add failing tests for error handling and authoritative export behavior
3. Expand the canonical valuation report payload and calculations
4. Implement `.docx` generation
5. Rebuild the in-app preview from the same payload
6. Upgrade the golden demo bundle and legacy preview behavior
7. Rebuild the desktop runtime and verify against the live app
