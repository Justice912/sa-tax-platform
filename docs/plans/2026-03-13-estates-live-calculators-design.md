# Estates Live Calculators Design

## Scope

Convert the Phase 2 estates workspaces from review-only shells into live operational pages for:

- Business valuation
- Pre-death ITR12
- CGT on death
- Estate duty
- Filing pack

The post-death IT-AE workspace remains in scope for consistency if it can be wired with the same pattern during this pass, but the priority is the five workspaces the user called out.

## Current Gap

The routes exist and open, but most pages only show `EngineReviewPanel` plus static context cards. The underlying engine services already exist, so the missing layer is page-level data capture, server actions, dependency-state wiring, and result presentation.

## Design

### 1. Business valuation

Keep the existing valuation workspace, but tighten methodology presentation and live operation:

- Use explicit valuation labels such as `NAV (Net Asset Value)` and `Maintainable Earnings`
- Keep the valuation tied to a `BUSINESS_INTEREST` asset
- Persist the concluded value back to the linked estate asset
- Render the richer SARS-style valuation report already introduced

This is the only workspace that already has a live form, so the required change is correctness and methodology clarity rather than a fresh build.

### 2. Pre-death ITR12

Add a live workspace component that captures the existing service input shape:

- Income period dates
- Medical aid fields
- Employment, travel, medical, interest, rental, sole proprietor, and deduction inputs

Submission runs `estatePreDeathService.createPreDeathRun(...)`, stores a fresh engine run, and then re-renders the page with a summary of the calculated output.

### 3. CGT on death

Add a live workspace that:

- Shows the current estate assets feeding the calculation
- Makes the run action explicit
- Shows the calculation summary and asset-level results from the latest run

This engine already derives its input from estate assets, so the page only needs a run action and a readable result surface.

### 4. Estate duty

Add a live workspace with:

- Section 4 deductions input
- Spouse deduction input
- Dependency readiness derived from the latest valuation and CGT runs

The page computes dependency states from the current estate engine runs and passes them into `estateDutyService.createEstateDutyRun(...)`.

### 5. Filing pack

Keep filing-pack generation service-side, but make the page operational:

- Show current readiness and blocking reasons
- Show the required engine states that drive readiness
- Keep the live generate link when the pack is ready

## Data Flow

Each workspace follows the same server-side pattern:

1. Load estate + engine runs
2. Select the latest run for that engine
3. Render the workspace form
4. On submit, call the existing engine service
5. Revalidate the estate workspace and filing-pack routes

## Risks

- Estate duty depends on correct dependency-state resolution; this needs an explicit helper rather than repeated page-local logic.
- Business valuation methodology labels must not imply unsupported methods. This pass will make `NAV` explicit and retain only methods the current engine actually calculates.
- Server actions should not rely on user-supplied dependency state where it can be derived from current runs.

## Testing

Add focused component tests for the live workspace UIs and helper tests for dependency-state resolution. Re-run the affected engine service tests, then `lint`, `build`, and rebuild the desktop runtime.
