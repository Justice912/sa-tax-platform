import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RulePackProvider } from "@/components/individual-tax/tax-tools/rulepack-context";
import { TaxToolsSummaryProvider } from "@/components/individual-tax/tax-tools/summary-context";
import { HomeOfficeTab } from "@/components/individual-tax/tax-tools/home-office-tab";
import { fmt } from "@/components/individual-tax/tax-tools/shared";

// en-ZA gotcha: fmt() uses a non-breaking-space thousands separator; the default
// testing-library normalizer collapses that to a regular space and silently fails
// exact-string matches, so all currency assertions here disable it.
const raw = (text: string) => text;

function renderHomeOfficeTab() {
  return render(
    <RulePackProvider>
      <TaxToolsSummaryProvider>
        <HomeOfficeTab />
      </TaxToolsSummaryProvider>
    </RulePackProvider>,
  );
}

describe("HomeOfficeTab (CALC-05: SARS floor-area apportionment + s23(b)/s23(m) regression)", () => {
  it("apportions shared premises costs by floor area and computes the annual deduction", async () => {
    const user = userEvent.setup();
    renderHomeOfficeTab();

    // ratio = 20/100 = 0.2; shared = 5000+500+300+200 = 6000; direct(repairs+internet) = 100+50 = 150
    // monthly = 6000*0.2 + 150 = 1350; annual = 1350*12 = 16200 (default empType "commission" -> qualifies)
    await user.type(screen.getByLabelText(/total home area/i), "100");
    await user.type(screen.getByLabelText(/dedicated office area/i), "20");
    await user.type(screen.getByLabelText(/rent or bond interest/i), "5000");
    await user.type(screen.getByLabelText(/rates \(r\/month\)/i), "500");
    await user.type(screen.getByLabelText(/electricity/i), "300");
    await user.type(screen.getByLabelText(/cleaning/i), "200");
    await user.type(screen.getByLabelText(/office repairs/i), "100");
    await user.type(screen.getByLabelText(/internet \/ phone/i), "50");

    expect(
      screen.getAllByText(fmt(1350), { normalizer: raw }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(fmt(16200), { normalizer: raw }).length,
    ).toBeGreaterThan(0);
  });

  it("caps the office/total floor-area ratio at 100% when office area exceeds total area", async () => {
    const user = userEvent.setup();
    renderHomeOfficeTab();

    // office(200) > total(100) -> ratio = min(200/100, 1) = 1 -> "Office Ratio" shows 100.0%
    await user.type(screen.getByLabelText(/total home area/i), "100");
    await user.type(screen.getByLabelText(/dedicated office area/i), "200");

    expect(screen.getByText("100.0%")).toBeInTheDocument();
  });

  it("keeps the conservative salaried-employee policy (Unlikely / R0) with accurate s23(b)/s23(m) warning copy", async () => {
    const user = userEvent.setup();
    renderHomeOfficeTab();

    await user.selectOptions(
      screen.getByLabelText(/employment type/i),
      "salaried",
    );

    // Documents the current conservative default: qualifies = false for salaried,
    // even though the corrected warning copy explains salaried employees CAN
    // qualify under s23(b) (subject to the s23(m) cost restriction). Changing
    // this default is an open product/policy decision -- see SUMMARY.
    expect(screen.getByText("Unlikely")).toBeInTheDocument();
    expect(
      screen.getAllByText(fmt(0), { normalizer: raw }).length,
    ).toBeGreaterThan(0);

    // Accurate s23(b)/s23(m) warning copy is present (no longer "very rarely allows").
    expect(screen.getByText(/s23\(b\)/i)).toBeInTheDocument();
    expect(screen.getByText(/s23\(m\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/very rarely allows/i)).toBeNull();
  });
});
