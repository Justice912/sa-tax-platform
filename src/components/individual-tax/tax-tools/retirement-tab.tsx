"use client";

import { useState, useEffect } from "react";
import {
  Field,
  ResultCard,
  Highlight,
  fmt,
  inputCls,
} from "@/components/individual-tax/tax-tools/shared";
import { useRulePack } from "@/components/individual-tax/tax-tools/rulepack-context";
import { getMarginalRate } from "@/components/individual-tax/tax-tools/calc-helpers";
import { useSummaryWriter } from "@/components/individual-tax/tax-tools/summary-context";

export function RetirementTab() {
  const { rulePack } = useRulePack();
  const setSummaryValue = useSummaryWriter();

  // ── Retirement State ──
  const [ret, setRet] = useState({
    income: "",
    employerContrib: "",
    employeeContrib: "",
    raContrib: "",
    additionalRA: 0,
  });

  // ── Retirement calc ──
  const calcRetire = () => {
    const inc = parseFloat(ret.income) || 0;
    const empC = (parseFloat(ret.employerContrib) || 0) * 12;
    const eeC = (parseFloat(ret.employeeContrib) || 0) * 12;
    const raC = (parseFloat(ret.raContrib) || 0) * 12;
    const current = empC + eeC + raC;
    const limit = Math.min(
      inc * rulePack.retirement.deductiblePercentageLimit,
      rulePack.retirement.annualCap,
    );
    const headroom = Math.max(0, limit - current);
    const addRA = ret.additionalRA * 12;
    const usable = Math.min(addRA, headroom);
    const marginal = getMarginalRate(rulePack, inc);
    const saving = usable * marginal;
    return { current, limit, headroom, usable, saving, marginal };
  };
  const retResult = calcRetire();

  useEffect(
    () => setSummaryValue("retirementHeadroom", retResult.headroom),
    [retResult.headroom, setSummaryValue],
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Retirement Contribution Optimizer
        </h2>
        <p className="text-sm text-slate-500">
          27.5% cap / R350,000 annual limit
        </p>
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Annual Remuneration (R)">
            <input
              type="number"
              className={inputCls}
              value={ret.income}
              onChange={(e) => setRet({ ...ret, income: e.target.value })}
            />
          </Field>
          <Field label="Employer Contribution (R/month)">
            <input
              type="number"
              className={inputCls}
              value={ret.employerContrib}
              onChange={(e) =>
                setRet({ ...ret, employerContrib: e.target.value })
              }
            />
          </Field>
          <Field label="Employee Contribution (R/month)">
            <input
              type="number"
              className={inputCls}
              value={ret.employeeContrib}
              onChange={(e) =>
                setRet({ ...ret, employeeContrib: e.target.value })
              }
            />
          </Field>
          <Field label="RA Contributions (R/month)">
            <input
              type="number"
              className={inputCls}
              value={ret.raContrib}
              onChange={(e) =>
                setRet({ ...ret, raContrib: e.target.value })
              }
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field
            label={`Additional RA: R${ret.additionalRA.toLocaleString()}/month`}
          >
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={ret.additionalRA}
              onChange={(e) =>
                setRet({
                  ...ret,
                  additionalRA: parseInt(e.target.value),
                })
              }
              className="w-full accent-teal-600"
            />
          </Field>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <ResultCard
          label="Current Annual Contributions"
          value={fmt(retResult.current)}
          colorClass="text-slate-600"
        />
        <ResultCard
          label="Deduction Limit"
          value={fmt(retResult.limit)}
          colorClass="text-sky-600"
          sub="27.5% or R350k"
        />
        <ResultCard
          label="Headroom Available"
          value={fmt(retResult.headroom)}
          colorClass="text-teal-600"
        />
      </div>
      <Highlight
        label={`TAX SAVING FROM R${ret.additionalRA.toLocaleString()}/mo ADDITIONAL RA`}
        value={fmt(retResult.saving)}
      />
      <p className="text-center text-xs text-slate-400">
        Marginal rate: {(retResult.marginal * 100).toFixed(0)}%
      </p>
    </div>
  );
}
