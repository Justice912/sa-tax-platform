"use server";

import {
  addTripToLogbook,
  createLogbookForClient,
  deleteLogbookTrip,
  getLogbookCsv,
  getLogbookForClientYear,
  getLogbookTravelResult,
  importTripsToLogbook,
  setLogbookActualExpenses,
  setLogbookCostMethod,
  updateLogbookOdometers,
  updateLogbookTrip,
} from "@/modules/logbook/service";
import type { CreateLogbookForClientInput } from "@/modules/logbook/service";
import type { LogbookCostMethod, LogbookRecord, LogbookTravelResult } from "@/modules/logbook/types";

/**
 * Server Action boundary for the client "use client" travel-logbook tab.
 *
 * repository.ts imports node:fs, so service.ts is server-only and cannot be imported directly
 * into a client component. Every mutation crosses this boundary and returns BOTH the updated
 * record and the freshly recomputed travel result in one round trip -- the client never
 * re-derives deemed/actual cost math itself (research Pitfall 3), and we never revalidatePath +
 * refetch, which would be too slow at 10,000-trip scale for a single-trip edit (research
 * Pattern 2 / Pitfall 2).
 */
export interface LogbookState {
  record: LogbookRecord;
  travelResult: LogbookTravelResult;
}

export async function getLogbookForClientAction(
  clientId: string,
  assessmentYear: number,
): Promise<LogbookState | null> {
  const record = await getLogbookForClientYear(clientId, assessmentYear);
  if (!record) {
    return null;
  }
  const travelResult = await getLogbookTravelResult(record.id);
  return { record, travelResult };
}

export async function createLogbookAction(
  input: CreateLogbookForClientInput,
): Promise<LogbookState> {
  const record = await createLogbookForClient(input);
  const travelResult = await getLogbookTravelResult(record.id);
  return { record, travelResult };
}

export async function addTripAction(logbookId: string, trip: unknown): Promise<LogbookState> {
  const record = await addTripToLogbook(logbookId, trip);
  const travelResult = await getLogbookTravelResult(record.id);
  return { record, travelResult };
}

export async function updateTripAction(
  logbookId: string,
  tripId: string,
  patch: unknown,
): Promise<LogbookState> {
  const record = await updateLogbookTrip(logbookId, tripId, patch);
  const travelResult = await getLogbookTravelResult(record.id);
  return { record, travelResult };
}

export async function deleteTripAction(logbookId: string, tripId: string): Promise<LogbookState> {
  const record = await deleteLogbookTrip(logbookId, tripId);
  const travelResult = await getLogbookTravelResult(record.id);
  return { record, travelResult };
}

export async function importTripsAction(
  logbookId: string,
  trips: unknown,
  source: "CSV" | "XLSX",
): Promise<LogbookState> {
  const record = await importTripsToLogbook(logbookId, trips, source);
  const travelResult = await getLogbookTravelResult(record.id);
  return { record, travelResult };
}

export async function setCostMethodAction(
  logbookId: string,
  method: LogbookCostMethod,
): Promise<LogbookState> {
  const record = await setLogbookCostMethod(logbookId, method);
  const travelResult = await getLogbookTravelResult(record.id);
  return { record, travelResult };
}

export async function setActualExpensesAction(
  logbookId: string,
  expenses: unknown,
): Promise<LogbookState> {
  const record = await setLogbookActualExpenses(logbookId, expenses);
  const travelResult = await getLogbookTravelResult(record.id);
  return { record, travelResult };
}

export async function updateOdometersAction(
  logbookId: string,
  odometers: unknown,
): Promise<LogbookState> {
  const record = await updateLogbookOdometers(logbookId, odometers);
  const travelResult = await getLogbookTravelResult(record.id);
  return { record, travelResult };
}

/** For the client-side Blob download button -- CSV export never needs the travel result. */
export async function getLogbookCsvAction(logbookId: string): Promise<string> {
  return getLogbookCsv(logbookId);
}
