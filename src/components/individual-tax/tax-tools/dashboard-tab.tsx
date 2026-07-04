"use client";

import { StatCard, fmt, type TabKey } from "@/components/individual-tax/tax-tools/shared";
import { useRulePack } from "@/components/individual-tax/tax-tools/rulepack-context";
import { useSummary } from "@/components/individual-tax/tax-tools/summary-context";

export function DashboardTab({
  navItems,
  onNavigate,
}: {
  navItems: { key: TabKey; label: string }[];
  onNavigate: (key: TabKey) => void;
}) {
  const { assessmentYear } = useRulePack();
  const summary = useSummary();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Individual Tax Dashboard
        </h2>
        <p className="text-sm text-slate-500">
          Tax Year {assessmentYear - 1}/{assessmentYear} — Summary of
          deductions and credits
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Travel Deduction"
          value={fmt(summary.travelDeduction)}
          colorClass="text-teal-600"
        />
        <StatCard
          label="Medical Credits"
          value={fmt(summary.medicalTotal)}
          colorClass="text-sky-600"
        />
        <StatCard
          label="Retirement Headroom"
          value={fmt(summary.retirementHeadroom)}
          colorClass="text-violet-600"
        />
        <StatCard
          label="Rental Net Income"
          value={fmt(summary.rentalNet)}
          colorClass={summary.rentalNet >= 0 ? "text-teal-600" : "text-red-500"}
        />
        <StatCard
          label="Home Office Deduction"
          value={fmt(summary.homeOfficeAnnual)}
          colorClass="text-amber-600"
        />
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          {navItems.map((n) => (
            <button
              key={n.key}
              onClick={() => onNavigate(n.key)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
