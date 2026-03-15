# Near-eFiling Individual Tax Calculator Design

## Goal
Transform the current individual tax scaffold into a near-eFiling pre-submission estimator for South African individual taxpayers so staff can show clients an estimated SARS payable or refundable result before actual eFiling submission.

## Approved Scope
- Support multiple assessment years: 2024, 2025, 2026, and 2027.
- Replace the current manual effective-tax-rate approach with year-specific SARS rule packs.
- Support both common and selected complex ITR12 cases in phase 1:
  - employment income and PAYE
  - travel allowances and travel claims
  - retirement fund contributions
  - medical aid credits and qualifying out-of-pocket medical expenses
  - local interest income
  - rental income
  - sole proprietor income
- Add taxpayer profile inputs required for year-specific calculations:
  - date of birth
  - marital status
  - medical aid members
  - months on medical aid
- Keep estimates separate from final SARS submission and clearly label them as pre-submission estimates.

## Product Positioning
The calculator should behave as a near-eFiling estimate engine rather than a lightweight what-if tool. The purpose is to get as close as reasonably possible to the expected SARS outcome before submission, while still surfacing review warnings where assumptions or missing details could materially affect the result.

## Current Gaps
The current implementation is not sufficient for this purpose because it:
- uses a manual `effectiveTaxRate`
- only captures a narrow income/deduction set
- does not model taxpayer age/profile driven rules
- does not support year-specific tax brackets and credits
- does not support rental or sole proprietor schedules
- does not calculate medical credits from source inputs

## Architecture Decision
Use a modular rule-pack engine.

### Why
A near-eFiling calculator across 2024-2027 needs year-effective rules and schedule-specific logic. A single monolithic calculator would become brittle and difficult to validate. A rule-pack engine allows the system to apply the correct brackets, rebates, thresholds, exemptions, and credits for each year while keeping each schedule understandable and testable.

## High-Level Architecture

### 1. Year-Specific Rule Packs
Create dedicated rule definitions for 2024-2027 that contain:
- tax brackets
- primary, secondary, and tertiary rebates
- tax thresholds by age band
- interest exemption values
- medical scheme fees tax credit values
- retirement deduction limits
- other year-effective constants needed by supported schedules

### 2. Taxpayer Profile Layer
Add a profile object that feeds all schedule calculations and year-rule lookups:
- assessment year
- date of birth
- derived age at year end
- marital status
- medical aid member count
- months on medical aid

### 3. Modular Schedules
Split calculation logic into focused schedules:
- employment schedule
- travel allowance and claim schedule
- retirement contribution schedule
- medical credits schedule
- interest income schedule
- rental income schedule
- sole proprietor schedule

Each schedule should return:
- taxable or deductible amounts
- line-by-line explanations
- warnings or review flags when required supporting inputs are missing or incomplete

### 4. Consolidated Assessment Engine
A single aggregation engine should merge schedule outputs into:
- total income
- allowable deductions
- taxable income
- assessed tax from year brackets
- rebates from age/profile/year
- medical credits
- PAYE and other offsets
- net amount payable or refundable

## UX Design

### New Calculator Flow
Replace the single flat input form with a guided multi-step pre-submission estimate workflow.

Proposed steps:
1. Taxpayer Profile
2. Employment
3. Travel
4. Medical
5. Other Income
6. Deductions and Retirement
7. Estimate Result

### Step Content

#### Taxpayer Profile
- assessment year
- date of birth
- marital status
- taxpayer name
- reference number

#### Employment
- salary and wages
- bonuses and taxable remuneration inputs
- PAYE withheld
- other employment-linked taxable components where already supported by the employment schedule design

#### Travel
- travel allowance
- business kilometres
- total kilometres
- vehicle cost and acquisition date
- travel-claim supporting inputs needed to compute the estimate

#### Medical
- monthly medical aid contributions or annual total
- number of medical aid members/dependants
- months covered
- out-of-pocket qualifying medical expenses

#### Other Income
- local interest
- rental income and rental expenses
- sole proprietor income and deductible expenses

#### Deductions and Retirement
- retirement fund contributions
- other supported deduction inputs as the schedule expands

#### Estimate Result
- estimated payable or refundable amount
- line-by-line explanation of how the result was built
- review warnings
- a SARS-style summary structure suitable for practitioner discussion with the client

## Result Experience
The estimate result should not reuse the ITA34 notice format. Instead, it should be an estimate worksheet focused on:
- clarity
- explainability
- client discussion before eFiling submission
- traceability of the estimate to the captured schedules

The existing ITA34 print view remains a separate output concern.

## Data and Persistence
Saved assessments should persist enough structured input to reopen, edit, and re-run estimates against a client record. The data model must evolve from the current narrow flat input object to a richer multi-schedule payload. The saved result should retain:
- assessment year
- taxpayer profile inputs
- schedule inputs
- generated line-item breakdown
- review-required flags
- final estimated payable or refundable outcome

## Validation and Controls
- Required fields should be enforced per schedule.
- Missing high-impact fields should create warnings rather than silent assumptions.
- Complex schedules such as travel, rental, and sole proprietor income should be review-flagged when inputs are incomplete.
- All outputs remain advisory until actual eFiling submission.

## Testing Strategy
Add coverage at three layers.

### Rule-Pack Tests
Verify year-specific constants and edge behavior for 2024-2027.

### Scenario Tests
Cover:
- salary only
- salary plus travel
- salary plus medical out-of-pocket expenses
- salary plus rental income
- salary plus sole proprietor income
- combined complex case

### UI Flow Tests
Verify the multi-step workflow, save/reload behavior, and result rendering.

## Risks
- SARS rule drift across years can make calculations incorrect if constants are not versioned carefully.
- Travel and medical calculations can be misleading if required supporting inputs are missing.
- Complex schedules can create false confidence if review warnings are too weak.

## Mitigations
- Centralize year rules in explicit rule-pack files.
- Keep line-by-line calculation output visible.
- Add strong review warnings when assumptions are incomplete.
- Test each supported year with scenario-based fixtures.

## Official Reference Sources
The rule packs should be verified against official SARS material for the supported years, starting with:
- https://www.sars.gov.za/types-of-tax/personal-income-tax/
- https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/

## Implementation Handoff
After design approval, implementation should proceed by:
- replacing the current scaffold engine
- introducing rule-pack-based calculations
- expanding persisted inputs and UI schedules
- validating scenarios across 2024-2027 before release
