# Individual Tax Calculator + PDF Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver TaxOps-branded individual tax calculator outputs and downloadable PDF reports in ITA34-style structure.

**Architecture:** Module-based calculator and report transformer with print route and API PDF endpoint using Playwright.

**Tech Stack:** Next.js, TypeScript, Zod, Prisma placeholders, Vitest, Playwright.

---

### Task 1: TDD failing tests
- Create failing tests for:
  - 2026 calculator totals
  - report section/line mapping
  - validation schema constraints

### Task 2: Implement individual tax domain module
- Create `src/modules/individual-tax/*`:
  - types, rules, validation, calculation, report transformer, repository
- Add demo data records and repository adapter.

### Task 3: Build UI and report routes
- Add:
  - `/individual-tax`
  - `/individual-tax/[assessmentId]`
  - `/reports/individual-tax/[assessmentId]/print`
- Add navigation entry and route protection.

### Task 4: Implement downloadable PDF API
- Add `/api/reports/individual-tax/[assessmentId]/pdf`
- Use Playwright to render print route and generate PDF.
- Save file via storage provider and write audit log event.

### Task 5: Extend Prisma schema and seed placeholders
- Add models for assessment/report entities.
- Seed one sample assessment with line items and notes.

### Task 6: Verification
- Run:
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- Generate preview screenshots of calculator and print-style report.
