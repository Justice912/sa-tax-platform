import { Profiler } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RulePackProvider } from "@/components/individual-tax/tax-tools/rulepack-context";
import { TaxToolsSummaryProvider } from "@/components/individual-tax/tax-tools/summary-context";
import { RentalTab } from "@/components/individual-tax/tax-tools/rental-tab";
import { HomeOfficeTab } from "@/components/individual-tax/tax-tools/home-office-tab";
import { fmt } from "@/components/individual-tax/tax-tools/shared";
import { TaxTools } from "@/components/individual-tax/tax-tools";

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
