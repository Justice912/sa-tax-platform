"use client";

import { useState, useEffect } from "react";
import {
  Field,
  ResultCard,
  Highlight,
  fmt,
  inputCls,
} from "@/components/individual-tax/tax-tools/shared";
import { useSummaryWriter } from "@/components/individual-tax/tax-tools/summary-context";

export function RentalTab() {
  // ── Rental State ──
  const [rent, setRent] = useState({
    grossRent: "",
    months: 12,
    otherIncome: "",
    rates: "",
    levies: "",
    insurance: "",
    bondInterest: "",
    repairs: "",
    agentFees: "",
    advertising: "",
    security: "",
    garden: "",
    utilities: "",
    wearTear: "",
    legal: "",
    travelToProperty: "",
  });

  const setSummaryValue = useSummaryWriter();

  // ── Rental calc ──
  const calcRental = () => {
    const gross =
      (parseFloat(rent.grossRent) || 0) * (parseInt(String(rent.months)) || 12);
    const other = parseFloat(rent.otherIncome) || 0;
    const totalInc = gross + other;
    const expenseKeys = [
      "rates",
      "levies",
      "insurance",
      "bondInterest",
      "repairs",
      "agentFees",
      "advertising",
      "security",
      "garden",
      "utilities",
      "wearTear",
      "legal",
      "travelToProperty",
    ] as const;
    const expenses = expenseKeys.reduce(
      (s, k) => s + (parseFloat(rent[k]) || 0),
      0,
    );
    const net = totalInc - expenses;
    return { totalInc, expenses, net };
  };
  const rentalResult = calcRental();

  useEffect(
    () => setSummaryValue("rentalNet", rentalResult.net),
    [rentalResult.net, setSummaryValue],
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Rental Income Worksheet
        </h2>
        <p className="text-sm text-slate-500">
          Calculate net rental income/loss for ITR12
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-teal-700">
            Income
          </h3>
          <div className="space-y-3">
            <Field label="Monthly Rent (R)">
              <input
                type="number"
                className={inputCls}
                value={rent.grossRent}
                onChange={(e) =>
                  setRent({ ...rent, grossRent: e.target.value })
                }
              />
            </Field>
            <Field label="Months Let">
              <input
                type="number"
                className={inputCls}
                value={rent.months}
                onChange={(e) =>
                  setRent({
                    ...rent,
                    months: parseInt(e.target.value) || 12,
                  })
                }
              />
            </Field>
            <Field label="Other Income (R)">
              <input
                type="number"
                className={inputCls}
                value={rent.otherIncome}
                onChange={(e) =>
                  setRent({ ...rent, otherIncome: e.target.value })
                }
              />
            </Field>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-red-600">
            Expenses (R/year)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["rates", "Rates & Taxes"],
                ["levies", "Levies"],
                ["insurance", "Insurance"],
                ["bondInterest", "Bond Interest"],
                ["repairs", "Repairs"],
                ["agentFees", "Agent Fees"],
                ["advertising", "Advertising"],
                ["security", "Security"],
                ["garden", "Garden/Pool"],
                ["utilities", "Utilities"],
                ["wearTear", "Wear & Tear"],
                ["legal", "Legal"],
                ["travelToProperty", "Travel"],
              ] as const
            ).map(([k, l]) => (
              <Field key={k} label={l}>
                <input
                  type="number"
                  className={inputCls}
                  value={rent[k]}
                  onChange={(e) =>
                    setRent({ ...rent, [k]: e.target.value })
                  }
                />
              </Field>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <ResultCard
          label="Total Income"
          value={fmt(rentalResult.totalInc)}
          colorClass="text-teal-600"
        />
        <ResultCard
          label="Total Expenses"
          value={fmt(rentalResult.expenses)}
          colorClass="text-red-500"
        />
        <ResultCard
          label="Net Rental Income"
          value={fmt(rentalResult.net)}
          colorClass={
            rentalResult.net >= 0 ? "text-teal-600" : "text-red-500"
          }
        />
      </div>
      <Highlight
        label="NET RENTAL INCOME FOR ITR12"
        value={fmt(rentalResult.net)}
      />
    </div>
  );
}
