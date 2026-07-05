"use client";

import { useEffect, useState } from "react";
import {
  Field,
  Highlight,
  ResultCard,
  fmt,
  inputCls,
} from "@/components/individual-tax/tax-tools/shared";
import type {
  ActualCostExpenses,
  LogbookCostMethod,
  LogbookRecord,
  LogbookTravelResult,
} from "@/modules/logbook/types";

/**
 * Surfaces the deemed-vs-actual comparison the domain has computed since
 * Phase 2. Pure presentation over a LogbookRecord + LogbookTravelResult:
 * it performs NO cost math itself (calculation.ts is the single source of
 * truth, run server-side and returned via the travel result). The election
 * is the ONLY thing that changes the claim -- presence of expenses never
 * overrides it.
 */
export interface CostMethodPanelProps {
  record: LogbookRecord;
  travelResult: LogbookTravelResult;
  onElectMethod: (method: LogbookCostMethod) => Promise<void>;
  onSaveExpenses: (expenses: ActualCostExpenses | null) => Promise<void>;
  busy?: boolean;
}

const EXPENSE_FIELDS: { key: keyof ActualCostExpenses; label: string }[] = [
  { key: "fuel", label: "Fuel (R)" },
  { key: "maintenance", label: "Maintenance (R)" },
  { key: "insurance", label: "Insurance (R)" },
  { key: "licence", label: "Licence (R)" },
  { key: "financeCharges", label: "Finance charges (R)" },
];

/** Mirrors service.ts's setLogbookCostMethod guard verbatim, so the user never
    triggers a guaranteed server error blindly. */
const ACTUAL_ELECTION_GUARD_MESSAGE =
  "Capture actual expenses before electing the actual-cost method.";

/** Mirrors service.ts's setLogbookActualExpenses guard verbatim. */
const CLEAR_EXPENSES_GUARD_MESSAGE =
  "Cannot clear actual expenses while the actual-cost method is elected.";

type ExpenseFormState = Record<keyof ActualCostExpenses, string>;

function toFormState(expenses: ActualCostExpenses | null): ExpenseFormState {
  return {
    fuel: expenses ? String(expenses.fuel) : "",
    maintenance: expenses ? String(expenses.maintenance) : "",
    insurance: expenses ? String(expenses.insurance) : "",
    licence: expenses ? String(expenses.licence) : "",
    financeCharges: expenses ? String(expenses.financeCharges) : "",
  };
}

export function CostMethodPanel({
  record,
  travelResult,
  onElectMethod,
  onSaveExpenses,
  busy = false,
}: CostMethodPanelProps) {
  const [form, setForm] = useState<ExpenseFormState>(() =>
    toFormState(record.actualExpenses),
  );

  // Re-seed the local form whenever the server-confirmed expenses change
  // (e.g. after a save/clear round trip resolves with a fresh record).
  useEffect(() => {
    setForm(toFormState(record.actualExpenses));
  }, [record.actualExpenses]);

  const canElectActual = record.actualExpenses !== null;

  const parsedValues = EXPENSE_FIELDS.reduce(
    (acc, f) => {
      const raw = form[f.key].trim();
      acc[f.key] = raw === "" ? NaN : Number(raw);
      return acc;
    },
    {} as Record<keyof ActualCostExpenses, number>,
  );

  const allFieldsValid = EXPENSE_FIELDS.every(
    (f) => Number.isFinite(parsedValues[f.key]) && parsedValues[f.key] >= 0,
  );

  const handleElect = (method: LogbookCostMethod) => {
    if (busy) return;
    if (method === "ACTUAL" && !canElectActual) return;
    void onElectMethod(method);
  };

  const handleSave = () => {
    if (busy || !allFieldsValid) return;
    void onSaveExpenses({
      fuel: parsedValues.fuel,
      maintenance: parsedValues.maintenance,
      insurance: parsedValues.insurance,
      licence: parsedValues.licence,
      financeCharges: parsedValues.financeCharges,
    });
  };

  const handleClear = () => {
    if (busy || record.costMethod === "ACTUAL") return;
    void onSaveExpenses(null);
  };

  const electedMethodLabel =
    travelResult.costMethod === "ACTUAL" ? "actual cost" : "deemed cost";

  return (
    <div className="space-y-5">
      {/* Side-by-side deemed vs actual comparison */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ResultCard
          label={
            travelResult.recommendedMethod === "DEEMED"
              ? "Deemed cost (recommended)"
              : "Deemed cost"
          }
          value={fmt(travelResult.deemedCostDeduction)}
          colorClass={
            travelResult.recommendedMethod === "DEEMED"
              ? "text-teal-700"
              : "text-slate-700"
          }
        />
        <ResultCard
          label={
            travelResult.recommendedMethod === "ACTUAL"
              ? "Actual cost (recommended)"
              : "Actual cost"
          }
          value={
            travelResult.actualCostDeduction != null
              ? fmt(travelResult.actualCostDeduction)
              : "Capture expenses to compute"
          }
          colorClass={
            travelResult.recommendedMethod === "ACTUAL"
              ? "text-teal-700"
              : "text-slate-700"
          }
        />
      </div>

      {/* Method election */}
      <div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleElect("DEEMED")}
            disabled={busy}
            aria-pressed={record.costMethod === "DEEMED"}
            className={`rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
              record.costMethod === "DEEMED"
                ? "border-teal-500 bg-teal-50 text-teal-700"
                : "border-slate-200 text-slate-600 hover:border-teal-300"
            }`}
          >
            Elect deemed cost
          </button>
          <button
            type="button"
            onClick={() => handleElect("ACTUAL")}
            disabled={busy || !canElectActual}
            aria-pressed={record.costMethod === "ACTUAL"}
            title={!canElectActual ? ACTUAL_ELECTION_GUARD_MESSAGE : undefined}
            className={`rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
              record.costMethod === "ACTUAL"
                ? "border-teal-500 bg-teal-50 text-teal-700"
                : "border-slate-200 text-slate-600 hover:border-teal-300"
            }`}
          >
            Elect actual cost
          </button>
        </div>
        {!canElectActual && (
          <p className="mt-1.5 text-xs text-amber-600">
            {ACTUAL_ELECTION_GUARD_MESSAGE}
          </p>
        )}
      </div>

      {/* Claimed deduction -- the value that flows to the ITR12 travel schedule */}
      <Highlight
        label="Claimed deduction (ITR12)"
        value={fmt(travelResult.claimedDeduction)}
      />
      <p className="-mt-3 text-center text-xs text-slate-400">
        Elected method: {electedMethodLabel}
      </p>

      {/* Warnings (e.g. continuity / closing-odometer) */}
      {travelResult.warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          {travelResult.warnings.map((w) => (
            <li key={w.code}>{w.message}</li>
          ))}
        </ul>
      )}

      {/* Actual-expense capture */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h4 className="mb-3 text-sm font-semibold text-slate-900">
          Actual expenses
        </h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {EXPENSE_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form[f.key]}
                disabled={busy}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
              />
            </Field>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={busy || record.costMethod === "ACTUAL"}
            title={
              record.costMethod === "ACTUAL"
                ? CLEAR_EXPENSES_GUARD_MESSAGE
                : undefined
            }
            className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear expenses
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !allFieldsValid}
            className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save expenses
          </button>
        </div>
        {record.costMethod === "ACTUAL" && (
          <p className="mt-2 text-xs text-slate-400">
            {CLEAR_EXPENSES_GUARD_MESSAGE}
          </p>
        )}
      </div>
    </div>
  );
}
