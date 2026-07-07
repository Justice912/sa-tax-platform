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
import { getMarginalRate } from "@/components/individual-tax/tax-tools/calc-helpers";

export function CgtTab() {
  const { rulePack } = useRulePack();

  // ── CGT State ──
  const [cgt, setCgt] = useState({
    assetType: "Other property",
    proceeds: "",
    baseCost: "",
    improvements: "",
    sellingCosts: "",
    primaryRes: false,
    death: false,
    taxableIncome: "",
  });

  // ── CGT calc ──
  const calcCGT = () => {
    const proceeds = parseFloat(cgt.proceeds) || 0;
    const base = parseFloat(cgt.baseCost) || 0;
    const impr = parseFloat(cgt.improvements) || 0;
    const sell = parseFloat(cgt.sellingCosts) || 0;
    const taxInc = parseFloat(cgt.taxableIncome) || 0;
    const gain = proceeds - base - impr - sell;
    let exclusion = cgt.death
      ? rulePack.cgt.deathExclusion
      : rulePack.cgt.annualExclusion;
    if (cgt.primaryRes && gain > 0)
      exclusion += Math.min(gain, rulePack.cgt.primaryResidenceExclusion);
    const netGain = Math.max(0, gain - exclusion);
    const taxableGain = netGain * rulePack.cgt.inclusionRate;
    const marginal = getMarginalRate(rulePack, taxInc);
    const cgtPayable = taxableGain * marginal;
    const effectiveRate = gain > 0 ? (cgtPayable / gain) * 100 : 0;
    return {
      gain,
      exclusion,
      netGain,
      taxableGain,
      cgtPayable: Math.round(cgtPayable),
      effectiveRate,
      marginal,
    };
  };
  const cgtResult = calcCGT();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Capital Gains Tax
        </h2>
        <p className="text-sm text-slate-500">
          Calculate CGT on disposal of assets
        </p>
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Asset Type">
            <select
              className={selectCls}
              value={cgt.assetType}
              onChange={(e) =>
                setCgt({ ...cgt, assetType: e.target.value })
              }
            >
              {[
                "Primary residence",
                "Other property",
                "Listed shares",
                "Unlisted shares",
                "Cryptocurrency",
                "Other",
              ].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Taxable Income (R) — for marginal rate">
            <input
              type="number"
              className={inputCls}
              value={cgt.taxableIncome}
              onChange={(e) =>
                setCgt({ ...cgt, taxableIncome: e.target.value })
              }
            />
          </Field>
          <Field label="Proceeds / Selling Price (R)">
            <input
              type="number"
              className={inputCls}
              value={cgt.proceeds}
              onChange={(e) =>
                setCgt({ ...cgt, proceeds: e.target.value })
              }
            />
          </Field>
          <Field label="Base Cost / Purchase Price (R)">
            <input
              type="number"
              className={inputCls}
              value={cgt.baseCost}
              onChange={(e) =>
                setCgt({ ...cgt, baseCost: e.target.value })
              }
            />
          </Field>
          <Field label="Improvement Costs (R)">
            <input
              type="number"
              className={inputCls}
              value={cgt.improvements}
              onChange={(e) =>
                setCgt({ ...cgt, improvements: e.target.value })
              }
            />
          </Field>
          <Field label="Selling Costs (R)">
            <input
              type="number"
              className={inputCls}
              value={cgt.sellingCosts}
              onChange={(e) =>
                setCgt({ ...cgt, sellingCosts: e.target.value })
              }
            />
          </Field>
          <Field label="Primary Residence Exclusion?">
            <select
              className={selectCls}
              value={cgt.primaryRes ? "yes" : "no"}
              onChange={(e) =>
                setCgt({ ...cgt, primaryRes: e.target.value === "yes" })
              }
            >
              <option value="no">No</option>
              <option value="yes">{`Yes — ${fmt(
                rulePack.cgt.primaryResidenceExclusion,
              )} exclusion`}</option>
            </select>
          </Field>
          <Field label="Disposal on Death?">
            <select
              className={selectCls}
              value={cgt.death ? "yes" : "no"}
              onChange={(e) =>
                setCgt({ ...cgt, death: e.target.value === "yes" })
              }
            >
              <option value="no">{`No — ${fmt(
                rulePack.cgt.annualExclusion,
              )} exclusion`}</option>
              <option value="yes">{`Yes — ${fmt(
                rulePack.cgt.deathExclusion,
              )} exclusion`}</option>
            </select>
          </Field>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ResultCard
          label="Capital Gain"
          value={fmt(cgtResult.gain)}
          colorClass={
            cgtResult.gain >= 0 ? "text-sky-600" : "text-red-500"
          }
        />
        <ResultCard
          label="Exclusions Applied"
          value={fmt(cgtResult.exclusion)}
          colorClass="text-slate-600"
        />
        <ResultCard
          label="Net Capital Gain"
          value={fmt(cgtResult.netGain)}
          colorClass="text-amber-600"
        />
        <ResultCard
          label={`Taxable Portion (${(rulePack.cgt.inclusionRate * 100).toFixed(0)}%)`}
          value={fmt(cgtResult.taxableGain)}
          colorClass="text-violet-600"
        />
      </div>
      <Highlight label="CGT PAYABLE" value={fmt(cgtResult.cgtPayable)} />
      <p className="text-center text-xs text-slate-400">
        Effective CGT rate: {cgtResult.effectiveRate.toFixed(2)}% | Marginal
        rate: {(cgtResult.marginal * 100).toFixed(0)}%
      </p>
    </div>
  );
}
