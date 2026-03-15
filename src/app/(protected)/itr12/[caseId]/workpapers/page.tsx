import Link from "next/link";
import { notFound } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getITR12Workspace, getITR12Workpapers } from "@/modules/itr12/itr12-service";

export default async function ITR12WorkpapersPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const workspace = await getITR12Workspace(caseId);

  if (!workspace) {
    notFound();
  }

  const workpapers = await getITR12Workpapers(caseId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">ITR12 Workpapers</h1>
          <p className="text-sm text-slate-600">
            {workspace.clientName} • Assessment {workspace.assessmentYear}
          </p>
        </div>
        <Link
          href={`/itr12/${caseId}`}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
        >
          Back to Workspace
        </Link>
      </div>

      <DataTable
        headers={["Code", "Workpaper", "Status", "Source", "Updated", "Notes"]}
        rows={workpapers.map((item) => [
          item.code,
          item.title,
          <StatusBadge key={`${item.id}-status`} value={item.status} />,
          item.sourceReference,
          new Date(item.updatedAt).toLocaleString("en-ZA"),
          item.notes ?? "-",
        ])}
      />
    </div>
  );
}

