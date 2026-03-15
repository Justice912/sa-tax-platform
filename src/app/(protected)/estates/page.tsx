import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { listEstates } from "@/modules/estates/service";
import { formatDate } from "@/lib/utils";

export default async function EstatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; status?: string }>;
}) {
  const params = await searchParams;
  const estates = await listEstates();
  const query = params.q?.trim().toLowerCase();

  const filtered = estates.filter((estate) => {
    const matchesQuery =
      !query ||
      estate.deceasedName.toLowerCase().includes(query) ||
      estate.estateReference.toLowerCase().includes(query) ||
      estate.executorName.toLowerCase().includes(query);
    const matchesStage = !params.stage || params.stage === "ALL" || estate.currentStage === params.stage;
    const matchesStatus = !params.status || params.status === "ALL" || estate.status === params.status;
    return matchesQuery && matchesStage && matchesStatus;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Deceased Estates</h1>
          <p className="text-sm text-slate-600">
            Manage estate intake, workflow stages, and liquidation readiness from one workspace.
          </p>
        </div>
        <Link
          href="/estates/new"
          className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
        >
          New Estate
        </Link>
      </div>

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr,220px,180px,auto]">
        <input
          type="text"
          name="q"
          defaultValue={params.q}
          placeholder="Search by deceased name, reference, executor..."
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select name="stage" defaultValue={params.stage ?? "ALL"} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="ALL">All stages</option>
          <option value="REPORTED">Reported</option>
          <option value="EXECUTOR_APPOINTED">Executor appointed</option>
          <option value="ASSETS_IDENTIFIED">Assets identified</option>
          <option value="VALUES_CAPTURED">Values captured</option>
          <option value="TAX_READINESS">Tax readiness</option>
          <option value="LD_DRAFTED">L&D drafted</option>
          <option value="LD_UNDER_REVIEW">L&D under review</option>
          <option value="DISTRIBUTION_READY">Distribution ready</option>
          <option value="DISTRIBUTED">Distributed</option>
          <option value="FINALISED">Finalised</option>
        </select>
        <select name="status" defaultValue={params.status ?? "ALL"} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On hold</option>
          <option value="FINALISED">Finalised</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white">Apply</button>
      </form>

      <DataTable
        headers={["Reference", "Deceased", "Stage", "Status", "Date of Death", "Executor", "Open"]}
        rows={filtered.map((estate) => [
          estate.estateReference,
          estate.deceasedName,
          <StatusBadge key={`${estate.id}-stage`} value={estate.currentStage} />,
          <StatusBadge key={`${estate.id}-status`} value={estate.status} />,
          formatDate(estate.dateOfDeath),
          estate.executorName,
          <Link
            key={`${estate.id}-open`}
            href={`/estates/${estate.id}`}
            className="text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            View
          </Link>,
        ])}
        emptyState="No estates match the current filters."
      />
    </div>
  );
}
