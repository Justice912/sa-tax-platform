import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RulePackProvider } from "@/components/individual-tax/tax-tools/rulepack-context";
import { TaxToolsSummaryProvider } from "@/components/individual-tax/tax-tools/summary-context";
import { RentalTab } from "@/components/individual-tax/tax-tools/rental-tab";
import { fmt } from "@/components/individual-tax/tax-tools/shared";

// en-ZA gotcha: fmt() uses a non-breaking-space thousands separator; the default
// testing-library normalizer collapses that to a regular space and silently fails
// exact-string matches, so all currency assertions here disable it.
const raw = (text: string) => text;

function renderRentalTab() {
  return render(
    <RulePackProvider>
      <TaxToolsSummaryProvider>
        <RentalTab />
      </TaxToolsSummaryProvider>
    </RulePackProvider>,
  );
}

describe("RentalTab (CALC-05: SARS rental deductible-expense regression)", () => {
  it("computes net rental income = total income - sum of allowable expenses", async () => {
    const user = userEvent.setup();
    renderRentalTab();

    // gross = monthlyRent(10000) * months(default 12) = 120000; otherIncome = 0
    // expenses = rates(1000) + bondInterest(2000) = 3000
    // net = 120000 - 3000 = 117000
    await user.type(screen.getByLabelText(/monthly rent \(r\)/i), "10000");
    await user.type(screen.getByLabelText(/rates & taxes/i), "1000");
    await user.type(screen.getByLabelText(/bond interest/i), "2000");

    expect(
      screen.getAllByText(fmt(117000), { normalizer: raw }).length,
    ).toBeGreaterThan(0);
  });

  it("labels the bond field as interest-only (no capital repayment) and has no capital/improvement input", () => {
    renderRentalTab();

    // The "Bond Interest" label already encodes that only the interest portion of
    // the bond is deductible under s11(a) -- capital repayment is never claimed.
    expect(screen.getByLabelText(/bond interest/i)).toBeInTheDocument();

    // Guard against a future capital-cost leak: no field for capital improvements
    // exists among the 13 SARS-allowable expense categories.
    expect(screen.queryByLabelText(/improvement/i)).toBeNull();
  });
});
