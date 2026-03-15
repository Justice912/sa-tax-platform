# South African TaxOps MVP Design

Date: 2026-03-06

## Scope
Phase 1 MVP foundation for a modular South African tax compliance and SARS workflow platform with:
- Authentication and RBAC
- Firm/client management
- Knowledge base repository
- SARS case workflow tracker
- Document management metadata and linkage
- Deadline summary and reminder-ready model
- Audit logging model and dashboard

## Assumptions
- Initial delivery prioritizes platform architecture, data model, and workflow UX over deep tax rule execution.
- Knowledge base entries are explicitly illustrative placeholders until validated legal content is loaded.
- MVP runs in demo mode by default, with schema and seed support for PostgreSQL production setup.

## Architecture
- Next.js App Router + TypeScript frontend/backend composition.
- Domain modules under `src/modules/*` with service-level boundaries.
- Prisma data model for production persistence with effective-date-ready entities.
- NextAuth credentials-based auth + middleware route protection and role checks.
- Auditability by design: case activity, audit log entities, review status objects.

## UX Structure
- Protected app shell with sidebar navigation.
- Practitioner dashboard focused on deadlines, case status, and recent activity.
- CRUD-ready list/detail screens for clients and cases.
- Search/filter interactions on key operational modules.

## Security and Compliance Position
- RBAC with defined role matrix.
- Zod validation for form payloads.
- POPIA-conscious separation of legal content and taxpayer/case data models.
- Review-required state and disclaimer messaging in workflow surfaces.

## Future Extensibility
- Placeholders and schema support for submission adapters, rules/calculation templates, and workflow engines (ITR12/ITR14/VAT201/EMP workflows).
- Storage abstraction designed for migration from local storage to S3-compatible providers.
- Queue-friendly reminder model via `Reminder` entity.

