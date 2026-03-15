import { cn } from "@/lib/utils";

const statusColorMap: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-sky-50 text-sky-700 border-sky-200",
  AWAITING_DOCUMENTS: "bg-orange-50 text-orange-700 border-orange-200",
  UNDER_REVIEW: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SUBMITTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
  HIGH: "bg-rose-50 text-rose-700 border-rose-200",
  CRITICAL: "bg-rose-100 text-rose-800 border-rose-300",
  REVIEW_REQUIRED: "bg-yellow-50 text-yellow-700 border-yellow-200",
  INTERNAL_REVIEW: "bg-blue-50 text-blue-700 border-blue-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ON_HOLD: "bg-amber-50 text-amber-700 border-amber-200",
  REPORTED: "bg-slate-100 text-slate-700 border-slate-200",
  EXECUTOR_APPOINTED: "bg-blue-50 text-blue-700 border-blue-200",
  ASSETS_IDENTIFIED: "bg-sky-50 text-sky-700 border-sky-200",
  VALUES_CAPTURED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  TAX_READINESS: "bg-violet-50 text-violet-700 border-violet-200",
  LD_DRAFTED: "bg-teal-50 text-teal-700 border-teal-200",
  LD_UNDER_REVIEW: "bg-yellow-50 text-yellow-700 border-yellow-200",
  DISTRIBUTION_READY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DISTRIBUTED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  FINALISED: "bg-slate-100 text-slate-700 border-slate-200",
  READY: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const normalized = value.toUpperCase();
  const style = statusColorMap[normalized] ?? "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        style,
        className,
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

