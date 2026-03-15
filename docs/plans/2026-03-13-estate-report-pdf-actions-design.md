# Estate Report PDF Actions Design

## Goal

Add direct PDF download, open, and print actions to the valuation, CGT on death, and liquidation and distribution tabs, and fix filing-pack generation so it produces a real downloadable bundle instead of returning inert JSON.

## Current Problems

- The valuation tab shows the report preview but has no direct PDF action surface.
- The filing-pack route only renders some artifacts to PDF. `SARS_CGT_DEATH` and `MASTER_LD_ACCOUNT` are mapped, but they have no PDF renderer, so open/print flows fail.
- The liquidation tab manages entries and distributions but does not expose a generated Master liquidation and distribution PDF.
- `Generate Filing Pack` returns metadata rather than a downloadable package, so the user gets no practical download result.

## Chosen Approach

Use one shared report-generation path for estate artifacts and expose it in two ways:

- direct report action bars on the relevant workspace tabs
- a real downloadable ZIP bundle for the full filing pack

This keeps one source of truth for artifact generation and avoids separate, drifting implementations for tab reports and filing-pack artifacts.

## API Design

- Extend the filing-pack route with:
  - `artifactCode` for single-artifact generation
  - `renderFormat` to allow PDF generation even when the year-pack native format is Word
  - `download=1` for binary file responses
  - `bundle=zip` for full filing-pack ZIP responses
- Keep JSON metadata responses for client-side open/print workflows, because the desktop bridge needs a local file path.
- Add ZIP generation for the entire filing pack using the generated artifacts plus the manifest.

## Report Coverage

- `BUSINESS_VALUATION_REPORT`
  - keep Word as authoritative filing-pack output
  - add PDF generation for direct workspace actions
- `SARS_CGT_DEATH`
  - add a proper PDF report renderer for the CGT schedule
- `MASTER_LD_ACCOUNT`
  - add a proper PDF report renderer for liquidation and distribution output

## UI Design

- Valuation tab:
  - show `Download PDF`, `Open PDF`, `Print PDF`
- CGT on Death tab:
  - show `Download PDF`, `Open PDF`, `Print PDF`
- Liquidation and Distribution tab:
  - show `Download PDF`, `Open PDF`, `Print PDF`
- Filing Pack tab:
  - replace the current inert full-pack link with a client action that generates and downloads a ZIP bundle
  - keep the per-artifact actions already added

## Desktop Design

- Extend the Electron bridge with a save-as action so generated local files can be copied to a user-selected location.
- Reuse the existing open and print bridge actions for PDFs and Word files.
- Use the same save flow for:
  - single-report PDF download
  - full filing-pack ZIP download

## Data Changes

- Expand Master liquidation and distribution mapping so the report has liquidation entries and beneficiary distributions, not only summary counts.
- Reuse current CGT payload mapping, which already includes asset results and summary totals.

## Testing

- Route coverage for:
  - valuation PDF binary download
  - CGT PDF generation
  - Master L&D PDF generation
  - filing-pack ZIP download
- Component coverage for direct PDF action bars on valuation, CGT, and liquidation tabs
- Desktop bridge coverage for save-as actions

## Non-Goals

- No redesign of the core valuation Word report in this slice
- No new tax logic in CGT or liquidation calculations
- No cloud upload or remote share flow
