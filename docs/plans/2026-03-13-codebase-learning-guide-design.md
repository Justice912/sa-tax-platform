# TaxOps ZA Codebase Learning Guide Design

## Goal

Create a beginner-friendly learning guide that teaches coding from zero using the TaxOps ZA codebase as the example system. The guide must help a non-technical reader understand what programming is, how this application is structured, how folders and files fit together, and how to read important code line by line in plain language.

## Why This Design

A literal file-by-file encyclopedia would be too large and too technical for a true beginner. A concept-only tutorial would teach general programming but would not help the user navigate this specific codebase. The best teaching format is a hybrid:

- start with first principles
- explain the whole codebase folder by folder
- do detailed line-by-line walkthroughs of the most educational files
- finish by teaching the reader how to inspect unfamiliar files alone

This keeps the guide practical and readable while still being grounded in the real app.

## Teaching Audience

The primary reader has zero programming experience. The guide therefore needs to:

- avoid assuming prior knowledge
- define technical words before using them heavily
- use analogies tied to business operations, forms, and workflows
- explain why code exists before explaining syntax
- move from simple ideas to more professional engineering ideas

## Scope

The guide will cover the whole codebase at the folder level, including:

- root project files
- `src/app`
- `src/components`
- `src/modules`
- `src/lib`
- `src/server`
- `src/types`
- `desktop`
- `prisma`
- `docs`
- `tests`

It will not attempt to explain every single file line by line. Instead, it will explain the most important architectural files line by line and teach the reader how to analyze the rest.

## Deep-Dive Files

The line-by-line teaching sections will focus on representative files that explain the architecture of the app:

- `package.json`
- `src/app/layout.tsx`
- one protected page route, centered on the estate valuation workspace
- one domain service file from estates
- one database schema file
- one Electron desktop shell file
- one API report route
- one test file

These examples give the learner a strong mental model for how the rest of the repository works.

## Document Structure

The PDF will be organized as a learning manual:

1. What programming is
2. What this tax app does in business terms
3. How a click turns into software behavior
4. Whole-codebase map
5. Folder-by-folder explanation
6. Line-by-line walkthroughs of key files
7. Beginner coding glossary
8. How to read and debug code
9. Practice exercises using the real app
10. Professional habits and next steps

## Output Format

Two artifacts will be created:

- a source Markdown guide that is easy to edit later
- a final PDF for reading and sharing

The final PDF will be written to `output/pdf/` to match the local PDF workflow convention.

## Visual and Writing Style

The guide will use:

- plain language
- short explanations before technical detail
- diagrams expressed in simple text structure
- clearly labeled sections
- examples from estates, valuations, filings, and desktop behavior

The tone will be instructional, practical, and non-academic.

## Verification

The final verification standard is:

- the Markdown source exists and is readable
- the PDF is generated successfully
- the PDF can be opened locally
- the PDF contains the expected sections and readable text

