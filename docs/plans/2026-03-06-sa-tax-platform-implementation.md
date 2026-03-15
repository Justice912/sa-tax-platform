# SA TaxOps MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-oriented MVP scaffold for South African tax compliance and SARS workflow management.

**Architecture:** Next.js app-router monolith with modular domain services, Prisma persistence layer, and auth/RBAC middleware.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Prisma/PostgreSQL, NextAuth, Zod, Vitest, Playwright.

---

### Task 1: Core Project Setup
- Configure scripts, dependencies, env template, and base app structure.
- Add App Router layout and providers.

### Task 2: Domain Data Model
- Implement `prisma/schema.prisma` with required MVP and placeholder entities.
- Add seed script with South African sample categories, cases, and illustrative legal content.

### Task 3: Auth and RBAC
- Configure NextAuth credentials provider.
- Add middleware route protection and admin-role gating.
- Extend session/JWT types.

### Task 4: Modular Services
- Add shared types and validation schemas.
- Implement services for dashboard, clients, cases, knowledge base, documents, deadlines, and audit log.

### Task 5: UI and Navigation
- Build protected application shell.
- Implement required screens: login, dashboard, clients list/detail, cases list/detail, knowledge base, documents, admin/settings.

### Task 6: Testing and Quality Controls
- Add unit tests for RBAC, deadline engine, and validation schemas.
- Add Playwright smoke test scaffold.

### Task 7: Documentation
- Update README with setup and run instructions.
- Provide architecture and milestone roadmap notes.

