# Deceased Estates Operational Module Design

## Goal
Add a dedicated deceased estates module to the SA tax platform so staff can manage the operational liquidation workflow for an estate from intake through a balanced draft Liquidation and Distribution (L&D) tracker, while also giving executors a read-only progress view.

## Approved Phase 1 Scope
- Add a new top-level `estates` module inside the existing Next.js application.
- Support internal staff workflows for:
  - estate intake and onboarding
  - stage progression and compliance tracking
  - asset register
  - liabilities register
  - beneficiaries register
  - document checklist and document-vault integration
  - timeline and audit-friendly activity history
  - working L&D tracker with balances, costs, and beneficiary allocations
- Support executor read-only access from day one.
- Exclude for phase 1:
  - pre-death ITR12 calculation engine
  - CGT deemed disposal engine
  - estate duty engine
  - post-death IT-AE engine
  - business valuation engine
  - formal SARS/Master document generation beyond operational placeholders

## Product Positioning
This phase is an operational estate-administration workspace, not yet a full tax-calculation engine. The module should help staff run the matter properly, keep records complete, track stage readiness, and prepare the estate for the later calculation and document-generation phases.

## Current Project Context
- The current application already has top-level modules for clients, cases, documents, dashboard, ITR12, and individual tax.
- There is no dedicated `estates` route or `src/modules/estates` domain yet.
- The demo dataset already contains estate-oriented records:
  - an estate client
  - an estate case
  - an estate document
  - estate knowledge-base content
- The specification document assumes React + Vite, but the real app is built on Next.js App Router, TypeScript, Tailwind, and the existing module/service/repository patterns. The design below adapts the specification to the real stack.

## Architecture Decision
Use a workflow-first estate module with a domain-ready data model.

### Why
This gives users immediate operational value without waiting for the heavier tax and valuation engines. It also avoids painting the app into a corner by defining estate-specific records and extension points now, so future pre-death tax, CGT, estate duty, post-death tax, and valuation logic can plug into the same estate case without restructuring the module.

## High-Level Architecture

### 1. New Top-Level Estate Module
Create a new `src/modules/estates` domain and matching protected app routes under `src/app/(protected)/estates`.

Phase 1 route structure:
- `/estates`
- `/estates/new`
- `/estates/[estateId]`
- `/estates/[estateId]/assets`
- `/estates/[estateId]/liabilities`
- `/estates/[estateId]/beneficiaries`
- `/estates/[estateId]/liquidation`
- `/estates/[estateId]/documents`
- `/estates/[estateId]/timeline`

Executor route:
- `/executor/estates/[accessToken]`

### 2. Estate Domain Layer
Add an estate-specific repository and service layer following existing module patterns. The service should coordinate:
- estate creation and updates
- stage readiness validation
- checklist generation
- L&D balancing calculations
- executor read-only serialization
- integration with existing clients, cases, documents, and audit-style activity streams

### 3. Existing Module Integration
Phase 1 should reuse current platform capabilities where practical:
- `clients`: every estate links to a client record
- `cases`: estate matters can surface on dashboard and case-style workflows
- `documents`: estate documents and checklist items should integrate with the existing document patterns instead of introducing a separate storage model immediately
- `dashboard`: estate metrics and urgent matters can surface alongside current operational views
- `audit`: estate actions should follow the same audit-history style already used elsewhere in the app

## Domain Model

### Core Estate Record
Add a primary estate record linked to a client record.

Core fields:
- `id`
- `clientId`
- `estateReference`
- `deceasedName`
- `idNumberOrPassport`
- `dateOfBirth`
- `dateOfDeath`
- `maritalRegime`
- `taxNumber`
- `estateTaxNumber`
- `hasWill`
- `executorName`
- `executorCapacity`
- `executorContactDetails`
- `assignedPractitionerName`
- `currentStage`
- `status`
- `notes`
- `createdAt`
- `updatedAt`

### Child Records
Add dedicated records for:
- `estate_assets`
- `estate_liabilities`
- `estate_beneficiaries`
- `estate_checklist_items`
- `estate_stage_events`
- `estate_ld_entries`
- `estate_ld_distributions`
- `estate_executor_access`

### L&D Tracker Data
The L&D tracker should store enough operational detail to balance the estate inside the app:
- gross asset values
- realisation values where relevant
- liabilities at date of death
- administration costs
- funeral or related costs captured as operational entries
- executor remuneration
- Master-related or administrative fees
- net estate available for distribution
- beneficiary allocation lines
- balancing difference
- status flags such as `draft`, `review_required`, and `ready`

### Future-Proofing
Although tax and valuation engines are excluded from phase 1, the model should reserve clean extension points for:
- pre-death tax workspace
- CGT deemed disposal schedules
- estate duty schedules
- post-death estate income-tax schedules
- business valuation schedules

## Workflow and Stage Model

### Estate Lifecycle
The estate should progress through explicit operational stages inspired by the specification:
1. Death Reported
2. Executor Appointed
3. Assets and Liabilities Identified
4. Documents and Values Captured
5. Tax Readiness
6. L&D Drafted
7. L&D Under Review
8. Distribution Ready
9. Distributed
10. Finalised

Phase names can be adapted slightly for the current app, but the stage model must stay structured and sequential.

### Stage Advancement
Advancing a stage should:
- run validation rules
- return human-readable missing items if blocked
- append a timeline event
- update estate status metadata

### Checklist Generation
When a new estate is created, the system should generate an initial checklist covering:
- death certificate
- ID document
- will status
- marriage-related documents where applicable
- executor appointment documents
- asset and liability support documents
- beneficiary support documents

Checklist items should be stage-aware so the dashboard can show readiness clearly.

## User Experience

### Internal Staff Flow
The staff workflow should feel like a proper operational case workspace:
- `Estates` list page with search, filters, status badges, stage badges, assignee, and overdue signals
- `New Estate` wizard for intake
- estate dashboard as the primary control center
- linked pages for assets, liabilities, beneficiaries, documents, liquidation tracker, and timeline

### Estate Dashboard
The main estate dashboard should show:
- deceased summary
- executor summary
- current stage and progress bar
- checklist completion
- key estate balances
- L&D readiness state
- recent timeline activity
- quick actions

### L&D Tracker
The L&D tracker should be operational, not a placeholder.

It should allow staff to:
- review assets and liabilities in one place
- enter administration and liquidation-related entries
- calculate net distributable estate value
- allocate distributions to beneficiaries
- see whether the account balances
- mark the draft as ready only when balancing conditions are met

The screen should prioritize clarity and explainability over trying to mimic the final statutory form too early.

### Executor Read-Only Dashboard
The executor route should provide a limited read-only view showing:
- estate status and current stage
- high-level balances and distribution status
- checklist/document progress where appropriate
- timeline milestones

It must exclude:
- editing controls
- internal notes
- internal validation details that are staff-only
- staff-only audit commentary

## Routes and Components

### Pages
- `EstateListPage`
- `EstateCreatePage`
- `EstateDashboardPage`
- `EstateAssetsPage`
- `EstateLiabilitiesPage`
- `EstateBeneficiariesPage`
- `EstateLiquidationPage`
- `EstateDocumentsPage`
- `EstateTimelinePage`
- `ExecutorEstateDashboardPage`

### Core Components
- `EstateCreateWizard`
- `EstateStageProgress`
- `EstateSummaryCards`
- `EstateChecklistPanel`
- `EstateAssetRegister`
- `EstateLiabilityRegister`
- `EstateBeneficiaryRegister`
- `EstateLiquidationTracker`
- `EstateDistributionTable`
- `EstateTimeline`
- `ExecutorEstateDashboard`

The design should reuse the current app’s cards, tables, badges, forms, and action-bar patterns so the new module feels native to the platform.

## Validation Rules

### Intake Validation
The system should require before estate creation is considered complete:
- deceased name
- identification details
- date of death
- will status
- executor details

### Stage Validation Examples
- `Executor Appointed`: executor details completed and appointment-related checklist items present
- `Assets and Liabilities Identified`: at least one asset or an explicit nil-assets confirmation, plus liabilities reviewed
- `Documents and Values Captured`: key checklist items completed and core records captured
- `L&D Drafted`: L&D entries populated, beneficiary allocations present, and balancing difference equals zero within tolerance
- `Distribution Ready`: required review status and distribution data complete

All validation failures must explain exactly what is missing.

## Permissions and Security

### Internal Roles
Use the existing protected app for staff access.

Role expectations:
- admin: full estate access
- practitioner: create and manage assigned estates
- reviewer: inspect and review with limited edit rights
- staff: operational updates subject to current app rules

### Executor Access
Executor access should be token-based for phase 1.

Why:
- faster to ship than introducing a second full auth model immediately
- easier to constrain to read-only serialization
- keeps executor access isolated from internal staff navigation

The system should log:
- token issuance
- token access events

## Audit and Timeline
The estate module should create audit-friendly events for:
- estate creation
- stage changes
- asset, liability, and beneficiary changes
- L&D edits
- checklist status changes
- executor access issuance and use

The user-facing timeline should present operational milestones clearly, while staff-only audit detail can remain in service/repository records for later expansion.

## Testing Strategy

### Unit Tests
Add tests for:
- stage validation logic
- estate reference generation
- L&D balancing logic
- net estate available calculations
- beneficiary allocation balancing
- executor read-only projection rules

### Integration Tests
Add tests for:
- creating an estate
- generating initial checklist items
- updating estate records across sub-pages
- advancing stages with passing and failing validations
- completing a balanced L&D tracker
- loading executor token-based dashboard data

### UI Tests
Add tests for:
- create-estate wizard flow
- estate list filtering
- dashboard progress rendering
- liquidation tracker balancing and error display
- executor read-only dashboard rendering

## Risks
- The specification is broader than phase 1, so users could assume tax calculations already exist.
- Estate workflows can become confusing if stages and checklist states do not align clearly.
- L&D balancing logic can create mistrust if totals are not transparent.
- Executor access can leak internal information if serialization boundaries are weak.

## Mitigations
- Label phase 1 clearly as an operational estate workspace.
- Keep stage validation explicit and readable.
- Show line-by-line totals in the liquidation tracker.
- Create a dedicated executor serializer that excludes staff-only fields by default.

## Implementation Handoff
Implementation should proceed by:
- introducing the estate domain model and storage layer
- building internal list/create/dashboard pages
- adding registers for assets, liabilities, and beneficiaries
- building the operational L&D tracker
- adding executor read-only access
- validating the full workflow through tests before shipping
