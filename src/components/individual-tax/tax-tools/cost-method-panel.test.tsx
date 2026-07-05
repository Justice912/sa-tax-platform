import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CostMethodPanel } from "@/components/individual-tax/tax-tools/cost-method-panel";
import { fmt } from "@/components/individual-tax/tax-tools/shared";
import type {
  ActualCostExpenses,
  LogbookRecord,
  LogbookTravelResult,
  VehicleDetails,
} from "@/modules/logbook/types";

// `fmt` uses en-ZA locale formatting, whose thousands separator is a
// non-breaking space; disable the default whitespace-collapsing normalizer
// so exact-string assertions compare the raw NBSP actually rendered against
// the raw NBSP produced by `fmt` (same trick as render-isolation.test.tsx).
const raw = (text: string) => text;

const vehicle: VehicleDetails = {
  id: "veh-1",
  make: "Toyota",
  model: "Corolla",
  registrationNumber: "CA 123-456",
  costPrice: 350000,
  acquisitionDate: "2024-01-15",
};

const actualExpenses: ActualCostExpenses = {
  fuel: 20000,
  maintenance: 8000,
  insurance: 6000,
  licence: 1000,
  financeCharges: 15000,
};

function makeRecord(overrides: Partial<LogbookRecord> = {}): LogbookRecord {
  return {
    id: "log-1",
    clientId: "client-1",
    assessmentYear: 2026,
    vehicle,
    openingOdometer: 10000,
    closingOdometer: 30000,
    costMethod: "DEEMED",
    actualExpenses: null,
    trips: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeTravelResult(
  overrides: Partial<LogbookTravelResult> = {},
): LogbookTravelResult {
  return {
    totalKilometres: 20000,
    businessKilometres: 15000,
    costMethod: "DEEMED",
    deemedCostDeduction: 88200,
    actualCostDeduction: null,
    claimedDeduction: 88200,
    recommendedMethod: "DEEMED",
    warnings: [],
    ...overrides,
  };
}

describe("CostMethodPanel", () => {
  it("renders real deemed, actual, and claimed figures side by side", () => {
    const record = makeRecord({ actualExpenses });
    const travelResult = makeTravelResult({
      actualCostDeduction: 95000,
      recommendedMethod: "ACTUAL",
      claimedDeduction: 88200,
    });

    render(
      <CostMethodPanel
        record={record}
        travelResult={travelResult}
        onElectMethod={vi.fn()}
        onSaveExpenses={vi.fn()}
      />,
    );

    expect(
      screen.getAllByText(fmt(88200), { normalizer: raw }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(fmt(95000), { normalizer: raw }).length,
    ).toBeGreaterThan(0);
  });

  it("visually marks the recommended (higher) method", () => {
    const record = makeRecord({ actualExpenses });
    const travelResult = makeTravelResult({
      actualCostDeduction: 95000,
      recommendedMethod: "ACTUAL",
    });

    render(
      <CostMethodPanel
        record={record}
        travelResult={travelResult}
        onElectMethod={vi.fn()}
        onSaveExpenses={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/actual cost \(recommended\)/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/deemed cost \(recommended\)/i),
    ).not.toBeInTheDocument();
  });

  it("shows a capture-expenses placeholder when actual cost is not yet computable", () => {
    const record = makeRecord();
    const travelResult = makeTravelResult();

    render(
      <CostMethodPanel
        record={record}
        travelResult={travelResult}
        onElectMethod={vi.fn()}
        onSaveExpenses={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/capture expenses to compute/i),
    ).toBeInTheDocument();
  });

  it(
    "elects ACTUAL and calls onElectMethod when expenses are already captured",
    async () => {
      const user = userEvent.setup();
      const onElectMethod = vi.fn().mockResolvedValue(undefined);
      const record = makeRecord({ actualExpenses });
      const travelResult = makeTravelResult({ actualCostDeduction: 95000 });

      render(
        <CostMethodPanel
          record={record}
          travelResult={travelResult}
          onElectMethod={onElectMethod}
          onSaveExpenses={vi.fn()}
        />,
      );

      await user.click(
        screen.getByRole("button", { name: /elect actual cost/i }),
      );
      expect(onElectMethod).toHaveBeenCalledWith("ACTUAL");
    },
    15000,
  );

  it(
    "guards the ACTUAL election when actualExpenses is null (does not call the callback)",
    async () => {
      const user = userEvent.setup();
      const onElectMethod = vi.fn();
      const record = makeRecord({ actualExpenses: null });
      const travelResult = makeTravelResult({ actualCostDeduction: null });

      render(
        <CostMethodPanel
          record={record}
          travelResult={travelResult}
          onElectMethod={onElectMethod}
          onSaveExpenses={vi.fn()}
        />,
      );

      const actualButton = screen.getByRole("button", {
        name: /elect actual cost/i,
      });
      expect(actualButton).toBeDisabled();
      await user.click(actualButton);
      expect(onElectMethod).not.toHaveBeenCalled();
      expect(
        screen.getByText(
          /capture actual expenses before electing the actual-cost method/i,
        ),
      ).toBeInTheDocument();
    },
    15000,
  );

  it(
    "enables Save only once all five expense fields are present and calls onSaveExpenses with the numeric object",
    async () => {
      const user = userEvent.setup();
      const onSaveExpenses = vi.fn().mockResolvedValue(undefined);
      const record = makeRecord();
      const travelResult = makeTravelResult();

      render(
        <CostMethodPanel
          record={record}
          travelResult={travelResult}
          onElectMethod={vi.fn()}
          onSaveExpenses={onSaveExpenses}
        />,
      );

      const saveButton = screen.getByRole("button", {
        name: /save expenses/i,
      });
      expect(saveButton).toBeDisabled();

      await user.type(screen.getByLabelText(/fuel/i), "20000");
      await user.type(screen.getByLabelText(/maintenance/i), "8000");
      await user.type(screen.getByLabelText(/insurance/i), "6000");
      await user.type(screen.getByLabelText(/licence/i), "1000");
      expect(saveButton).toBeDisabled();
      await user.type(screen.getByLabelText(/finance charges/i), "15000");

      expect(saveButton).not.toBeDisabled();
      await user.click(saveButton);

      expect(onSaveExpenses).toHaveBeenCalledWith({
        fuel: 20000,
        maintenance: 8000,
        insurance: 6000,
        licence: 1000,
        financeCharges: 15000,
      });
    },
    15000,
  );

  it("renders warnings when present", () => {
    const record = makeRecord();
    const travelResult = makeTravelResult({
      warnings: [
        {
          code: "CLOSING_ODOMETER_MISSING",
          message: "Closing odometer not yet recorded.",
        },
      ],
    });

    render(
      <CostMethodPanel
        record={record}
        travelResult={travelResult}
        onElectMethod={vi.fn()}
        onSaveExpenses={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/closing odometer not yet recorded/i),
    ).toBeInTheDocument();
  });
});
