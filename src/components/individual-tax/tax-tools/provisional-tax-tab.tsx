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
    estimatedTaxable: "",
    payeDeducted: "",
    credits: "",
    firstPayment: "",
    period: "P1",
    latestAssessmentOver18Months: false,
  });

  // ── Provisional tax calc (SARS para 19 basic amount + para 20 safe harbour) ──
  const calcProv = () => {
    const pt = rulePack.provisionalTax;
    const priorTaxable = parseFloat(prov.priorTaxable) || 0;
    const estTaxable = parseFloat(prov.estimatedTaxable) || 0;
    const paye = parseFloat(prov.payeDeducted) || 0;
    const credits = parseFloat(prov.credits) || 0;
    const firstPayment = parseFloat(prov.firstPayment) || 0;

    // Para 19 basic amount: prior-year assessed taxable income, +8% (simple)
    // if the latest assessment is older than 18 months.
    const basicAmount = prov.latestAssessmentOver18Months
      ? Math.round(priorTaxable * (1 + pt.basicAmountEscalationRate))
      : priorTaxable;

    // Para 20 safe-harbour floor, expressed as a TAXABLE-INCOME figure:
    // <=R1m: lesser of the basic amount or 90% of the estimate.
    // >R1m: 80% of the estimate (the basic-amount option falls away).
    const safeHarbourTaxableIncome =
      estTaxable > pt.safeHarbourTaxableIncomeThreshold
        ? estTaxable * pt.safeHarbourActualPctAboveThreshold
        : Math.min(
            basicAmount,
            estTaxable * pt.safeHarbourBasicAmountOrActualPctBelowThreshold,
          );

    const fullTax = calcTax(rulePack, estTaxable) - rulePack.rebates.primary;
    const netTax = Math.max(0, fullTax - credits);
    const payment =
      prov.period === "P1"
        ? Math.max(0, netTax * 0.5 - paye * 0.5)
        : Math.max(0, netTax - paye - firstPayment); // P2 nets off P1 already paid

    // Penalty exposure (para 20): 20% of the shortfall tax when the estimate
    // is below the safe-harbour taxable income.
    const shortfallTax = Math.max(
      0,
      calcTax(rulePack, safeHarbourTaxableIncome) -
        rulePack.rebates.primary -
        (calcTax(rulePack, estTaxable) - rulePack.rebates.primary),
    );
    const penaltyExposure = Math.round(pt.underestimationPenaltyRate * shortfallTax);
    const risk =
      estTaxable >= safeHarbourTaxableIncome
        ? "green"
        : penaltyExposure > 0
          ? "red"
          : "amber";

    return {
      basicAmount,
      safeHarbourTaxableIncome: Math.round(safeHarbourTaxableIncome),
      fullTax: Math.max(0, Math.round(fullTax)),
      netTax: Math.round(netTax),
      payment: Math.round(payment),
      penaltyExposure,
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
          <Field label="Latest Assessment Older Than 18 Months?">
            <select
              className={selectCls}
              value={prov.latestAssessmentOver18Months ? "yes" : "no"}
              onChange={(e) =>
                setProv({
                  ...prov,
                  latestAssessmentOver18Months: e.target.value === "yes",
                })
              }
            >
              <option value="no">No</option>
              <option value="yes">Yes — 8% escalation applies</option>
            </select>
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
          <Field label="First Period Payment Already Paid (R)">
            <input
              type="number"
              className={inputCls}
              value={prov.firstPayment}
              onChange={(e) =>
                setProv({ ...prov, firstPayment: e.target.value })
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
      <div className="grid grid-cols-2 gap-3">
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
          label="Safe Harbour Min. Taxable Income"
          value={fmt(provResult.safeHarbourTaxableIncome)}
          colorClass="text-slate-600"
        />
        <ResultCard
          label="Basic Amount"
          value={fmt(provResult.basicAmount)}
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
