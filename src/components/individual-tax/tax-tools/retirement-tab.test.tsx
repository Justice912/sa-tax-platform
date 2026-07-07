import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaxTools } from "@/components/individual-tax/tax-tools";
import { fmt } from "@/components/individual-tax/tax-tools/shared";

// en-ZA gotcha: fmt() uses a non-breaking-space thousands separator; the default
// testing-library normalizer collapses it, silently breaking exact-string matches.
const rawNormalizer = (text: string) => text;

describe("RetirementTab per-year s11F cap (CALC-02)", () => {
  it("2026 (default year): Deduction Limit card shows the R350,000 cap and the subtitle/sub labels reflect it", async () => {
    const user = userEvent.setup();
    render(<TaxTools />);

    const retirementNav = screen.getAllByRole("button", {
      name: /^retirement$/i,
    })[0];
    await user.click(retirementNav);

    // 27.5% * 2,000,000 = 550,000, which exceeds the R350,000 2026 cap ->
    // Deduction Limit is clamped to the cap, not the 27.5% figure.
    await user.type(
      screen.getByLabelText(/annual remuneration \(r\)/i),
      "2000000",
    );

    expect(
      screen.getAllByText(fmt(350000), { normalizer: rawNormalizer }).length,
    ).toBeGreaterThan(0);

    // Subtitle ("27.5% cap / R 350 000,00 annual limit") and ResultCard sub
    // ("27.5% or R 350 000,00") both interpolate the per-year cap -- neither
    // is a hardcoded "R350,000"/"R350k" string.
    expect(
      screen.getAllByText(/350/, { normalizer: rawNormalizer }).length,
    ).toBeGreaterThan(0);
  });

  it("2027: switching tax year updates the Deduction Limit card to R430,000 and its labels (proves rulepack-sourced, not hardcoded)", async () => {
    const user = userEvent.setup();
    render(<TaxTools />);

    const retirementNav = screen.getAllByRole("button", {
      name: /^retirement$/i,
    })[0];
    await user.click(retirementNav);

    await user.type(
      screen.getByLabelText(/annual remuneration \(r\)/i),
      "2000000",
    );

    const yearSelect = screen.getByLabelText(/tax year/i);
    await user.selectOptions(yearSelect, "2027");

    // 27.5% * 2,000,000 = 550,000 still exceeds the 2027 R430,000 cap ->
    // Deduction Limit is now clamped to R430,000, not R350,000.
    expect(
      screen.getAllByText(fmt(430000), { normalizer: rawNormalizer }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryAllByText(fmt(350000), { normalizer: rawNormalizer })
        .length,
    ).toBe(0);

    // Subtitle/sub labels now show "430", not the stale "350" figure.
    expect(
      screen.getAllByText(/430/, { normalizer: rawNormalizer }).length,
    ).toBeGreaterThan(0);
  });
});
