"use client";

export const fmt = (n: number) =>
  "R " +
  Number(n || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const fmtKm = (n: number) =>
  Number(n || 0).toLocaleString("en-ZA", { maximumFractionDigits: 1 }) + " km";
export const pct = (n: number) => (n || 0).toFixed(1) + "%";
export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export type TabKey =
  | "dashboard"
  | "travel"
  | "medical"
  | "retirement"
  | "cgt"
  | "provisional"
  | "rental"
  | "homeoffice";

/* ═══════════════════════════════════════════
   HELPERS — Reusable UI pieces (Tailwind)
   ═══════════════════════════════════════════ */

export function StatCard({
  label,
  value,
  colorClass = "text-amber-500",
}: {
  label: string;
  value: string | number;
  colorClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-bold font-mono ${colorClass}`}>
        {value}
      </div>
    </div>
  );
}

export function ResultCard({
  label,
  value,
  colorClass = "text-amber-500",
  sub,
}: {
  label: string;
  value: string | number;
  colorClass?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-base font-bold font-mono ${colorClass}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

export function Highlight({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-5 text-center">
      <div className="text-sm font-semibold text-teal-700">{label}</div>
      <div className="mt-1.5 text-2xl font-bold font-mono text-teal-800">
        {value}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-400 focus:outline-none";
export const selectCls = inputCls;
