import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaxTools } from "@/components/individual-tax/tax-tools";
import { fmt } from "@/components/individual-tax/tax-tools/shared";

// en-ZA gotcha: fmt() uses a non-breaking-space thousands separator; the default
// testing-library normalizer collapses it, silently breaking exact-string matches.
const rawNormalizer = (text: string) => text;

describe("CgtTab per-year exclusions/inclusion (CALC-03)", () => {
  it("2026 (default year): worked example still computes correctly reading rulepack rates", async () => {
    const user = userEvent.setup();
    render(<TaxTools />);

    const cgtNav = screen.getAllByRole("button", {
      name: /capital gains/i,
    })[0];
    await user.click(cgtNav);

    // gain = 1,000,000 - 400,000 - 50,000 - 20,000 = 530,000
    // exclusion (2026, no primaryRes/death) = annualExclusion = 40,000
    // netGain = 490,000; taxableGain = 490,000 * 0.40 = 196,000
    // marginal @ taxableIncome 2,000,000 = 0.45 (top 2026 bracket)
    // cgtPayable = round(196,000 * 0.45) = 88,200
    await user.type(
      screen.getByLabelText(/taxable income \(r\) — for marginal rate/i),
      "2000000",
    );
    await user.type(
      screen.getByLabelText(/proceeds \/ selling price/i),
      "1000000",
    );
    await user.type(
      screen.getByLabelText(/base cost \/ purchase price/i),
      "400000",
    );
    await user.type(screen.getByLabelText(/improvement costs/i), "50000");
    await user.type(screen.getByLabelText(/selling costs/i), "20000");

    expect(
      screen.getAllByText(fmt(88200), { normalizer: rawNormalizer }).length,
    ).toBeGreaterThan(0);
  });

  it("2027: select labels + Taxable Portion card interpolate the per-year figures (50k/3m/440k/40%)", async () => {
    const user = userEvent.setup();
    render(<TaxTools />);

    const cgtNav = screen.getAllByRole("button", {
      name: /capital gains/i,
    })[0];
    await user.click(cgtNav);

    const yearSelect = screen.getByLabelText(/tax year/i);
    await user.selectOptions(yearSelect, "2027");

    // Primary-residence select option reflects the 2027 R3,000,000 exclusion.
    expect(
      screen.getByRole("option", {
        name: new RegExp(`Yes.*${fmt(3000000)}`, "i"),
      }),
    ).toBeInTheDocument();

    // Disposal-on-death select options reflect the 2027 R50,000 (No, i.e.
    // annual exclusion applies instead) and R440,000 (Yes, death exclusion) figures.
    expect(
      screen.getByRole("option", {
        name: new RegExp(`No.*${fmt(50000)}`, "i"),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", {
        name: new RegExp(`Yes.*${fmt(440000)}`, "i"),
      }),
    ).toBeInTheDocument();

    // "Taxable Portion" card label interpolates the inclusion rate (still 40% in 2027,
    // but no longer a hardcoded literal -- it now reads rulePack.cgt.inclusionRate).
    expect(screen.getByText(/Taxable Portion \(40%\)/i)).toBeInTheDocument();
  });

  it("2027: applies the R3,000,000 primary-residence exclusion, fully absorbing a gain that a R2,000,000 (2026) exclusion would not", async () => {
    const user = userEvent.setup();
    render(<TaxTools />);

    const cgtNav = screen.getAllByRole("button", {
      name: /capital gains/i,
    })[0];
    await user.click(cgtNav);

    // gain = 4,000,000 - 1,500,000 - 0 - 0 = 2,500,000
    await user.type(
      screen.getByLabelText(/taxable income \(r\) — for marginal rate/i),
      "2000000",
    );
    await user.type(
      screen.getByLabelText(/proceeds \/ selling price/i),
      "4000000",
    );
    await user.type(
      screen.getByLabelText(/base cost \/ purchase price/i),
      "1500000",
    );
    await user.selectOptions(
      screen.getByLabelText(/primary residence exclusion/i),
      "yes",
    );

    // 2026: exclusion = annualExclusion(40,000) + min(2,500,000, 2,000,000) = 2,040,000
    // netGain = 2,500,000 - 2,040,000 = 460,000; taxableGain = 184,000
    // marginal @ 2,000,000 taxable income = 0.45 -> cgtPayable = round(184,000*0.45) = 82,800
    expect(
      screen.getAllByText(fmt(82800), { normalizer: rawNormalizer }).length,
    ).toBeGreaterThan(0);

    const yearSelect = screen.getByLabelText(/tax year/i);
    await user.selectOptions(yearSelect, "2027");

    // 2027: exclusion = annualExclusion(50,000) + min(2,500,000, 3,000,000) = 2,550,000
    // netGain = max(0, 2,500,000 - 2,550,000) = 0 -> taxableGain = 0 -> cgtPayable = 0
    // The R3,000,000 primary-residence exclusion now fully absorbs the gain --
    // proving the 2027 figure is applied, not the stale 2026 R2,000,000 exclusion.
    expect(
      screen.getAllByText(fmt(0), { normalizer: rawNormalizer }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryAllByText(fmt(82800), { normalizer: rawNormalizer }).length,
    ).toBe(0);
  });
});
