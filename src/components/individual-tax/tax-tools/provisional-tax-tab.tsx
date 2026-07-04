"use client";

import { useState } from "react";
import {
  Field,
  ResultCard,
  Highlight,
  fmt,
  inputCls,
  selectCls,
} from "@/components/individual-tax/tax-tools/shared";
import { useRulePack } from "@/components/individual-tax/tax-tools/rulepack-context";
import { calcTax } from "@/components/individual-tax/tax-tools/calc-helpers";

export function ProvisionalTaxTab() {
  const { rulePack } = useRulePack();

  // ── Provisional Tax State ──
  const [prov, setProv] = useState({
    priorTaxable: "",
    priorTax: "",
    estimatedTaxable: "",
    payeDeducted: "",
    credits: "",
    period: "P1",
  });

  // ── Provisional tax calc ──
  const calcProv = () => {
    const estTaxable = parseFloat(prov.estimatedTaxable) || 0;
    const paye = parseFloat(prov.payeDeducted) || 0;
    const credits = parseFloat(prov.credits) || 0;
    const priorTax = parseFloat(prov.priorTax) || 0;
    const fullTax = calcTax(rulePack, estTaxable) - rulePack.rebates.primary;
    const netTax = Math.max(0, fullTax - credits);
    let payment = 0;
    if (prov.period === "P1") payment = Math.max(0, netTax * 0.5 - paye * 0.5);
    else payment = Math.max(0, netTax - paye);
    const pt = rulePack.provisionalTax;
    const safeHarbour =
      estTaxable > pt.safeHarbourTaxableIncomeThreshold
        ? priorTax * pt.safeHarbourActualPctAboveThreshold
        : priorTax * pt.safeHarbourBasicAmountOrActualPctBelowThreshold;
    const risk =
      netTax > 0 && payment < safeHarbour * 0.8
        ? "red"
        : payment < safeHarbour
          ? "amber"
          : "green";
    return {
      fullTax: Math.max(0, Math.round(fullTax)),
      netTax: Math.round(netTax),
      payment: Math.round(payment),
      safeHarbour: Math.round(safeHarbour),
      risk,
    };
  };
  const provResult = calcProv();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Provisional Tax Estimator
        </h2>
        <p className="text-sm text-slate-500">
          IRP6 — P1 and P2 payment estimates with penalty risk
        </p>
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prior Year Taxable Income (R)">
            <input
              type="number"
              className={inputCls}
              value={prov.priorTaxable}
              onChange={(e) =>
                setProv({ ...prov, priorTaxable: e.target.value })
              }
            />
          </Field>
          <Field label="Prior Year Tax Assessed (R)">
            <input
              type="number"
              className={inputCls}
              value={prov.priorTax}
              onChange={(e) =>
                setProv({ ...prov, priorTax: e.target.value })
              }
            />
          </Field>
          <Field label="Estimated Current Year Taxable Income (R)">
            <input
              type="number"
              className={inputCls}
              value={prov.estimatedTaxable}
              onChange={(e) =>
                setProv({ ...prov, estimatedTaxable: e.target.value })
              }
            />
          </Field>
          <Field label="PAYE Deducted (R/year)">
            <input
              type="number"
              className={inputCls}
              value={prov.payeDeducted}
              onChange={(e) =>
                setProv({ ...prov, payeDeducted: e.target.value })
              }
            />
          </Field>
          <Field label="Other Tax Credits (R)">
            <input
              type="number"
              className={inputCls}
              value={prov.credits}
              onChange={(e) =>
                setProv({ ...prov, credits: e.target.value })
              }
            />
          </Field>
          <Field label="Payment Period">
            <select
              className={selectCls}
              value={prov.period}
              onChange={(e) =>
                setProv({ ...prov, period: e.target.value })
              }
            >
              <option value="P1">P1 — First Period (6 months)</option>
              <option value="P2">P2 — Second Period (year-end)</option>
            </select>
          </Field>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <ResultCard
          label="Estimated Tax (full year)"
          value={fmt(provResult.fullTax)}
          colorClass="text-sky-600"
        />
        <ResultCard
          label="Net After Credits"
          value={fmt(provResult.netTax)}
          colorClass="text-violet-600"
        />
        <ResultCard
          label="Safe Harbour Minimum"
          value={fmt(provResult.safeHarbour)}
          colorClass="text-slate-600"
        />
      </div>
      <Highlight
        label={`${prov.period} PAYMENT DUE`}
        value={fmt(provResult.payment)}
      />
      <div className="flex justify-center">
        <span
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            provResult.risk === "green"
              ? "bg-teal-100 text-teal-800"
              : provResult.risk === "amber"
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {provResult.risk === "green"
            ? "Low Penalty Risk"
            : provResult.risk === "amber"
              ? "Marginal — Review Estimate"
              : "High Penalty Risk — Increase Payment"}
        </span>
      </div>
    </div>
  );
}
