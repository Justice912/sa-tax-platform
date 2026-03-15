# Golden Demo Client Design

## Goal

Add one comprehensive cross-module golden demo bundle that is always present in the desktop app and is restored automatically on startup in additive mode. The bundle must let us verify clients, cases, individual tax, estates, Phase 2 estate calculators, and filing-pack generation from a single known scenario.

## Current Constraint

The app is running in demo mode by default, but demo data is split across two storage models:

- static in-memory arrays in [src/server/demo-data.ts](/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/src/server/demo-data.ts) for clients, cases, and some supporting records
- persisted desktop profile JSON stores under `%AppData%/sa-tax-platform/storage`, especially:
  - [demo-estates.json](/Users/HP/AppData/Roaming/sa-tax-platform/storage/demo-estates.json)
  - [demo-individual-tax-assessments.json](/Users/HP/AppData/Roaming/sa-tax-platform/storage/demo-individual-tax-assessments.json)

Once those files exist, source-level demo updates alone do not change the live desktop data. Estate engine runs are also only in-memory today in [src/modules/estates/engines/repository.ts](/Users/HP/Accounting-Pro-A.M.E/sa-tax-platform/src/modules/estates/engines/repository.ts), so approved calculation chains disappear across restarts.

## Recommended Approach

Implement a named golden demo bundle with stable IDs and additive auto-restore on startup.

The bundle will include:

- one individual client with active contact details and a linked individual-tax verification scenario
- one estate client with a fully populated deceased-estate file
- linked cases for both the individual and estate workflows
- estate assets, liabilities, beneficiaries, checklist items, stage events, liquidation data, and executor access
- seeded individual-tax assessments for verifying client-linked assessment pages
- seeded estate engine runs for:
  - business valuation
  - pre-death ITR12
  - CGT on death
  - estate duty
  - post-death IT-AE
- a filing-pack-ready state so formal outputs can be checked immediately

## Data Model

The golden bundle should be represented as source-controlled baseline records with stable IDs rather than generated at runtime. That keeps the verification scenario deterministic and makes it easy to overwrite drifted golden records while preserving unrelated user-created demo records.

We should add a dedicated demo-bundle module that exports:

- baseline clients
- baseline cases
- baseline estates and child estate records
- baseline individual-tax assessments
- baseline estate engine runs

The bundle should use stable IDs like `golden_client_individual_001`, `golden_estate_001`, and `golden_estate_engine_run_valuation_001` so additive restore can upsert by identity.

## Restore Strategy

Automatic restore should run during demo-mode startup for the local desktop server, not just during development seeding.

Restore rules:

- if a golden record is missing, create it
- if a golden record exists but differs, overwrite it back to baseline
- if unrelated user-created demo records exist, keep them untouched
- if a persisted file is absent or corrupt, recreate it with at least the golden records plus any valid non-golden entries we can preserve

This is additive restore, not full reset.

## Storage Changes

To support persistent estate verification state, demo-mode estate engine runs should move from process-only memory to a persisted JSON store, parallel to the other demo stores.

Likely new store:

- `%AppData%/sa-tax-platform/storage/demo-estate-engine-runs.json`

Repository behavior in demo mode should become:

- read persisted engine runs
- merge in golden engine runs on startup restore
- write back newly created or approved runs

That lets the desktop app restart without losing the seeded approved chain or user reruns.

## UX Outcome

After startup, the desktop app should always show the same golden demo client bundle:

- the client list should contain the golden individual and estate clients
- the estate list should contain the golden estate with a complete Phase 2-ready profile
- all five Phase 2 calculator workspaces should open and either show seeded approved outputs or allow reruns from complete baseline data
- filing-pack generation should be available immediately from the seeded approved chain

Users can still add and edit other demo records, but the golden bundle will reassert itself on each launch.

## Error Handling

If restore fails:

- the desktop app should still continue startup where possible
- write a startup log entry to [desktop-startup.log](/Users/HP/AppData/Roaming/sa-tax-platform/desktop-startup.log)
- fail soft rather than block the UI, unless the underlying store is unreadable and cannot be recovered

## Testing

We should verify:

- additive merge preserves non-golden records
- golden records are recreated if deleted
- golden records are overwritten if modified
- estate engine runs persist across demo-mode repository reads and writes
- filing-pack readiness is true for the golden estate after restore
- desktop startup restore runs without breaking the packaged runtime
