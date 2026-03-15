# TaxOps ZA Coding Course Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a lesson-based beginner-to-professional coding course for the TaxOps ZA codebase and export it as a new PDF.

**Architecture:** Reuse the existing codebase understanding and the existing PDF generation pattern, but write a new source document organized into lessons instead of a reference guide.

**Tech Stack:** Markdown, Python, local filesystem, existing custom PDF generator

---

### Task 1: Save the course plan

**Files:**
- Create: `docs/plans/2026-03-13-codebase-coding-course-design.md`
- Create: `docs/plans/2026-03-13-codebase-coding-course-implementation.md`

**Step 1: Write the approved lesson structure**

Record the teaching flow and output expectations.

**Step 2: Save the files**

Keep the design and implementation notes in `docs/plans`.

### Task 2: Write the course source

**Files:**
- Create: `docs/guides/taxops-za-coding-course.md`

**Step 1: Write lesson-by-lesson content**

Organize the content into numbered lessons that move from absolute beginner ideas to early professional engineering habits.

**Step 2: Use real TaxOps ZA examples**

Anchor every major lesson in actual repo files and behaviors.

**Step 3: Add exercises and study advice**

Each lesson should include practical next steps for the learner.

### Task 3: Update the PDF generator for reuse

**Files:**
- Modify: `scripts/generate_learning_guide_pdf.py`

**Step 1: Add source/output arguments**

Allow the script to generate different PDFs from different Markdown files.

**Step 2: Keep the default behavior intact**

The existing guide PDF path should still work if no arguments are passed.

### Task 4: Generate the new course PDF

**Files:**
- Output: `output/pdf/taxops-za-coding-course.pdf`

**Step 1: Run the generator against the new course source**

Generate the dedicated course PDF.

**Step 2: Verify the file**

Confirm file existence, size, and expected lesson headings through text extraction.

**Step 3: Return the final path**

Report the Markdown source path and PDF path to the user.
