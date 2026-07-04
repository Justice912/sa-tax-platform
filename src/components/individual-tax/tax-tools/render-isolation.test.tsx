import { Profiler } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RulePackProvider } from "@/components/individual-tax/tax-tools/rulepack-context";
import { TaxToolsSummaryProvider } from "@/components/individual-tax/tax-tools/summary-context";
import { RentalTab } from "@/components/individual-tax/tax-tools/rental-tab";
import { HomeOfficeTab } from "@/components/individual-tax/tax-tools/home-office-tab";
import { CgtTab } from "@/components/individual-tax/tax-tools/cgt-tab";
import { RetirementTab } from "@/components/individual-tax/tax-tools/retirement-tab";
import { fmt } from "@/components/individual-tax/tax-tools/shared";
import { TaxTools } from "@/components/individual-tax/tax-tools";

const rawNormalizer = (text: string) => text;

function renderBothTabs(
  onRenderRental: (id: string, phase: string) => void,
  onRenderHomeOffice: (id: string, phase: string) => void,
) {
  return render(
    <RulePackProvider>
      <TaxToolsSummaryProvider>
        <Profiler id="rental" onRender={onRenderRental}>
          <RentalTab />
        </Profiler>
        <Profiler id="homeoffice" onRender={onRenderHomeOffice}>
          <HomeOfficeTab />
        </Profiler>
      </TaxToolsSummaryProvider>
    </RulePackProvider>,
  );
}

describe("Rental/Home Office render isolation", () => {
  it("does not re-render HomeOfficeTab when typing into RentalTab (Profiler-verified)", async () => {
    const user = userEvent.setup();
    const onRenderRental = vi.fn();
    const onRenderHomeOffice = vi.fn();

    renderBothTabs(onRenderRental, onRenderHomeOffice);

    // Let the initial-mount + summary-publish effects settle before measuring.
    onRenderRental.mockClear();
    onRenderHomeOffice.mockClear();

    const monthlyRent = screen.getByLabelText(/monthly rent \(r\)/i);
    await user.type(monthlyRent, "5");

    expect(onRenderRental).toHaveBeenCalled();
    expect(onRenderHomeOffice).not.toHaveBeenCalled();
  });

  it("preserves verbatim Rental and Home Office output math after extraction", async () => {
    const user = userEvent.setup();

    render(
      <RulePackProvider>
        <TaxToolsSummaryProvider>
          <RentalTab />
          <HomeOfficeTab />
        </TaxToolsSummaryProvider>
      </RulePackProvider>,
    );

    // Rental: gross = 10000 * 12 (default months) = 120000; other = 0; expenses = 1000; net = 119000
    await user.type(screen.getByLabelText(/monthly rent \(r\)/i), "10000");
    await user.type(screen.getByLabelText(/rates & taxes/i), "1000");
    // `fmt` uses en-ZA locale formatting, whose thousands separator is a non-breaking
    // space; disable the default whitespace-collapsing normalizer so the raw NBSP in
    // our expected string is compared against the raw NBSP actually rendered, rather
    // than a collapsed-to-regular-space version of only one side.
    const raw = (text: string) => text;
    expect(
      screen.getAllByText(fmt(119000), { normalizer: raw }).length,
    ).toBeGreaterThan(0);

    // Home Office: ratio = 20/100 = 0.2; shared = 5000+500+300+200 = 6000; direct = 100+50 = 150
    // monthly = 6000*0.2 + 150 = 1350; annual = 1350*12 = 16200; qualifies (default "commission")
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

  it("keeps in-progress Rental input intact across a tab switch away and back (always-mounted CSS-hide)", async () => {
    const user = userEvent.setup();
    render(<TaxTools />);

    // Index [0] is always the persistent top nav button; the shell also renders
    // a duplicate label inside DashboardTab's always-mounted Quick Actions.
    const rentalNav = screen.getAllByRole("button", { name: /rental income/i })[0];
    await user.click(rentalNav);

    const monthlyRent = screen.getByLabelText(/monthly rent \(r\)/i);
    await user.type(monthlyRent, "4321");
    expect(monthlyRent).toHaveValue(4321);

    const homeOfficeNav = screen.getAllByRole("button", { name: /home office/i })[0];
    await user.click(homeOfficeNav);

    const rentalNavAgain = screen.getAllByRole("button", { name: /rental income/i })[0];
    await user.click(rentalNavAgain);

    const monthlyRentAgain = screen.getByLabelText(/monthly rent \(r\)/i);
    expect(monthlyRentAgain).toHaveValue(4321);
  });
});

function renderRetirementAndCgt(
  onRenderRetirement: (id: string, phase: string) => void,
  onRenderCgt: (id: string, phase: string) => void,
) {
  return render(
    <RulePackProvider>
      <TaxToolsSummaryProvider>
        <Profiler id="retirement" onRender={onRenderRetirement}>
          <RetirementTab />
        </Profiler>
        <Profiler id="cgt" onRender={onRenderCgt}>
          <CgtTab />
        </Profiler>
      </TaxToolsSummaryProvider>
    </RulePackProvider>,
  );
}

describe("CGT/Retirement render isolation", () => {
  it("does not re-render CgtTab when typing into RetirementTab (Profiler-verified)", async () => {
    const user = userEvent.setup();
    const onRenderRetirement = vi.fn();
    const onRenderCgt = vi.fn();

    renderRetirementAndCgt(onRenderRetirement, onRenderCgt);

    // Let the initial-mount + summary-publish effects settle before measuring.
    onRenderRetirement.mockClear();
    onRenderCgt.mockClear();

    const income = screen.getByLabelText(/annual remuneration \(r\)/i);
    await user.type(income, "5");

    expect(onRenderRetirement).toHaveBeenCalled();
    expect(onRenderCgt).not.toHaveBeenCalled();
  });

  it("preserves verbatim CGT output math after extraction, reading rates via useRulePack()", async () => {
    const user = userEvent.setup();

    render(
      <RulePackProvider>
        <TaxToolsSummaryProvider>
          <CgtTab />
        </TaxToolsSummaryProvider>
      </RulePackProvider>,
    );

    // gain = 1,000,000 - 400,000 - 50,000 - 20,000 = 530,000
    // exclusion (2026, no primaryRes/death) = rulePack.cgt.annualExclusion = 40,000
    // netGain = 490,000; taxableGain = 490,000 * 0.40 (inclusionRate) = 196,000
    // marginal = getMarginalRate(rulePack, 2,000,000) = 0.45 (top 2026 bracket)
    // cgtPayable = round(196,000 * 0.45) = 88,200
    await user.type(
      screen.getByLabelText(/taxable income \(r\)/i),
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

  it("sources CGT exclusion from the rulepack: switching tax year updates the figure (useRulePack() context proof)", async () => {
    const user = userEvent.setup();
    render(<TaxTools />);

    // Index [0] is the persistent top nav button; DashboardTab's Quick Actions
    // also renders a duplicate-labelled button.
    const cgtNav = screen.getAllByRole("button", { name: /capital gains/i })[0];
    await user.click(cgtNav);

    // Default assessment year is 2026: rulePack.cgt.annualExclusion = 40,000
    expect(
      screen.getAllByText(fmt(40000), { normalizer: rawNormalizer }).length,
    ).toBeGreaterThan(0);

    const yearSelect = screen.getByLabelText(/tax year/i);
    await user.selectOptions(yearSelect, "2027");

    // 2027 rulepack: annualExclusion = 50,000 -- proves the figure is sourced
    // from useRulePack(), not a locally-duplicated constant.
    expect(
      screen.getAllByText(fmt(50000), { normalizer: rawNormalizer }).length,
    ).toBeGreaterThan(0);
  });

  it("still publishes Retirement headroom to the Dashboard after extraction", async () => {
    const user = userEvent.setup();
    render(<TaxTools />);

    const retirementNav = screen.getAllByRole("button", {
      name: /^retirement$/i,
    })[0];
    await user.click(retirementNav);

    await user.type(
      screen.getByLabelText(/annual remuneration \(r\)/i),
      "500000",
    );

    const dashboardNav = screen.getAllByRole("button", {
      name: /^dashboard$/i,
    })[0];
    await user.click(dashboardNav);

    // income 500,000 * 27.5% = 137,500 (below the R350k annual cap), no
    // existing contributions -> headroom = 137,500
    expect(
      screen.getAllByText(fmt(137500), { normalizer: rawNormalizer }).length,
    ).toBeGreaterThan(0);
  });
});
