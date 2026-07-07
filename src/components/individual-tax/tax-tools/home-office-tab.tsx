"use client";

import { useState, useEffect } from "react";
import {
  Field,
  ResultCard,
  Highlight,
  fmt,
  pct,
  inputCls,
  selectCls,
} from "@/components/individual-tax/tax-tools/shared";
import { useSummaryWriter } from "@/components/individual-tax/tax-tools/summary-context";

export function HomeOfficeTab() {
  // ── Home Office State ──
  const [ho, setHo] = useState({
    empType: "commission",
    totalArea: "",
    officeArea: "",
    rentOrInterest: "",
    rates: "",
    electricity: "",
    cleaning: "",
    repairs: "",
    internet: "",
  });

  const setSummaryValue = useSummaryWriter();

  // ── Home Office calc ──
  const calcHO = () => {
    const total = parseFloat(ho.totalArea) || 1;
    const office = parseFloat(ho.officeArea) || 0;
    const ratio = Math.min(office / total, 1);
    const shared =
      (parseFloat(ho.rentOrInterest) || 0) +
      (parseFloat(ho.rates) || 0) +
      (parseFloat(ho.electricity) || 0) +
      (parseFloat(ho.cleaning) || 0);
    const direct =
      (parseFloat(ho.repairs) || 0) + (parseFloat(ho.internet) || 0);
    const monthly = shared * ratio + direct;
    const annual = monthly * 12;
    const qualifies = ho.empType !== "salaried";
    return { ratio, monthly, annual, qualifies };
  };
  const hoResult = calcHO();

  useEffect(
    () =>
      setSummaryValue(
        "homeOfficeAnnual",
        hoResult.qualifies ? hoResult.annual : 0,
      ),
    [hoResult.qualifies, hoResult.annual, setSummaryValue],
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Home Office Deduction
        </h2>
        <p className="text-sm text-slate-500">
          Calculate allowable home office deduction
        </p>
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employment Type">
            <select
              className={selectCls}
              value={ho.empType}
              onChange={(e) => setHo({ ...ho, empType: e.target.value })}
            >
              <option value="commission">
                Commission Earner (50%+)
              </option>
              <option value="selfemployed">Self-Employed</option>
              <option value="salaried">Salaried Employee</option>
            </select>
          </Field>
          <div />
          <Field label="Total Home Area (m²)">
            <input
              type="number"
              className={inputCls}
              value={ho.totalArea}
              onChange={(e) =>
                setHo({ ...ho, totalArea: e.target.value })
              }
            />
          </Field>
          <Field label="Dedicated Office Area (m²)">
            <input
              type="number"
              className={inputCls}
              value={ho.officeArea}
              onChange={(e) =>
                setHo({ ...ho, officeArea: e.target.value })
              }
            />
          </Field>
          <Field label="Rent or Bond Interest (R/month)">
            <input
              type="number"
              className={inputCls}
              value={ho.rentOrInterest}
              onChange={(e) =>
                setHo({ ...ho, rentOrInterest: e.target.value })
              }
            />
          </Field>
          <Field label="Rates (R/month)">
            <input
              type="number"
              className={inputCls}
              value={ho.rates}
              onChange={(e) => setHo({ ...ho, rates: e.target.value })}
            />
          </Field>
          <Field label="Electricity (R/month)">
            <input
              type="number"
              className={inputCls}
              value={ho.electricity}
              onChange={(e) =>
                setHo({ ...ho, electricity: e.target.value })
              }
            />
          </Field>
          <Field label="Cleaning (R/month)">
            <input
              type="number"
              className={inputCls}
              value={ho.cleaning}
              onChange={(e) =>
                setHo({ ...ho, cleaning: e.target.value })
              }
            />
          </Field>
          <Field label="Office Repairs (R/month)">
            <input
              type="number"
              className={inputCls}
              value={ho.repairs}
              onChange={(e) =>
                setHo({ ...ho, repairs: e.target.value })
              }
            />
          </Field>
          <Field label="Internet / Phone — work portion (R/month)">
            <input
              type="number"
              className={inputCls}
              value={ho.internet}
              onChange={(e) =>
                setHo({ ...ho, internet: e.target.value })
              }
            />
          </Field>
        </div>
      </div>
      {ho.empType === "salaried" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-semibold text-red-700">
            Salaried Employee Warning
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Salaried (non-commission) employees CAN claim a home-office
            deduction if a part of the home is used regularly and
            exclusively for work and is specifically equipped for it
            (s23(b)), AND duties are performed mainly (more than 50%) at
            home. Note: s23(m) restricts salaried employees to
            premises-type costs (rent, repairs, and s11(a) home-office
            expenses) and disallows most other deductions and
            wear-and-tear on the building.
          </p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <ResultCard
          label="Office Ratio"
          value={pct(hoResult.ratio * 100)}
          colorClass="text-sky-600"
          sub={`${ho.officeArea || 0}m² of ${ho.totalArea || 0}m²`}
        />
        <ResultCard
          label="Monthly Deduction"
          value={fmt(hoResult.monthly)}
          colorClass="text-violet-600"
        />
        <ResultCard
          label="Qualification"
          value={hoResult.qualifies ? "Qualifies" : "Unlikely"}
          colorClass={
            hoResult.qualifies ? "text-teal-600" : "text-red-500"
          }
        />
      </div>
      <Highlight
        label="ANNUAL HOME OFFICE DEDUCTION"
        value={fmt(hoResult.qualifies ? hoResult.annual : 0)}
      />
    </div>
  );
}
