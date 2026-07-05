import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockScrollElementSize } from "@/test/virtualization-test-utils";
import { RulePackProvider } from "@/components/individual-tax/tax-tools/rulepack-context";
import {
  TaxToolsSummaryProvider,
  useSummary,
} from "@/components/individual-tax/tax-tools/summary-context";
import { TravelLogbookTab } from "@/components/individual-tax/tax-tools/travel-logbook-tab";
import { fmt } from "@/components/individual-tax/tax-tools/shared";
import type { ClientRecord } from "@/modules/shared/types";
import type {
  LogbookRecord,
  LogbookTravelResult,
  LogbookTripRecord,
} from "@/modules/logbook/types";
import type { ParsedImportData } from "@/modules/logbook/import/types";

/**
 * Integration proof for the 06-06 keystone: load -> add-trip-updates-real-result -> import ->
 * summary-publish -> CSV export, all crossing the mocked Server Action boundary and returning
 * canned { record, travelResult } states (so no node:fs/worker runs in jsdom -- repository.ts's
 * node:fs import never loads because src/modules/logbook/actions.ts itself is mocked here).
 */
vi.mock("@/modules/logbook/actions", () => ({
  getLogbookForClientAction: vi.fn(),
  createLogbookAction: vi.fn(),
  addTripAction: vi.fn(),
  updateTripAction: vi.fn(),
  deleteTripAction: vi.fn(),
  importTripsAction: vi.fn(),
  setCostMethodAction: vi.fn(),
  setActualExpensesAction: vi.fn(),
  updateOdometersAction: vi.fn(),
  getLogbookCsvAction: vi.fn(),
}));

// The import wizard's file-parsing crosses a Web Worker boundary jsdom cannot provide (matches
// logbook-import-wizard.test.tsx's own convention); detection/mapping/preview stay REAL.
vi.mock("@/modules/logbook/import/import-file", () => ({
  parseImportFile: vi.fn(),
}));

import {
  addTripAction,
  getLogbookCsvAction,
  getLogbookForClientAction,
  importTripsAction,
} from "@/modules/logbook/actions";
import { parseImportFile } from "@/modules/logbook/import/import-file";

const raw = (text: string) => text;

function makeClient(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: "client_1",
    code: "C-0001",
    firmId: "firm_1",
    displayName: "Jane Doe",
    clientType: "INDIVIDUAL",
    status: "ACTIVE",
    ...overrides,
  };
}

function makeLogbookState(
  recordOverrides: Partial<LogbookRecord> = {},
  travelOverrides: Partial<LogbookTravelResult> = {},
): { record: LogbookRecord; travelResult: LogbookTravelResult } {
  const record: LogbookRecord = {
    id: "logbook_1",
    clientId: "client_1",
    assessmentYear: 2026,
    vehicle: {
      id: "vehicle_1",
      make: "Toyota",
      model: "Corolla",
      registrationNumber: "GP 123 456",
      costPrice: 350000,
      acquisitionDate: null,
    },
    openingOdometer: 10000,
    closingOdometer: 20000,
    costMethod: "DEEMED",
    actualExpenses: null,
    trips: [
      {
        id: "trip_1",
        date: "2026-02-01",
        businessKm: 500,
        fromLocation: "Office",
        toLocation: "Client site",
        reason: "Site visit",
        odometerStart: 10000,
        odometerEnd: 10500,
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...recordOverrides,
  };
  const travelResult: LogbookTravelResult = {
    totalKilometres: 10000,
    businessKilometres: 500,
    costMethod: "DEEMED",
    deemedCostDeduction: 45000,
    actualCostDeduction: null,
    claimedDeduction: 45000,
    recommendedMethod: "DEEMED",
    warnings: [],
    ...travelOverrides,
  };
  return { record, travelResult };
}

function renderTab(clients: ClientRecord[] = [makeClient()]) {
  return render(
    <RulePackProvider>
      <TaxToolsSummaryProvider>
        <TravelLogbookTab clients={clients} />
      </TaxToolsSummaryProvider>
    </RulePackProvider>,
  );
}

function SummaryProbe() {
  const summary = useSummary();
  return <div data-testid="travel-deduction-probe">{summary.travelDeduction}</div>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TravelLogbookTab integration (06-06 keystone)", () => {
  it("loads a client's real persisted logbook and renders its trips + cost-method figures", async () => {
    const restore = mockScrollElementSize();
    try {
      const user = userEvent.setup();
      const initial = makeLogbookState();
      vi.mocked(getLogbookForClientAction).mockResolvedValue(initial);

      renderTab();
      await user.selectOptions(screen.getByLabelText(/^client$/i), "client_1");

      await waitFor(() => {
        expect(getLogbookForClientAction).toHaveBeenCalledWith("client_1", 2026);
      });

      // TripTable shows the persisted trip.
      await waitFor(() => {
        expect(screen.getByText("2026-02-01")).toBeInTheDocument();
      });

      // CostMethodPanel shows the real deemed/claimed figure (not stubbed).
      expect(screen.getAllByText(fmt(45000), { normalizer: raw }).length).toBeGreaterThan(0);
    } finally {
      restore();
    }
  });

  it("adding a trip via the modal calls addTripAction and updates the displayed claimed deduction to the real recomputed value", async () => {
    const restore = mockScrollElementSize();
    try {
      const user = userEvent.setup();
      const initial = makeLogbookState();
      const addedTrip: LogbookTripRecord = {
        id: "trip_2",
        date: "2026-03-01",
        businessKm: 300,
        fromLocation: "Office",
        toLocation: "Depot",
        reason: "Delivery",
        odometerStart: null,
        odometerEnd: null,
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
      };
      const afterAdd = makeLogbookState(
        { trips: [...initial.record.trips, addedTrip] },
        { claimedDeduction: 60000, deemedCostDeduction: 60000, businessKilometres: 800 },
      );
      vi.mocked(getLogbookForClientAction).mockResolvedValue(initial);
      vi.mocked(addTripAction).mockResolvedValue(afterAdd);

      renderTab();
      await user.selectOptions(screen.getByLabelText(/^client$/i), "client_1");
      await waitFor(() => expect(screen.getByText("2026-02-01")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: /\+ new trip/i }));
      await user.type(screen.getByLabelText(/business km/i), "300");
      await user.type(screen.getByLabelText(/^from/i), "Office");
      await user.type(screen.getByLabelText(/^to/i), "Depot");
      await user.type(screen.getByLabelText(/^reason/i), "Delivery");
      await user.click(screen.getByRole("button", { name: /^save trip$/i }));

      await waitFor(() => expect(addTripAction).toHaveBeenCalledTimes(1));
      const [logbookId, payload] = vi.mocked(addTripAction).mock.calls[0];
      expect(logbookId).toBe(initial.record.id);
      expect(payload).toMatchObject({
        businessKm: 300,
        fromLocation: "Office",
        toLocation: "Depot",
        reason: "Delivery",
      });

      // Real recomputed claimed deduction (60,000), not a stubbed/unchanged figure.
      await waitFor(() => {
        expect(screen.getAllByText(fmt(60000), { normalizer: raw }).length).toBeGreaterThan(0);
      });
    } finally {
      restore();
    }
  });

  it("committing an import via the wizard calls importTripsAction with the valid trips and source; returned trips appear", async () => {
    const restore = mockScrollElementSize();
    try {
      const user = userEvent.setup();
      const initial = makeLogbookState({ trips: [] });
      const importedTrip: LogbookTripRecord = {
        id: "trip_imported_1",
        date: "2026-01-05",
        businessKm: 120,
        fromLocation: "Office",
        toLocation: "Client Site",
        reason: "Client meeting",
        odometerStart: 10000,
        odometerEnd: 10120,
        createdAt: "2026-01-05T00:00:00.000Z",
        updatedAt: "2026-01-05T00:00:00.000Z",
      };
      const afterImport = makeLogbookState({ trips: [importedTrip] });
      vi.mocked(getLogbookForClientAction).mockResolvedValue(initial);
      vi.mocked(importTripsAction).mockResolvedValue(afterImport);

      const parsed: ParsedImportData = {
        headers: [
          "Date",
          "Total Business Km",
          "From",
          "To",
          "Reason",
          "*Opening Km",
          "*Closing Km",
        ],
        rows: [
          {
            Date: "2026-01-05",
            "Total Business Km": "120",
            From: "Office",
            To: "Client Site",
            Reason: "Client meeting",
            "*Opening Km": "10000",
            "*Closing Km": "10120",
          },
        ],
        errors: [],
      };
      vi.mocked(parseImportFile).mockResolvedValue(parsed);

      renderTab();
      await user.selectOptions(screen.getByLabelText(/^client$/i), "client_1");
      await waitFor(() => expect(getLogbookForClientAction).toHaveBeenCalled());

      await user.click(screen.getByRole("button", { name: /\+ import/i }));
      await user.upload(
        screen.getByLabelText(/select logbook file/i),
        new File(["irrelevant -- parseImportFile is mocked"], "trips.csv", { type: "text/csv" }),
      );

      await waitFor(() => {
        expect(screen.getByText(/sars elogbook detected/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /^next$/i }));

      await waitFor(() => {
        expect(screen.getByText(/^valid:\s*1$/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: /import 1 valid trips/i }));

      await waitFor(() => expect(importTripsAction).toHaveBeenCalledTimes(1));
      const [logbookId, validTrips, source] = vi.mocked(importTripsAction).mock.calls[0];
      expect(logbookId).toBe(initial.record.id);
      expect(source).toBe("CSV");
      expect(validTrips).toHaveLength(1);

      await waitFor(() => {
        expect(screen.getByText("2026-01-05")).toBeInTheDocument();
      });
    } finally {
      restore();
    }
  });

  it("publishes the real claimed deduction to the Dashboard summary", async () => {
    const restore = mockScrollElementSize();
    try {
      const user = userEvent.setup();
      const initial = makeLogbookState({}, { claimedDeduction: 45000 });
      vi.mocked(getLogbookForClientAction).mockResolvedValue(initial);

      render(
        <RulePackProvider>
          <TaxToolsSummaryProvider>
            <TravelLogbookTab clients={[makeClient()]} />
            <SummaryProbe />
          </TaxToolsSummaryProvider>
        </RulePackProvider>,
      );

      await user.selectOptions(screen.getByLabelText(/^client$/i), "client_1");

      await waitFor(() => {
        expect(screen.getByTestId("travel-deduction-probe").textContent).toBe("45000");
      });
    } finally {
      restore();
    }
  });

  it("Export CSV button triggers getLogbookCsvAction", async () => {
    const restore = mockScrollElementSize();
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    try {
      const user = userEvent.setup();
      const initial = makeLogbookState();
      vi.mocked(getLogbookForClientAction).mockResolvedValue(initial);
      vi.mocked(getLogbookCsvAction).mockResolvedValue(
        "Date,From,To\n2026-02-01,Office,Client site\n",
      );

      renderTab();
      await user.selectOptions(screen.getByLabelText(/^client$/i), "client_1");
      await waitFor(() => expect(screen.getByText("2026-02-01")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: /export csv/i }));

      await waitFor(() => {
        expect(getLogbookCsvAction).toHaveBeenCalledWith(initial.record.id);
      });
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      restore();
    }
  });
});
