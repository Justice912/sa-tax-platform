import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LogbookAuditSummaryView } from "@/components/reports/logbook-audit-summary";
import type { LogbookAuditSummary } from "@/modules/logbook/types";

function buildFixture(overrides: Partial<LogbookAuditSummary> = {}): LogbookAuditSummary {
  return {
    clientId: "client_001",
    assessmentYear: 2026,
    vehicle: {
      id: "vehicle-1",
      make: "Toyota",
      model: "Hilux",
      registrationNumber: "GP 111-222",
      costPrice: 400000,
      acquisitionDate: "2023-05-01",
    },
    openingOdometer: 10000,
    closingOdometer: 30000,
    totalKilometres: 20000,
    totalBusinessKm: 15000,
    tripCount: 3,
    trips: [
      {
        id: "trip-1",
        date: "2026-01-10",
        businessKm: 5000,
        fromLocation: "Depot",
        toLocation: "Client A",
        reason: "Site visit",
        odometerStart: 10000,
        odometerEnd: 15000,
        createdAt: "2026-01-10T00:00:00.000Z",
        updatedAt: "2026-01-10T00:00:00.000Z",
      },
      {
        id: "trip-2",
        date: "2026-02-15",
        businessKm: 6000,
        fromLocation: "Depot",
        toLocation: "Client B",
        reason: "Delivery",
        odometerStart: 15000,
        odometerEnd: 21000,
        createdAt: "2026-02-15T00:00:00.000Z",
        updatedAt: "2026-02-15T00:00:00.000Z",
      },
      {
        id: "trip-3",
        date: "2026-03-20",
        businessKm: 4000,
        fromLocation: "Depot",
        toLocation: "Client C",
        reason: "Installation",
        odometerStart: 21000,
        odometerEnd: 25000,
        createdAt: "2026-03-20T00:00:00.000Z",
        updatedAt: "2026-03-20T00:00:00.000Z",
      },
    ],
    travelResult: {
      totalKilometres: 20000,
      businessKilometres: 15000,
      costMethod: "ACTUAL",
      deemedCostDeduction: 55000.42,
      actualCostDeduction: 61234.56,
      claimedDeduction: 61234.56,
      recommendedMethod: "ACTUAL",
      warnings: [],
    },
    generatedAt: "2026-04-01T09:00:00.000Z",
    ...overrides,
  };
}

describe("LogbookAuditSummaryView", () => {
  it("renders vehicle, odometers, every trip, and the deemed/actual result", () => {
    const summary = buildFixture();

    render(<LogbookAuditSummaryView summary={summary} />);

    // Vehicle
    expect(screen.getByText("GP 111-222")).toBeInTheDocument();

    // Odometers -- rendered as en-ZA-formatted numbers
    expect(screen.getAllByText("10 000").length).toBeGreaterThan(0);
    expect(screen.getByText("30 000")).toBeInTheDocument();
    expect(screen.getAllByText("15 000").length).toBeGreaterThan(0);

    // Every trip's date and route
    expect(screen.getByText("2026-01-10")).toBeInTheDocument();
    expect(screen.getByText(/Depot.*Client A/)).toBeInTheDocument();
    expect(screen.getByText("2026-02-15")).toBeInTheDocument();
    expect(screen.getByText(/Depot.*Client B/)).toBeInTheDocument();
    expect(screen.getByText("2026-03-20")).toBeInTheDocument();
    expect(screen.getByText(/Depot.*Client C/)).toBeInTheDocument();

    // Deemed vs actual figures + claimed deduction (exact currency strings, NBSP thousands separator)
    expect(
      screen.getByText("R 55 000,42", { normalizer: (text) => text }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("R 61 234,56", { normalizer: (text) => text }).length,
    ).toBeGreaterThan(0);
  });

  it("shows a not-recorded fallback when closing odometer and actual cost are absent", () => {
    const summary = buildFixture({
      closingOdometer: null,
      totalKilometres: null,
      travelResult: {
        totalKilometres: null,
        businessKilometres: 15000,
        costMethod: "DEEMED",
        deemedCostDeduction: 55000.42,
        actualCostDeduction: null,
        claimedDeduction: 55000.42,
        recommendedMethod: "DEEMED",
        warnings: [{ code: "NO_CLOSING_ODOMETER", message: "Closing odometer not yet recorded." }],
      },
    });

    render(<LogbookAuditSummaryView summary={summary} />);

    expect(screen.getAllByText("Not recorded").length).toBeGreaterThan(0);
    expect(screen.getByText("Not available (incomplete actual-cost data)")).toBeInTheDocument();
    expect(screen.getByText("Closing odometer not yet recorded.")).toBeInTheDocument();
  });
});
