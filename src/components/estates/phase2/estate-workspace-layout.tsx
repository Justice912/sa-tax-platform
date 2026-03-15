import Link from "next/link";
import type { ReactNode } from "react";
import type { EstateDetailRecord } from "@/modules/estates/types";
import { EstateTaxNav } from "@/components/estates/phase2/estate-tax-nav";

export function EstateWorkspaceLayout({
  estate,
  title,
  description,
  currentPath,
  children,
}: {
  estate: EstateDetailRecord;
  title: string;
  description: string;
  currentPath: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {estate.deceasedName} | {estate.estateReference}
          </p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <Link
          href={`/estates/${estate.id}`}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
        >
          Back to Estate
        </Link>
      </div>

      <EstateTaxNav estateId={estate.id} currentPath={currentPath} />

      {children}
    </div>
  );
}
