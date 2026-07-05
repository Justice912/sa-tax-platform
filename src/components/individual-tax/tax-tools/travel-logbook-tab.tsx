"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Field,
  fmtKm,
  inputCls,
  selectCls,
} from "@/components/individual-tax/tax-tools/shared";
import { useRulePack } from "@/components/individual-tax/tax-tools/rulepack-context";
import { useSummaryWriter } from "@/components/individual-tax/tax-tools/summary-context";
import { TripTable } from "@/components/individual-tax/tax-tools/trip-table";
import { CostMethodPanel } from "@/components/individual-tax/tax-tools/cost-method-panel";
import { LogbookImportWizard } from "@/components/individual-tax/tax-tools/logbook-import-wizard";
import {
  addTripAction,
  createLogbookAction,
  deleteTripAction,
  getLogbookCsvAction,
  getLogbookForClientAction,
  importTripsAction,
  setActualExpensesAction,
  setCostMethodAction,
  updateOdometersAction,
  updateTripAction,
} from "@/modules/logbook/actions";
import type { LogbookState } from "@/modules/logbook/actions";
import type {
  ActualCostExpenses,
  LogbookCostMethod,
  LogbookTripRecord,
} from "@/modules/logbook/types";
import type { ImportRowResult } from "@/modules/logbook/import/types";
import type { ClientRecord } from "@/modules/shared/types";

/**
 * Wiring container assembling the three previously-isolated systems (persisted logbook
 * domain, Phase 4 import pipeline, Phase 5 decomposed UI) into one working travel-logbook
 * feature. Resolves a client + tax year, loads the REAL persisted logbook via Server
 * Actions, and orchestrates TripTable / CostMethodPanel / LogbookImportWizard. Every
 * mutation crosses `src/modules/logbook/actions.ts` and returns `{ record, travelResult }`
 * merged directly into local state -- no client-side cost math, no revalidatePath-per-edit,
 * no naive FileReader/.split(",") parser (06-RESEARCH.md Pitfalls 1-3).
 */

interface TripFormState {
  date: string;
  businessKm: string;
  fromLocation: string;
  toLocation: string;
  reason: string;
  odometerStart: string;
  odometerEnd: string;
}

function emptyTripForm(): TripFormState {
  return {
    date: new Date().toISOString().slice(0, 10),
    businessKm: "",
    fromLocation: "",
    toLocation: "",
    reason: "",
    odometerStart: "",
    odometerEnd: "",
  };
}

interface CreateFormState {
  make: string;
  model: string;
  registrationNumber: string;
  costPrice: string;
  openingOdometer: string;
  closingOdometer: string;
}

const EMPTY_CREATE_FORM: CreateFormState = {
  make: "",
  model: "",
  registrationNumber: "",
  costPrice: "",
  openingOdometer: "",
  closingOdometer: "",
};

interface OdometerFormState {
  openingOdometer: string;
  closingOdometer: string;
}

export function TravelLogbookTab({
  clients = [],
}: {
  clients?: ClientRecord[];
}) {
  const { assessmentYear } = useRulePack();
  const setSummaryValue = useSummaryWriter();

  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [state, setState] = useState<LogbookState | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE_FORM);
  const [tripForm, setTripForm] = useState<TripFormState | null>(null);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [odometerForm, setOdometerForm] = useState<OdometerFormState | null>(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const notify = useCallback(
    (msg: string, type: "success" | "error" = "success") =>
      setToast({ msg, type }),
    [],
  );

  // Load (or clear) the logbook whenever the client or tax year changes. With no client
  // selected this fires NO Server Action -- the shell stays renderable without a round trip.
  useEffect(() => {
    if (!selectedClientId) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState(null);
    setLoading(true);
    getLogbookForClientAction(selectedClientId, assessmentYear)
      .then((result) => {
        if (cancelled) return;
        setState(result);
        setCreateForm(EMPTY_CREATE_FORM);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        notify(
          error instanceof Error ? error.message : "Failed to load logbook.",
          "error",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClientId, assessmentYear, notify]);

  // Re-seed the local odometer editor whenever the server-confirmed odometers change
  // (mirrors CostMethodPanel's own actualExpenses re-seed pattern).
  useEffect(() => {
    if (!state) {
      setOdometerForm(null);
      return;
    }
    setOdometerForm({
      openingOdometer: String(state.record.openingOdometer),
      closingOdometer:
        state.record.closingOdometer != null
          ? String(state.record.closingOdometer)
          : "",
    });
  }, [state]);

  // Publish the real claimed deduction to the Dashboard (write-only; stable setter).
  useEffect(() => {
    setSummaryValue("travelDeduction", state?.travelResult.claimedDeduction ?? 0);
  }, [state, setSummaryValue]);

  // Generic mutation helper: every mutation goes through this so a single edit never
  // refetches the whole page and never re-derives cost math client-side.
  const applyAction = useCallback(
    async (mutate: () => Promise<LogbookState>) => {
      setBusy(true);
      try {
        const result = await mutate();
        setState(result);
        return result;
      } catch (error) {
        notify(
          error instanceof Error ? error.message : "Something went wrong.",
          "error",
        );
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [notify],
  );

  const handleEditTrip = useCallback((trip: LogbookTripRecord) => {
    setEditingTripId(trip.id);
    setTripForm({
      date: trip.date,
      businessKm: String(trip.businessKm),
      fromLocation: trip.fromLocation,
      toLocation: trip.toLocation,
      reason: trip.reason,
      odometerStart: trip.odometerStart != null ? String(trip.odometerStart) : "",
      odometerEnd: trip.odometerEnd != null ? String(trip.odometerEnd) : "",
    });
  }, []);

  const handleDeleteTrip = useCallback(
    async (tripId: string) => {
      if (!state) return;
      try {
        await applyAction(() => deleteTripAction(state.record.id, tripId));
        notify("Trip deleted");
      } catch {
        // already toasted by applyAction
      }
    },
    [state, applyAction, notify],
  );

  const handleElectMethod = useCallback(
    async (method: LogbookCostMethod) => {
      if (!state) return;
      try {
        await applyAction(() => setCostMethodAction(state.record.id, method));
      } catch {
        // already toasted by applyAction
      }
    },
    [state, applyAction],
  );

  const handleSaveExpenses = useCallback(
    async (expenses: ActualCostExpenses | null) => {
      if (!state) return;
      try {
        await applyAction(() => setActualExpensesAction(state.record.id, expenses));
      } catch {
        // already toasted by applyAction
      }
    },
    [state, applyAction],
  );

  const handleImportCommit = useCallback(
    async (validTrips: ImportRowResult["trip"][], source: "CSV" | "XLSX") => {
      if (!state) return;
      await applyAction(() => importTripsAction(state.record.id, validTrips, source));
    },
    [state, applyAction],
  );

  async function handleCreateLogbook() {
    if (!selectedClientId) return;
    if (
      !createForm.make.trim() ||
      !createForm.model.trim() ||
      !createForm.registrationNumber.trim()
    ) {
      notify("Vehicle make, model and registration are required.", "error");
      return;
    }
    const costPrice = parseFloat(createForm.costPrice);
    if (!Number.isFinite(costPrice) || costPrice <= 0) {
      notify("A valid vehicle cost price is required.", "error");
      return;
    }
    const openingOdometer = parseFloat(createForm.openingOdometer);
    if (!Number.isFinite(openingOdometer) || openingOdometer < 0) {
      notify("A valid opening odometer reading is required.", "error");
      return;
    }
    const closingOdometer =
      createForm.closingOdometer.trim() === ""
        ? null
        : parseFloat(createForm.closingOdometer);

    setBusy(true);
    try {
      const result = await createLogbookAction({
        clientId: selectedClientId,
        assessmentYear,
        vehicle: {
          make: createForm.make.trim(),
          model: createForm.model.trim(),
          registrationNumber: createForm.registrationNumber.trim(),
          costPrice,
          acquisitionDate: null,
        },
        openingOdometer,
        closingOdometer,
      });
      setState(result);
      notify("Logbook created");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Failed to create logbook.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTrip() {
    if (!state || !tripForm) return;
    const businessKm = parseFloat(tripForm.businessKm);
    if (!tripForm.date || !Number.isFinite(businessKm) || businessKm <= 0) {
      notify("Date and a positive business KM are required.", "error");
      return;
    }
    if (
      !tripForm.fromLocation.trim() ||
      !tripForm.toLocation.trim() ||
      !tripForm.reason.trim()
    ) {
      notify("From, To and Reason are required.", "error");
      return;
    }
    const payload = {
      date: tripForm.date,
      businessKm,
      fromLocation: tripForm.fromLocation.trim(),
      toLocation: tripForm.toLocation.trim(),
      reason: tripForm.reason.trim(),
      odometerStart:
        tripForm.odometerStart.trim() === "" ? null : parseFloat(tripForm.odometerStart),
      odometerEnd:
        tripForm.odometerEnd.trim() === "" ? null : parseFloat(tripForm.odometerEnd),
    };
    try {
      if (editingTripId) {
        await applyAction(() => updateTripAction(state.record.id, editingTripId, payload));
        notify("Trip updated");
      } else {
        await applyAction(() => addTripAction(state.record.id, payload));
        notify("Trip added");
      }
      setTripForm(null);
      setEditingTripId(null);
    } catch {
      // already toasted by applyAction
    }
  }

  async function handleSaveOdometers() {
    if (!state || !odometerForm) return;
    const openingOdometer = parseFloat(odometerForm.openingOdometer);
    if (!Number.isFinite(openingOdometer) || openingOdometer < 0) {
      notify("A valid opening odometer reading is required.", "error");
      return;
    }
    const closingOdometer =
      odometerForm.closingOdometer.trim() === ""
        ? null
        : parseFloat(odometerForm.closingOdometer);
    try {
      await applyAction(() =>
        updateOdometersAction(state.record.id, { openingOdometer, closingOdometer }),
      );
      notify("Odometer readings updated");
    } catch {
      // already toasted by applyAction
    }
  }

  async function handleExportCsv() {
    if (!state) return;
    try {
      const csv = await getLogbookCsvAction(state.record.id);
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `logbook_${state.record.assessmentYear}_${state.record.vehicle.registrationNumber}.csv`;
      a.click();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Failed to export CSV.",
        "error",
      );
    }
  }

  return (
    <>
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === "error" ? "bg-red-700" : "bg-teal-700"}`}
        >
          {toast.msg}
        </div>
      )}

      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Travel Logbook</h2>
            <p className="text-sm text-slate-500">
              SARS-compliant &bull; persisted per client and tax year
            </p>
          </div>
          {state && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-teal-300 hover:text-teal-700"
                onClick={handleExportCsv}
                disabled={busy}
              >
                Export CSV
              </button>
              <a
                href={`/reports/logbook/${state.record.id}/print`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-teal-300 hover:text-teal-700"
              >
                Print / audit summary
              </a>
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-teal-300 hover:text-teal-700"
                onClick={() => setImportOpen(true)}
                disabled={busy}
              >
                + Import
              </button>
              <button
                type="button"
                className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white hover:bg-[#12344a] disabled:opacity-50"
                onClick={() => {
                  setEditingTripId(null);
                  setTripForm(emptyTripForm());
                }}
                disabled={busy}
              >
                + New Trip
              </button>
            </div>
          )}
        </div>

        <Field label="Client">
          <select
            className={selectCls}
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            disabled={clients.length === 0}
          >
            <option value="">— Select a client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </Field>

        {clients.length === 0 && (
          <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
            <p className="text-slate-400">
              No individual clients available. Add an individual client to capture a travel
              logbook.
            </p>
          </div>
        )}

        {clients.length > 0 && !selectedClientId && (
          <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
            <p className="text-slate-400">
              Select a client to load their {assessmentYear} travel logbook.
            </p>
          </div>
        )}

        {selectedClientId && loading && (
          <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
            <p className="text-slate-400">Loading logbook…</p>
          </div>
        )}

        {selectedClientId && !loading && !state && (
          <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              No {assessmentYear} logbook yet — create one
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vehicle make *">
                <input
                  className={inputCls}
                  value={createForm.make}
                  onChange={(e) => setCreateForm({ ...createForm, make: e.target.value })}
                />
              </Field>
              <Field label="Vehicle model *">
                <input
                  className={inputCls}
                  value={createForm.model}
                  onChange={(e) => setCreateForm({ ...createForm, model: e.target.value })}
                />
              </Field>
              <Field label="Registration number *">
                <input
                  className={inputCls}
                  value={createForm.registrationNumber}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, registrationNumber: e.target.value })
                  }
                />
              </Field>
              <Field label="Cost price (R) *">
                <input
                  type="number"
                  className={inputCls}
                  value={createForm.costPrice}
                  onChange={(e) => setCreateForm({ ...createForm, costPrice: e.target.value })}
                />
              </Field>
              <Field label="Opening odometer (km) *">
                <input
                  type="number"
                  className={inputCls}
                  value={createForm.openingOdometer}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, openingOdometer: e.target.value })
                  }
                />
              </Field>
              <Field label="Closing odometer (km)">
                <input
                  type="number"
                  className={inputCls}
                  value={createForm.closingOdometer}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, closingOdometer: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={handleCreateLogbook}
                disabled={busy}
              >
                Create logbook
              </button>
            </div>
          </div>
        )}

        {state && (
          <>
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                {state.record.vehicle.make} {state.record.vehicle.model} (
                {state.record.vehicle.registrationNumber})
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Opening odometer (km)">
                  <input
                    type="number"
                    className={inputCls}
                    value={odometerForm?.openingOdometer ?? ""}
                    disabled={busy}
                    onChange={(e) =>
                      setOdometerForm((prev) =>
                        prev ? { ...prev, openingOdometer: e.target.value } : prev,
                      )
                    }
                  />
                </Field>
                <Field label="Closing odometer (km)">
                  <input
                    type="number"
                    className={inputCls}
                    value={odometerForm?.closingOdometer ?? ""}
                    disabled={busy}
                    onChange={(e) =>
                      setOdometerForm((prev) =>
                        prev ? { ...prev, closingOdometer: e.target.value } : prev,
                      )
                    }
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-teal-300 hover:text-teal-700 disabled:opacity-50"
                    onClick={handleSaveOdometers}
                    disabled={busy}
                  >
                    Save odometers
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Total:{" "}
                {state.travelResult.totalKilometres != null
                  ? fmtKm(state.travelResult.totalKilometres)
                  : "closing odometer not recorded"}{" "}
                &middot; Business: {fmtKm(state.travelResult.businessKilometres)}
              </p>
            </div>

            <CostMethodPanel
              record={state.record}
              travelResult={state.travelResult}
              busy={busy}
              onElectMethod={handleElectMethod}
              onSaveExpenses={handleSaveExpenses}
            />

            <TripTable
              trips={state.record.trips}
              onEditTrip={handleEditTrip}
              onDeleteTrip={handleDeleteTrip}
              busy={busy}
            />
          </>
        )}

        {tripForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setTripForm(null);
                setEditingTripId(null);
              }
            }}
          >
            <div className="w-full max-w-lg rounded-xl border border-slate-200/80 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                {editingTripId ? "Edit Trip" : "Log New Trip"}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date *">
                  <input
                    type="date"
                    className={inputCls}
                    value={tripForm.date}
                    onChange={(e) => setTripForm({ ...tripForm, date: e.target.value })}
                  />
                </Field>
                <Field label="Business KM *">
                  <input
                    type="number"
                    className={inputCls}
                    value={tripForm.businessKm}
                    onChange={(e) =>
                      setTripForm({ ...tripForm, businessKm: e.target.value })
                    }
                  />
                </Field>
                <Field label="From *">
                  <input
                    className={inputCls}
                    placeholder="e.g. Office, Durban"
                    value={tripForm.fromLocation}
                    onChange={(e) =>
                      setTripForm({ ...tripForm, fromLocation: e.target.value })
                    }
                  />
                </Field>
                <Field label="To *">
                  <input
                    className={inputCls}
                    placeholder="e.g. Client, Umhlanga"
                    value={tripForm.toLocation}
                    onChange={(e) =>
                      setTripForm({ ...tripForm, toLocation: e.target.value })
                    }
                  />
                </Field>
                <Field label="Odometer start (km)">
                  <input
                    type="number"
                    className={inputCls}
                    value={tripForm.odometerStart}
                    onChange={(e) =>
                      setTripForm({ ...tripForm, odometerStart: e.target.value })
                    }
                  />
                </Field>
                <Field label="Odometer end (km)">
                  <input
                    type="number"
                    className={inputCls}
                    value={tripForm.odometerEnd}
                    onChange={(e) =>
                      setTripForm({ ...tripForm, odometerEnd: e.target.value })
                    }
                  />
                </Field>
                <div className="col-span-2">
                  <Field label="Reason *">
                    <input
                      className={inputCls}
                      value={tripForm.reason}
                      onChange={(e) =>
                        setTripForm({ ...tripForm, reason: e.target.value })
                      }
                      placeholder="e.g. Client meeting — annual audit"
                    />
                  </Field>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
                  onClick={() => {
                    setTripForm(null);
                    setEditingTripId(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={handleSaveTrip}
                  disabled={busy}
                >
                  {editingTripId ? "Update" : "Save Trip"}
                </button>
              </div>
            </div>
          </div>
        )}

        {importOpen && state && (
          <LogbookImportWizard
            logbook={{
              openingOdometer: state.record.openingOdometer,
              closingOdometer: state.record.closingOdometer,
              existingTrips: state.record.trips,
            }}
            onCommit={handleImportCommit}
            onClose={() => setImportOpen(false)}
          />
        )}
      </div>
    </>
  );
}
