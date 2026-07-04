"use client";

import { useState } from "react";
import type { SupportedAssessmentYear } from "@/modules/individual-tax/types";
import {
  selectCls,
  type TabKey,
} from "@/components/individual-tax/tax-tools/shared";
import {
  RulePackProvider,
  useRulePack,
} from "@/components/individual-tax/tax-tools/rulepack-context";
import { TaxToolsSummaryProvider } from "@/components/individual-tax/tax-tools/summary-context";
import { DashboardTab } from "@/components/individual-tax/tax-tools/dashboard-tab";
import { TravelLogbookTab } from "@/components/individual-tax/tax-tools/travel-logbook-tab";
import { RentalTab } from "@/components/individual-tax/tax-tools/rental-tab";
import { HomeOfficeTab } from "@/components/individual-tax/tax-tools/home-office-tab";
import { CgtTab } from "@/components/individual-tax/tax-tools/cgt-tab";
import { RetirementTab } from "@/components/individual-tax/tax-tools/retirement-tab";
import { MedicalTab } from "@/components/individual-tax/tax-tools/medical-tab";
import { ProvisionalTaxTab } from "@/components/individual-tax/tax-tools/provisional-tax-tab";

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export function TaxTools() {
  return (
    <RulePackProvider>
      <TaxToolsSummaryProvider>
        <TaxToolsInner />
      </TaxToolsSummaryProvider>
    </RulePackProvider>
  );
}

function TaxToolsInner() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const { assessmentYear, setAssessmentYear } = useRulePack();

  const NAV: { key: TabKey; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "travel", label: "Travel Logbook" },
    { key: "medical", label: "Medical Credits" },
    { key: "retirement", label: "Retirement" },
    { key: "cgt", label: "Capital Gains" },
    { key: "provisional", label: "Provisional Tax" },
    { key: "rental", label: "Rental Income" },
    { key: "homeoffice", label: "Home Office" },
  ];

  return (
    <div className="space-y-5">
      {/* ── Tab Navigation ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white p-1.5 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`rounded-md px-3.5 py-2 text-sm font-medium transition ${
                tab === n.key
                  ? "bg-[#0E2433] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 pr-2 text-sm">
          <span className="font-medium text-slate-600">Tax year</span>
          <select
            className={selectCls}
            value={assessmentYear}
            onChange={(e) =>
              setAssessmentYear(
                Number(e.target.value) as SupportedAssessmentYear,
              )
            }
          >
            <option value={2025}>2025 (Mar 2024–Feb 2025)</option>
            <option value={2026}>2026 (Mar 2025–Feb 2026)</option>
            <option value={2027}>2027 (Mar 2026–Feb 2027)</option>
          </select>
        </label>
      </div>

      {/* ════════ DASHBOARD ════════ */}
      <div className={tab === "dashboard" ? "" : "hidden"}>
        <DashboardTab navItems={NAV.slice(1)} onNavigate={setTab} />
      </div>

      {/* ════════ TRAVEL LOGBOOK ════════ */}
      <div className={tab === "travel" ? "" : "hidden"}>
        <TravelLogbookTab />
      </div>

      {/* ════════ MEDICAL CREDITS ════════ */}
      <div className={tab === "medical" ? "" : "hidden"}>
        <MedicalTab />
      </div>

      {/* ════════ RETIREMENT ════════ */}
      <div className={tab === "retirement" ? "" : "hidden"}>
        <RetirementTab />
      </div>

      {/* ════════ CGT ════════ */}
      <div className={tab === "cgt" ? "" : "hidden"}>
        <CgtTab />
      </div>

      {/* ════════ PROVISIONAL TAX ════════ */}
      <div className={tab === "provisional" ? "" : "hidden"}>
        <ProvisionalTaxTab />
      </div>

      {/* ════════ RENTAL INCOME ════════ */}
      <div className={tab === "rental" ? "" : "hidden"}>
        <RentalTab />
      </div>

      {/* ════════ HOME OFFICE ════════ */}
      <div className={tab === "homeoffice" ? "" : "hidden"}>
        <HomeOfficeTab />
      </div>
    </div>
  );
}
