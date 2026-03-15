# TaxOps ZA Codebase Learning Guide Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a beginner-to-professional learning guide for the TaxOps ZA codebase and export it as a PDF.

**Architecture:** Write a structured Markdown teaching manual from the real repository, then generate a PDF from that source with a local script so the guide can be edited and re-exported later.

**Tech Stack:** Markdown, Python, ReportLab, local filesystem, project source files

---

### Task 1: Capture the real teaching inputs from the repo

**Files:**
- Read: `README.md`
- Read: `package.json`
- Read: `prisma/schema.prisma`
- Read: `src/app/layout.tsx`
- Read: `src/app/(protected)/estates/[estateId]/valuation/page.tsx`
- Read: `src/modules/estates/service.ts`
- Read: `desktop/main.cjs`

**Step 1: Read the key architecture files**

Use the real project files to identify:
- what the app does
- what the major folders are
- how requests flow
- where desktop logic lives
- where database structure lives

**Step 2: Summarize the teaching points**

Write down the beginner-friendly explanation topics:
- what each folder means
- which files are most educational
- which examples are best for line-by-line explanation

**Step 3: Verify the teaching map is complete**

Make sure the guide includes:
- frontend
- backend
- database
- desktop shell
- tests
- business domain logic

### Task 2: Draft the learning guide source

**Files:**
- Create: `docs/guides/taxops-za-codebase-learning-guide.md`

**Step 1: Write the beginner sections**

Include:
- what programming is
- what a codebase is
- how this tax app fits those ideas

**Step 2: Write the codebase map**

Explain:
- root folders
- `src`
- `prisma`
- `desktop`
- `docs`
- `tests`

**Step 3: Write the line-by-line deep dives**

Include plain-language explanations for representative files:
- `package.json`
- `src/app/layout.tsx`
- `src/app/(protected)/estates/[estateId]/valuation/page.tsx`
- `src/modules/estates/service.ts`
- `prisma/schema.prisma`
- `desktop/main.cjs`

**Step 4: Add learning tools**

Include:
- glossary
- reading strategy
- debugging strategy
- beginner exercises
- professional next steps

### Task 3: Generate the PDF

**Files:**
- Create: `scripts/generate_learning_guide_pdf.py`
- Output: `output/pdf/taxops-za-codebase-learning-guide.pdf`

**Step 1: Build a simple PDF generator**

Write a Python script that:
- reads the Markdown source
- lays it out as a readable PDF
- handles headings, paragraphs, and code blocks cleanly

**Step 2: Run the generator**

Generate the final PDF under `output/pdf/`.

**Step 3: Verify the artifact exists**

Confirm the file path and size.

### Task 4: Validate the output

**Files:**
- Read: `output/pdf/taxops-za-codebase-learning-guide.pdf`

**Step 1: Inspect the PDF content**

Check that the sections exist and the text is readable.

**Step 2: Verify the guide reflects the real repo**

Confirm the filenames, folder names, and explanations match the current codebase.

**Step 3: Report the final artifact path**

Return the final PDF path and a short explanation of what it contains.
