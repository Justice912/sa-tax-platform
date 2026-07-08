# Technology Stack — Individual Tax / Logbook Import & Performance Milestone

**Project:** SA Tax Platform — Individual Tax SARS Compliance Milestone
**Researched:** 2026-07-02
**Scope:** Additive libraries only — xlsx import, robust CSV parsing, list virtualization, off-main-thread parsing. Does NOT re-litigate the existing stack (Next.js 16.1.6, React 19.2.3, TypeScript 5.9.3, Tailwind 4, Prisma 6.16.2 — see `.planning/codebase/STACK.md`).

## Recommended Stack

### File Parsing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **SheetJS `xlsx`** (CDN-distributed, NOT npm registry) | **0.20.3** (verify current at install time via https://cdn.sheetjs.com/) | Parse `.xlsx` SARS elogbook template client-side | Only realistic option for reading arbitrary `.xlsx` (including the official SARS elogbook workbook) directly in the browser. Handles multi-sheet workbooks, cell types, dates-as-serials — all present in real-world SARS/Excel logbook exports. HIGH confidence. |
| **PapaParse** | **5.5.4** | Robust CSV parsing: quoted fields, embedded commas/newlines, delimiter auto-detection | Purpose-built for exactly the CSV gaps named in the milestone (`travel-schedule.ts` / `tax-tools.tsx` currently splits naively on commas). Has native Web Worker mode (`worker: true`) and a streaming mode (`step` callback) so 10k+ row CSVs never block the main thread. Auto-detects delimiter (`,` vs `;` — common in SA/EU-locale Excel exports). HIGH confidence. |

### List/Table Virtualization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **react-virtuoso** (`TableVirtuoso` component) | **4.15.x** (verify current; 4.4.0 confirmed on npm at research time, package ships frequent releases — pin to latest 4.x) | Virtualize the trip table (10,000+ rows) | The milestone's data is a genuine `<table>` (columns: date, odometer, business/private, purpose, km), not a generic list. `TableVirtuoso` renders real `<table>/<thead>/<tbody>` DOM (unlike `react-window`, which needs manual `<div>`-as-grid hacks to fake table semantics), supports **variable row heights out of the box** (trip purpose text wraps), and `fixedHeaderContent` for a sticky header — all needed here with zero workarounds. Actively maintained (release history through mid-2026). MEDIUM-HIGH confidence (versions verified on npm registry directly; qualitative comparisons cross-checked across 3+ independent sources). |

### Off-Main-Thread Parsing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Native Web Worker API** (no wrapper library required for the parsing step) | Browser built-in | Run PapaParse/SheetJS parsing off the main thread | PapaParse has first-class built-in worker support (`Papa.parse(file, { worker: true })`) — spins up its own worker internally, no manual `postMessage` plumbing needed for CSV. For XLSX, SheetJS has no built-in worker mode, so wrap the `XLSX.read()` call in a small dedicated worker module. |
| **Comlink** (only if the manual XLSX worker gets non-trivial) | **4.4.2** | Simplify main-thread ↔ worker RPC for the XLSX parse step | Only needed if the hand-rolled `postMessage`/`onmessage` boilerplate for the XLSX worker grows past a handful of messages (e.g., progress events during parse of a huge workbook). Skip it if the XLSX worker is a single request/response round trip — plain `postMessage` is enough and avoids one more dependency. LOW-MEDIUM confidence on necessity (judgment call, not verified against a specific SheetJS+worker tutorial for this exact version). |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| XLSX parsing | SheetJS `xlsx` (CDN build) | **npm-registry `xlsx@0.18.5`** | **Do not use.** Abandoned on npm: last published 4+ years ago, has 2 unpatched high-severity vulnerabilities (ReDoS, prototype pollution). SheetJS stopped publishing to npm over a dispute with npm Inc. and now distributes only via `cdn.sheetjs.com`. Installing the npm version silently locks the project to a vulnerable, stale release. HIGH confidence (confirmed via SheetJS's own migration notice and multiple independent security write-ups). |
| XLSX parsing | SheetJS `xlsx` | **ExcelJS** | ExcelJS is the better choice for *writing* richly formatted Excel (colors, styles, pivot tables) or *streaming* huge files server-side, but for *reading* an arbitrary incoming `.xlsx` template client-side with broad format tolerance (including whatever variant of the SARS elogbook a client hands over — old `.xls`, ODS, oddly-encoded CSV-as-xlsx), SheetJS's format coverage is broader and its browser bundle is the standard choice. Re-evaluate ExcelJS only if a later phase needs to *generate* formatted `.xlsx` exports for practitioners — that's a "when to use" fork, not a replacement. MEDIUM confidence. |
| XLSX parsing | SheetJS `xlsx` | **read-excel-file** (v9.2.0) | Smaller/simpler API, good for basic sheets-to-JSON, but weaker on edge cases (merged cells, multiple sheets, mixed types) that a real-world client-supplied elogbook is likely to have. Fine as a lighter fallback if bundle size becomes a hard constraint, but not the primary pick. LOW-MEDIUM confidence (less scrutinized than the top two). |
| CSV parsing | PapaParse | **Hand-rolled `.split(',')`** (current code) | This is the literal bug named in the milestone — breaks on quoted fields containing commas, embedded newlines in a "purpose" field, and doesn't handle semicolon-delimited exports from SA-locale Excel. Must be replaced, not patched. |
| CSV parsing | PapaParse | **SheetJS for CSV too** | SheetJS *can* parse CSV (`XLSX.read` accepts CSV text) and using one library for both formats is tempting for simplicity. But PapaParse is purpose-built for CSV edge cases (RFC 4180 quoting, delimiter auto-detect, streaming, built-in worker mode) and is lighter weight when only CSV is needed. Use PapaParse for `.csv`, SheetJS for `.xlsx` — don't collapse to one library at the cost of CSV robustness. MEDIUM confidence. |
| Virtualization | react-virtuoso (TableVirtuoso) | **react-window** | Mature and lighter (~1.9M weekly downloads) but effectively unmaintained by its author, supports fixed-size rows well but variable-height rows (wrapped trip purpose/description text) require significant manual measurement code, and it has no native `<table>` semantics — you'd fake a table with styled `<div>` grids, which then needs extra work for accessibility (screen readers, SARS-audit exports relying on table structure). Viable fallback only if bundle size must be minimized above all else. |
| Virtualization | react-virtuoso (TableVirtuoso) | **@tanstack/react-virtual** | Best choice if the team is already committed to the TanStack ecosystem (e.g., adopts TanStack Table for the trip grid) and wants a fully headless, unopinionated primitive. But headless means building scroll container, sizing, and row positioning by hand — more upfront work for equivalent behavior versus TableVirtuoso's batteries-included table renderer. Reasonable alternative if the milestone later adds TanStack Table for column sorting/filtering on the trip grid — then TanStack Virtual integrates natively with it. Flag for phase-specific re-evaluation if sorting/filtering requirements emerge. |
| Virtualization | react-virtuoso | **react-virtualized** (predecessor to react-window) | Deprecated by its own maintainers in favor of react-window; do not adopt for new code. |
| Worker orchestration | Native Worker + PapaParse's built-in worker mode | **Comlink for everything** | Comlink adds value when RPC-style bidirectional calls with return values are needed. PapaParse's `worker: true` option already handles the CSV case without any extra library. Reach for Comlink only for the XLSX worker if it needs richer messaging (progress reporting on huge files); otherwise it's an unnecessary dependency for a single request/response call. |

## Bundle Size Considerations

| Library | Approx. minified+gzip size | Mitigation |
|---------|----------------------------|------------|
| SheetJS `xlsx` full build | ~500KB+ (min+gzip) for `xlsx.full.min.js`; smaller "mini" builds (~150-250KB) exist that drop rarely-needed codecs (e.g., older binary formats) | Use dynamic `import()` so the XLSX parser code only loads when a user actually picks a `.xlsx` file (not bundled into the main tax-tools chunk). Combine with a Next.js dynamic import + Suspense boundary on the import-trigger button. Consider the "mini" SheetJS build if `.xls`/legacy binary format support isn't required (SARS elogbook ships modern `.xlsx`). |
| PapaParse | ~20KB min+gzip | Small enough to include directly; still worth dynamic-importing alongside the XLSX loader so the whole "import trip data" code path is one lazy-loaded chunk, keeping it out of the initial `tax-tools` bundle. |
| react-virtuoso | ~30-40KB min+gzip | One-time cost, used across every large-table view (also useful beyond this milestone — client lists, assessment lists). Not worth lazy-loading; treat as a shared dependency. |
| Comlink (if used) | ~1-2KB min+gzip | Negligible; include only if the XLSX worker needs it. |

**General guidance:** Both parsers (SheetJS, PapaParse) and the worker code should be loaded via `next/dynamic` with `ssr: false` and ideally behind the actual "Import Logbook" user action, not eagerly on page load — this directly serves the "split the 2,148-line monolith" goal by keeping import-related code in its own chunk rather than inflating `tax-tools.tsx`'s bundle further.

## What NOT to Use (and why)

- **`xlsx` from the npm registry (0.18.5)** — abandoned, unpatched high-severity CVEs (ReDoS + prototype pollution). Install exclusively from `https://cdn.sheetjs.com/xlsx-<version>/xlsx-<version>.tgz` per SheetJS's own current guidance. This is the single most important "gotcha" for this milestone — a naive `npm install xlsx` pulls the vulnerable version silently.
- **Manual `.split(',')` / `.split('\n')` CSV parsing** — the exact anti-pattern already causing bugs in this codebase (per PROJECT.md). Breaks on quoted fields, embedded delimiters/newlines, and doesn't auto-detect `;`-delimited exports.
- **`react-virtualized`** — deprecated by its own maintainer team; superseded by `react-window`. Don't adopt for new code even though it still appears in search results and older tutorials.
- **Rendering all 10,000+ rows unvirtualized "with pagination only"** — pagination alone (e.g., 50 rows/page with prev/next) avoids the freeze but breaks the practitioner workflow of scrolling/scanning a full tax-year logbook and re-sorting; the milestone explicitly says "virtualized/paginated," but virtualization (infinite-scroll-style, all rows logically present, only visible ones in the DOM) is the better UX fit for an audit-facing trip table. Use virtualization as the primary mechanism; add pagination only as a secondary/optional view if practitioners specifically ask for printable pages.
- **Parsing XLSX/CSV synchronously on the main thread "because the file is usually small"** — the milestone explicitly requires 10,000+ row imports to stay responsive; synchronous `FileReader` + parse on the main thread is the root cause of the freeze bug being fixed. Always route through a worker or PapaParse's `worker: true` mode.
- **A general-purpose heavy grid library (e.g., ag-grid, react-data-grid) "just in case"** — out of scope for this milestone. The requirement is virtualized rendering of a relatively simple trip table (5-6 columns), not spreadsheet-like editing, pivoting, or Excel-parity features. Adding a full grid engine would be scope creep and a much larger bundle/complexity cost than TableVirtuoso for the stated need.

## Installation

```bash
# CSV parsing (robust, worker-capable)
npm install papaparse@5.5.4
npm install -D @types/papaparse

# XLSX parsing — MUST install from SheetJS CDN, NOT plain `npm install xlsx`
npm install --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
# (verify latest version at https://cdn.sheetjs.com/ before installing —
#  0.20.3 confirmed via docs.sheetjs.com at research time, 2026-07-02)

# Table virtualization
npm install react-virtuoso@^4.4.0

# Optional — only if the XLSX worker's messaging outgrows plain postMessage
npm install comlink@4.4.2
```

Note on lockfile hygiene: because the XLSX package is installed from a tarball URL rather than the registry, confirm `package-lock.json` records the resolved CDN URL + integrity hash correctly, and document the manual-update process (there's no `npm outdated` auto-detection for CDN-sourced packages — version bumps require re-visiting cdn.sheetjs.com/docs.sheetjs.com manually).

## Sources

- https://www.npmjs.com/package/xlsx — confirms npm registry stuck at 0.18.5 (HIGH confidence, official npm page)
- https://cdn.sheetjs.com/xlsx/ and https://docs.sheetjs.com/docs/getting-started/installation/nodejs — official SheetJS migration guidance, current version 0.20.3, install command (HIGH confidence, official docs, fetched live)
- https://git.sheetjs.com/sheetjs/sheetjs/issues/3098 and https://github.com/SheetJS/sheetjs/issues/2667 — official SheetJS issue trackers confirming npm abandonment and CVE status (HIGH confidence)
- https://www.papaparse.com/ and https://www.papaparse.com/docs — official PapaParse docs, worker/streaming API (HIGH confidence)
- npm registry direct queries (`npm view <pkg> version`) for papaparse (5.5.4), @tanstack/react-virtual (3.14.5), react-window (2.2.7), react-virtuoso (4.4.0 seen; check for newer 4.x at implementation time), exceljs (4.18.10), comlink (4.4.2), read-excel-file (9.2.0) — HIGH confidence, direct registry query, 2026-07-02
- https://virtuoso.dev/react-virtuoso/table-virtuoso/basic-table/ and /table-fixed-headers/ — official react-virtuoso docs confirming TableVirtuoso, fixedHeaderContent, real `<table>` semantics (HIGH confidence)
- https://github.com/TanStack/virtual/discussions/459 — maintainer/community discussion comparing TanStack Virtual vs react-window vs react-virtuoso (MEDIUM confidence, community source, cross-checked against multiple independent guides)
- https://www.pkgpulse.com/guides/tanstack-virtual-vs-react-window-vs-react-virtuoso-2026 and https://www.pkgpulse.com/guides/sheetjs-vs-exceljs-vs-node-xlsx-excel-files-node-2026 — third-party 2026-dated comparison guides (MEDIUM confidence, WebSearch-sourced, used only to corroborate points already confirmed via official sources, not as sole evidence)
- https://nextjs.org/docs/app/api-reference/turbopack and https://nextjs.org/blog/next-16-2-turbopack — official Next.js docs confirming Turbopack supports `new Worker()` expressions and webpack-compatible magic comments, with Worker-origin fixes landed in Next.js 16.2 (MEDIUM confidence — confirms general Worker support and a specific 16.2 fix, but did not find an explicit worked example of `new Worker(new URL(...))` + Turbopack for this exact Next.js version; recommend a small spike/smoke test during phase implementation to confirm the exact worker-bundling syntax Turbopack expects in this repo's Next.js 16.1.6)
- https://www.papaparse.com (worker mode, streaming `step` callback) — HIGH confidence, official docs
