# Desktop Release Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add tested desktop distribution controls for unsigned and signed installer builds with optional icon branding support.

**Architecture:** Introduce a small release-build config module used by a distribution orchestrator script. The orchestrator runs bundle build, resolves mode/icon, and invokes Electron Builder with explicit CLI overrides.

**Tech Stack:** Node.js scripts, Electron Builder, Vitest.

---

### Task 1: Add release-build resolver tests

**Files:**
- Create: `src/desktop/release-build.test.ts`

### Task 2: Implement release-build resolver module

**Files:**
- Create: `desktop/release-build.cjs`

### Task 3: Add distribution orchestrator script

**Files:**
- Create: `desktop/run-desktop-dist.cjs`
- Modify: `package.json`

### Task 4: Update docs and environment hints

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

### Task 5: Verify

Run:
- `npm run test -- src/desktop/release-build.test.ts`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run desktop:dist`

