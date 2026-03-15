# TaxOps ZA Coding Course Design

## Goal

Create a lesson-based coding course for a complete beginner, using the TaxOps ZA codebase as the teaching example, and export it as a dedicated PDF.

## Why a New Course Instead of Reusing the Existing Guide

The existing learning guide is a strong reference manual, but it is organized by topics and deep dives rather than by progressive lessons. A true beginner course needs a teaching sequence where each lesson builds on the last one.

The new course should therefore be a separate artifact with:

- numbered lessons
- beginner-friendly progression
- real code examples from the app
- small exercises after each lesson
- professional engineering mindset notes

## Target Reader

The reader has zero programming experience. The course must therefore:

- avoid assuming technical knowledge
- define words before using them
- explain both business meaning and code meaning
- show how to study the codebase safely
- gradually move from beginner concepts toward professional habits

## Course Structure

The recommended lesson structure is:

1. What coding is
2. How this app works as a system
3. Understanding files, folders, and routes
4. Understanding `package.json` and project commands
5. Understanding React, Next.js, and layouts
6. Understanding components
7. Understanding services and business logic
8. Understanding the database and `schema.prisma`
9. Understanding API routes and report generation
10. Understanding the desktop app layer with Electron
11. Understanding testing and debugging
12. Making your first safe code changes
13. Thinking like a professional developer
14. A practical 30-day learning roadmap

## Representative Code Examples

The course should keep using the real project files as teaching anchors, especially:

- `README.md`
- `package.json`
- `src/app/layout.tsx`
- `src/app/(protected)/estates/[estateId]/valuation/page.tsx`
- `src/components/...` examples
- `src/modules/estates/service.ts`
- `src/app/api/reports/estates/[estateId]/filing-pack/route.ts`
- `prisma/schema.prisma`
- `desktop/main.cjs`
- `src/modules/estates/service.test.ts`

## Output Format

Two course artifacts will be created:

- editable Markdown source
- final PDF

The PDF will be separate from the earlier reference guide so the user has:

- one reference manual
- one sequential beginner course

## Verification Standard

The deliverable is complete when:

- the lesson-based Markdown source exists
- the new PDF exists
- the PDF text can be extracted and contains the expected lesson titles
- the new PDF path is returned to the user

