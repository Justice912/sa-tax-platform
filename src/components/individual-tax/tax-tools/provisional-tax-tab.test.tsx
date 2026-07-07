import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RulePackProvider } from "@/components/individual-tax/tax-tools/rulepack-context";
import { TaxToolsSummaryProvider } from "@/components/individual-tax/tax-tools/summary-context";
import { ProvisionalTaxTab } from "@/components/individual-tax/tax-tools/provisional-tax-tab";
import { fmt } from "@/components/individual-tax/tax-tools/shared";
import { TaxTools } from "@/components/individual-tax/tax-tools";
import { calcTax } from "@/components/individual-tax/tax-tools/calc-helpers";
import { getIndividualTaxRulePack } from "@/modules/individual-tax/rulepack-registry";

// en-ZA gotcha: fmt() uses a non-breaking-space thousands separator. The default
// Testing Library normalizer collapses whitespace, silently breaking exact-string
// matches -- disable it so the raw NBSP on both sides compares equal.
const raw = (text: string) => text;

function renderProvisional() {
  return render(
    <RulePackProvider>
      <TaxToolsSummaryProvider>
        <ProvisionalTaxTab />
      </TaxToolsSummaryProvider>
    </RulePackProvider>,
  );
}

describe("ProvisionalTaxTab -- para 19 basic amount + para 20 safe harbour", () => {
  it("safe-harbour floor at/below R1,000,000: lesser of basic amount or 90% of estimate", async () => {
    const user = userEvent.setup();
    renderProvisional();

    await user.type(
      screen.getByLabelText(/prior year taxable income \(r\)/i),
      "800000",
    );
    const estimatedTaxable = screen.getByLabelText(
      /estimated current year taxable income \(r\)/i,
    );
    await user.type(estimatedTaxable, "500000");

    // basicAmount = 800000 (no escalation); safeHarbour = min(800000, 0.9*500000=450000) = 450000
    expect(
      screen.getAllByText(fmt(450000), { normalizer: raw }).length,
    ).toBeGreaterThan(0);

    await user.clear(estimatedTaxable);
    await user.type(estimatedTaxable, "1500000");

    // Above R1m: safeHarbour = 0.8 * 1500000 = 1,200,000 (basic-amount option falls away).
    // A swapped ternary would wrongly produce 0.9*1500000=1,350,000 here -- this catches it.
    expect(
      screen.getAllByText(fmt(1200000), { normalizer: raw }).length,
    ).toBeGreaterThan(0);
  });

  it("basic amount binds when it is lower than 90% of the estimate (<=R1m)", async () => {
    const user = userEvent.setup();
    renderProvisional();

    await user.type(
      screen.getByLabelText(/prior year taxable income \(r\)/i),
      "300000",
    );
    await user.type(
      screen.getByLabelText(/estimated current year taxable income \(r\)/i),
      "500000",
    );

    // min(300000, 0.9*500000=450000) = 300000 -- basic amount binds, not the 90% figure.
    expect(
      screen.getAllByText(fmt(300000), { normalizer: raw }).length,
    ).toBeGreaterThan(0);
  });

  it("escalates the para-19 basic amount by 8% (simple) when the latest assessment is older than 18 months", async () => {
    const user = userEvent.setup();
    renderProvisional();

    await user.type(
      screen.getByLabelText(/prior year taxable income \(r\)/i),
      "500000",
    );

    // Default: not older than 18 months -> basic amount = priorTaxable, unescalated.
    expect(
      screen.getAllByText(fmt(500000), { normalizer: raw }).length,
    ).toBeGreaterThan(0);

    await user.selectOptions(
      screen.getByLabelText(/latest assessment older than 18 months/i),
      "yes",
    );

    // round(500000 * 1.08) = 540,000
    expect(
      screen.getAllByText(fmt(540000), { normalizer: raw }).length,
    ).toBeGreaterThan(0);
  });

  it("nets the second-period (P2) payment off the first-period (P1) payment already made", async () => {
    const user = userEvent.setup();
    renderProvisional();

    await user.type(
      screen.getByLabelText(/estimated current year taxable income \(r\)/i),
      "600000",
    );
    await user.type(screen.getByLabelText(/paye deducted/i), "20000");
    await user.type(
      screen.getByLabelText(/first period payment already paid/i),
      "15000",
    );
    await user.selectOptions(
      screen.getByLabelText(/payment period/i),
      "P2",
    );

    // fullTax = calcTax(2026, 600000) - 17235 = 152867 - 17235 = 135632; credits=0 -> netTax=135632
    // P2 payment = max(0, netTax - paye - firstPayment) = 135632 - 20000 - 15000 = 100632
    const rulePack2026 = getIndividualTaxRulePack(2026);
    const expectedFullTax = calcTax(rulePack2026, 600000) - rulePack2026.rebates.primary;
    const expectedNetTax = Math.max(0, expectedFullTax);
    const expectedPayment = Math.max(0, expectedNetTax - 20000 - 15000);
    expect(expectedPayment).toBe(100632);

    expect(
      screen.getAllByText(fmt(expectedPayment), { normalizer: raw }).length,
    ).toBeGreaterThan(0);
  });

  it("reads 2027's corrected full-year tax from the rulepack, diverging from the 2026 figure (depends on 07-01)", async () => {
    const user = userEvent.setup();
    render(<TaxTools />);

    const provisionalNav = screen.getAllByRole("button", {
      name: /provisional tax/i,
    })[0];
    await user.click(provisionalNav);

    await user.type(
      screen.getByLabelText(/estimated current year taxable income \(r\)/i),
      "500000",
    );

    const rulePack2026 = getIndividualTaxRulePack(2026);
    const expectedFullTax2026 = Math.max(
      0,
      Math.round(calcTax(rulePack2026, 500000) - rulePack2026.rebates.primary),
    );
    expect(
      screen.getAllByText(fmt(expectedFullTax2026), { normalizer: raw })
        .length,
    ).toBeGreaterThan(0);

    const yearSelect = screen.getByLabelText(/tax year/i);
    await user.selectOptions(yearSelect, "2027");

    const rulePack2027 = getIndividualTaxRulePack(2027);
    const expectedFullTax2027 = Math.max(
      0,
      Math.round(calcTax(rulePack2027, 500000) - rulePack2027.rebates.primary),
    );
    expect(expectedFullTax2027).not.toBe(expectedFullTax2026);
    expect(rulePack2027.rebates.primary).toBe(17820);
    expect(
      screen.getAllByText(fmt(expectedFullTax2027), { normalizer: raw })
        .length,
    ).toBeGreaterThan(0);
  });
});
