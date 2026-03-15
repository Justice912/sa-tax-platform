# Audit Timeline Design (Client + Individual Assessment)

## Goal
Add visible change-log timelines to:
- Client detail
- Individual tax assessment detail

## Scope
- Record audit entries for client create/update actions.
- Record audit entries for individual tax assessment create/update actions.
- Keep support for demo mode by persisting audit entries in in-memory demo data.
- Add filtered audit query by entity type + entity id.

## Data and Service Design
- Extend audit service with `listAuditLogsForEntities(filters, limit)`.
- Extend audit writer demo behavior to append audit entries to `demoAuditLogs`.
- Write audit entries from:
  - `createClient`
  - `updateClient`
  - `createIndividualTaxAssessmentForClient`
  - `updateIndividualTaxAssessmentInput`

## UI Design
- Client detail:
  - Add `Client Change Log` timeline card.
  - Aggregate logs for `Client` entity and linked `IndividualTaxAssessment` entities.
- Individual assessment detail:
  - Add `Assessment Timeline` timeline card.
  - Show logs for current `IndividualTaxAssessment` entity.

## Validation and Tests
- Add unit tests for:
  - entity-filtered audit listing
  - client audit integration
  - individual assessment audit integration
- Run full lint, test, and build checks.

## Notes
- Audit summaries are descriptive workflow text, not legal conclusions.
- All generated outputs remain subject to professional review before filing.
