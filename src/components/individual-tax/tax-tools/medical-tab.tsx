"use client";

import { useState, useEffect } from "react";
import {
  Field,
  ResultCard,
  Highlight,
  fmt,
  inputCls,
  selectCls,
} from "@/components/individual-tax/tax-tools/shared";
import { useRulePack } from "@/components/individual-tax/tax-tools/rulepack-context";
import { useSummaryWriter } from "@/components/individual-tax/tax-tools/summary-context";

export function MedicalTab() {
  const { rulePack } = useRulePack();
  const setSummaryValue = useSummaryWriter();

  // ── Medical Credits State ──
  const [med, setMed] = useState({
    dependants: 1,
    monthlyContrib: "",
    outOfPocket: "",
    age: "under65",
    disability: false,
    taxableIncome: "",
  });

  // ── Medical calc ──
  const calcMedical = () => {
    const deps = parseInt(String(med.dependants)) || 1;
    const contrib = (parseFloat(med.monthlyContrib) || 0) * 12;
    const oop = parseFloat(med.outOfPocket) || 0;
    const taxInc = parseFloat(med.taxableIncome) || 0;
    const s6aMonthly =
      Math.min(deps, 2) * rulePack.medicalTaxCredit.firstTwoMembersPerMonth +
      Math.max(0, deps - 2) * rulePack.medicalTaxCredit.additionalMemberPerMonth;
    const s6a = Math.min(s6aMonthly * 12, contrib);
    let s6b = 0;
    if (med.age !== "under65" || med.disability) {
      const qual = oop + Math.max(0, contrib - 3 * s6a);
      s6b = Math.max(0, qual * 0.333);
    } else {
      const qual = oop - 0.075 * taxInc - 3 * s6a;
      s6b = Math.max(0, qual * 0.25);
    }
    return {
      s6a: Math.round(s6a),
      s6b: Math.round(s6b),
      total: Math.round(s6a + s6b),
    };
  };
  const medResult = calcMedical();

  useEffect(
    () => setSummaryValue("medicalTotal", medResult.total),
    [medResult.total, setSummaryValue],
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Medical Tax Credits
        </h2>
        <p className="text-sm text-slate-500">
          Section 6A (fees credit) &amp; Section 6B (additional expenses
          credit)
        </p>
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Number of Dependants (incl. main member)">
            <input
              type="number"
              min="1"
              className={inputCls}
              value={med.dependants}
              onChange={(e) =>
                setMed({ ...med, dependants: parseInt(e.target.value) || 1 })
              }
            />
          </Field>
          <Field label="Monthly Medical Aid Contribution (R)">
            <input
              type="number"
              className={inputCls}
              value={med.monthlyContrib}
              onChange={(e) =>
                setMed({ ...med, monthlyContrib: e.target.value })
              }
            />
          </Field>
          <Field label="Out-of-Pocket Medical Expenses (R/year)">
            <input
              type="number"
              className={inputCls}
              value={med.outOfPocket}
              onChange={(e) =>
                setMed({ ...med, outOfPocket: e.target.value })
              }
            />
          </Field>
          <Field label="Taxable Income (R)">
            <input
              type="number"
              className={inputCls}
              value={med.taxableIncome}
              onChange={(e) =>
                setMed({ ...med, taxableIncome: e.target.value })
              }
            />
          </Field>
          <Field label="Age Category">
            <select
              className={selectCls}
              value={med.age}
              onChange={(e) => setMed({ ...med, age: e.target.value })}
            >
              <option value="under65">Under 65</option>
              <option value="65to74">65 – 74</option>
              <option value="75plus">75+</option>
            </select>
          </Field>
          <Field label="Disability?">
            <select
              className={selectCls}
              value={med.disability ? "yes" : "no"}
              onChange={(e) =>
                setMed({ ...med, disability: e.target.value === "yes" })
              }
            >
              <option value="no">No</option>
              <option value="yes">Yes — taxpayer or dependant</option>
            </select>
          </Field>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <ResultCard
          label="Section 6A Credit"
          value={fmt(medResult.s6a)}
          colorClass="text-sky-600"
        />
        <ResultCard
          label="Section 6B Credit"
          value={fmt(medResult.s6b)}
          colorClass="text-violet-600"
        />
        <ResultCard
          label="Total Credit"
          value={fmt(medResult.total)}
          colorClass="text-teal-600"
        />
      </div>
      <Highlight
        label="TOTAL MEDICAL TAX CREDITS (ITR12)"
        value={fmt(medResult.total)}
      />
    </div>
  );
}
