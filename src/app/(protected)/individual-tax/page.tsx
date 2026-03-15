import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { listIndividualTaxAssessments } from "@/modules/individual-tax/service";

export default async function IndividualTaxPage() {
  const assessments = await listIndividualTaxAssessments();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Individual Tax Calculator</h1>
          <p className="text-sm text-slate-600">
            Near-eFiling estimates and legacy individual assessment workflow.
          </p>
        </div>
        <Link
          href="/individual-tax/new"
          className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
        >
          New Estimate
        </Link>
      </div>

      <DataTable
        headers={[
          "Reference",
          "Taxpayer",
          "Assessment Date",
          "Year",
          "Mode",
          "Status",
          "Open",
        ]}
        rows={assessments.map((entry) => [
          entry.referenceNumber,
          entry.taxpayerName,
          entry.assessmentDate,
          entry.assessmentYear.toString(),
          entry.assessmentMode === "NEAR_EFILING_ESTIMATE" ? "Near-eFiling" : "Legacy",
          <StatusBadge key={`${entry.id}-status`} value={entry.status} />,
          <Link
            key={`${entry.id}-open`}
            href={`/individual-tax/${entry.id}`}
            className="text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            View
          </Link>,
        ])}
      />
    </div>
  );
}
