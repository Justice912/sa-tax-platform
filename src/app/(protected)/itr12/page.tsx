import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { listITR12Workspaces } from "@/modules/itr12/itr12-service";

export default async function ITR12ListPage() {
  const workspaces = await listITR12Workspaces();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">ITR12 Workflow Engine (2026 Scaffold)</h1>
        <p className="text-sm text-slate-600">
          Manage workflow stages, working papers, and review-required scaffold calculations for individual returns.
        </p>
      </div>

      <DataTable
        headers={[
          "Case",
          "Client",
          "Assessment Year",
          "Workflow",
          "Review",
          "Due Date",
          "Assigned",
          "Open",
        ]}
        rows={workspaces.map((entry) => [
          entry.title,
          entry.clientName,
          entry.assessmentYear.toString(),
          <StatusBadge key={`${entry.caseId}-workflow`} value={entry.workflowState} />,
          <StatusBadge key={`${entry.caseId}-review`} value={entry.reviewState} />,
          entry.dueDate,
          entry.assignedUserName,
          <Link
            key={`${entry.caseId}-open`}
            href={`/itr12/${entry.caseId}`}
            className="text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            Workspace
          </Link>,
        ])}
      />
    </div>
  );
}

