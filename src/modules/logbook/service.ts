import { getClientById } from "@/modules/clients/client-service";
import { getIndividualTaxRulePackByYear } from "@/modules/individual-tax/rulepack-registry";
import { writeAuditLog } from "@/modules/audit/audit-writer";
import { buildTravelResult } from "@/modules/logbook/calculation";
import { buildLogbookAuditSummary, exportLogbookToCsv } from "@/modules/logbook/export";
import { logbookRepository } from "@/modules/logbook/repository";
import type {
  ActualCostExpenses,
  LogbookAuditSummary,
  LogbookCostMethod,
  LogbookRecord,
  VehicleDetails,
  LogbookTravelResult,
} from "@/modules/logbook/types";
import {
  actualExpensesSchema,
  logbookCreateSchema,
  tripInputSchema,
  tripPatchSchema,
  updateOdometersSchema,
  validateOdometerContinuity,
} from "@/modules/logbook/validation";
import type { OdometerContinuityTripInput } from "@/modules/logbook/validation";

export interface CreateLogbookForClientInput {
  clientId: string;
  assessmentYear: number;
  vehicle: Omit<VehicleDetails, "id">;
  openingOdometer: number;
  closingOdometer?: number | null;
}

type ContinuitySourceTrip = {
  date: string;
  businessKm: number;
  odometerStart?: number | null;
  odometerEnd?: number | null;
};

function toContinuityTrip(trip: ContinuitySourceTrip): OdometerContinuityTripInput {
  return {
    date: trip.date,
    businessKm: trip.businessKm,
    odometerStart: trip.odometerStart ?? null,
    odometerEnd: trip.odometerEnd ?? null,
  };
}

/** Pitfall-2 gate: continuity is enforced here at the service boundary so Phase 4's import
    pipeline reuses this exact function instead of re-implementing the checks. */
function assertOdometerContinuity(
  odometers: { openingOdometer: number; closingOdometer: number | null },
  trips: OdometerContinuityTripInput[],
): void {
  const { errors } = validateOdometerContinuity({ ...odometers, trips });
  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join(" "));
  }
}

async function loadLogbookOrThrow(logbookId: string): Promise<LogbookRecord> {
  const record = await logbookRepository.getLogbookById(logbookId);
  if (!record) {
    throw new Error("Logbook not found.");
  }
  return record;
}

/** Resolves the rulepack by the logbook's OWN assessmentYear — never the current date or trip
    dates (Pitfall 4) — and computes both SARS methods side-by-side (LOG-05). */
function computeTravelResult(record: LogbookRecord): LogbookTravelResult {
  const table = getIndividualTaxRulePackByYear(record.assessmentYear).travelDeemedCostTable;

  const totalKm =
    record.closingOdometer !== null ? record.closingOdometer - record.openingOdometer : null;
  const businessKm = record.trips.reduce((sum, trip) => sum + trip.businessKm, 0);

  const result = buildTravelResult(
    {
      businessKm,
      totalKm,
      costMethod: record.costMethod,
      vehicleCostPrice: record.vehicle.costPrice,
      actualExpenses: record.actualExpenses,
    },
    table,
  );

  const { warnings: continuityWarnings } = validateOdometerContinuity({
    openingOdometer: record.openingOdometer,
    closingOdometer: record.closingOdometer,
    trips: record.trips.map(toContinuityTrip),
  });

  return { ...result, warnings: [...result.warnings, ...continuityWarnings] };
}

export async function createLogbookForClient(
  input: CreateLogbookForClientInput,
): Promise<LogbookRecord> {
  const parsed = logbookCreateSchema.parse(input);

  const client = await getClientById(parsed.clientId);
  if (!client) {
    throw new Error("Client not found.");
  }

  const created = await logbookRepository.createLogbook(parsed);

  await writeAuditLog({
    action: "LOGBOOK_CREATED",
    entityType: "Logbook",
    entityId: created.id,
    summary: `Created ${created.assessmentYear} travel logbook for ${created.vehicle.make} ${created.vehicle.model} (${created.vehicle.registrationNumber}).`,
    afterData: {
      clientId: created.clientId,
      assessmentYear: created.assessmentYear,
      registrationNumber: created.vehicle.registrationNumber,
    },
  });

  return created;
}

export async function getLogbookForClientYear(
  clientId: string,
  assessmentYear: number,
): Promise<LogbookRecord | null> {
  return logbookRepository.getLogbookByClientAndYear(clientId, assessmentYear);
}

export async function listLogbooksForClient(clientId: string): Promise<LogbookRecord[]> {
  return logbookRepository.listLogbooksByClient(clientId);
}

export async function addTripToLogbook(
  logbookId: string,
  trip: unknown,
): Promise<LogbookRecord> {
  const parsedTrip = tripInputSchema.parse(trip);
  const record = await loadLogbookOrThrow(logbookId);

  const prospectiveTrips = [...record.trips.map(toContinuityTrip), toContinuityTrip(parsedTrip)];
  assertOdometerContinuity(
    { openingOdometer: record.openingOdometer, closingOdometer: record.closingOdometer },
    prospectiveTrips,
  );

  const updated = await logbookRepository.addTrip(logbookId, {
    date: parsedTrip.date,
    businessKm: parsedTrip.businessKm,
    fromLocation: parsedTrip.fromLocation,
    toLocation: parsedTrip.toLocation,
    reason: parsedTrip.reason,
    odometerStart: parsedTrip.odometerStart ?? null,
    odometerEnd: parsedTrip.odometerEnd ?? null,
  });

  await writeAuditLog({
    action: "LOGBOOK_TRIP_ADDED",
    entityType: "Logbook",
    entityId: logbookId,
    summary: `Added trip on ${parsedTrip.date} (${parsedTrip.businessKm} business km) to the ${record.assessmentYear} logbook.`,
    afterData: { date: parsedTrip.date, businessKm: parsedTrip.businessKm },
  });

  return updated;
}

export async function updateLogbookTrip(
  logbookId: string,
  tripId: string,
  patch: unknown,
): Promise<LogbookRecord> {
  const parsedPatch = tripPatchSchema.parse(patch);
  const record = await loadLogbookOrThrow(logbookId);

  const existingTrip = record.trips.find((trip) => trip.id === tripId);
  if (!existingTrip) {
    throw new Error("Trip not found.");
  }

  const mergedTrips = record.trips.map((trip) =>
    trip.id === tripId ? { ...trip, ...parsedPatch } : trip,
  );
  assertOdometerContinuity(
    { openingOdometer: record.openingOdometer, closingOdometer: record.closingOdometer },
    mergedTrips.map(toContinuityTrip),
  );

  const updated = await logbookRepository.updateTrip(logbookId, tripId, parsedPatch);

  await writeAuditLog({
    action: "LOGBOOK_TRIP_UPDATED",
    entityType: "Logbook",
    entityId: logbookId,
    summary: `Updated trip on ${existingTrip.date} in the ${record.assessmentYear} logbook.`,
    beforeData: toContinuityTrip(existingTrip),
    afterData: parsedPatch,
  });

  return updated;
}

export async function deleteLogbookTrip(
  logbookId: string,
  tripId: string,
): Promise<LogbookRecord> {
  const record = await loadLogbookOrThrow(logbookId);
  const existingTrip = record.trips.find((trip) => trip.id === tripId);
  if (!existingTrip) {
    throw new Error("Trip not found.");
  }

  const updated = await logbookRepository.deleteTrip(logbookId, tripId);

  await writeAuditLog({
    action: "LOGBOOK_TRIP_DELETED",
    entityType: "Logbook",
    entityId: logbookId,
    summary: `Deleted trip on ${existingTrip.date} from the ${record.assessmentYear} logbook.`,
    beforeData: toContinuityTrip(existingTrip),
  });

  return updated;
}

export async function updateLogbookOdometers(
  logbookId: string,
  odometers: unknown,
): Promise<LogbookRecord> {
  const parsed = updateOdometersSchema.parse(odometers);
  const record = await loadLogbookOrThrow(logbookId);

  assertOdometerContinuity(
    { openingOdometer: parsed.openingOdometer, closingOdometer: parsed.closingOdometer ?? null },
    record.trips.map(toContinuityTrip),
  );

  const updated = await logbookRepository.updateOdometers(logbookId, {
    openingOdometer: parsed.openingOdometer,
    closingOdometer: parsed.closingOdometer ?? null,
  });

  await writeAuditLog({
    action: "LOGBOOK_ODOMETERS_UPDATED",
    entityType: "Logbook",
    entityId: logbookId,
    summary: `Updated odometer readings for the ${record.assessmentYear} logbook.`,
    beforeData: {
      openingOdometer: record.openingOdometer,
      closingOdometer: record.closingOdometer,
    },
    afterData: {
      openingOdometer: parsed.openingOdometer,
      closingOdometer: parsed.closingOdometer ?? null,
    },
  });

  return updated;
}

/** The election is the ONLY thing that ever changes which method is claimed (Pitfall 1) —
    presence of actualExpenses never overrides it. */
export async function setLogbookCostMethod(
  logbookId: string,
  costMethod: LogbookCostMethod,
): Promise<LogbookRecord> {
  const record = await loadLogbookOrThrow(logbookId);

  if (costMethod === "ACTUAL" && record.actualExpenses === null) {
    throw new Error("Capture actual expenses before electing the actual-cost method.");
  }

  const updated = await logbookRepository.setCostMethod(logbookId, costMethod);

  await writeAuditLog({
    action: "LOGBOOK_COST_METHOD_SET",
    entityType: "Logbook",
    entityId: logbookId,
    summary: `Elected the ${costMethod === "ACTUAL" ? "actual-cost" : "deemed-cost"} method for the ${record.assessmentYear} logbook.`,
    beforeData: { costMethod: record.costMethod },
    afterData: { costMethod },
  });

  return updated;
}

export async function setLogbookActualExpenses(
  logbookId: string,
  expenses: unknown,
): Promise<LogbookRecord> {
  const record = await loadLogbookOrThrow(logbookId);

  const parsedExpenses: ActualCostExpenses | null =
    expenses === null ? null : actualExpensesSchema.parse(expenses);

  if (parsedExpenses === null && record.costMethod === "ACTUAL") {
    throw new Error("Cannot clear actual expenses while the actual-cost method is elected.");
  }

  const updated = await logbookRepository.setActualExpenses(logbookId, parsedExpenses);

  await writeAuditLog({
    action: "LOGBOOK_ACTUAL_EXPENSES_SET",
    entityType: "Logbook",
    entityId: logbookId,
    summary:
      parsedExpenses === null
        ? `Cleared actual vehicle expenses for the ${record.assessmentYear} logbook.`
        : `Captured actual vehicle expenses for the ${record.assessmentYear} logbook.`,
    afterData: parsedExpenses,
  });

  return updated;
}

/** The LOG-05 surface: one call returns the side-by-side deemed/actual comparison and the
    claim following the elected method (never a data-presence fallback chain). */
export async function getLogbookTravelResult(logbookId: string): Promise<LogbookTravelResult> {
  const record = await loadLogbookOrThrow(logbookId);
  return computeTravelResult(record);
}

export async function getLogbookCsv(logbookId: string): Promise<string> {
  const record = await loadLogbookOrThrow(logbookId);
  return exportLogbookToCsv(record);
}

export async function getLogbookAuditSummary(logbookId: string): Promise<LogbookAuditSummary> {
  const record = await loadLogbookOrThrow(logbookId);
  return buildLogbookAuditSummary(record, computeTravelResult(record));
}
