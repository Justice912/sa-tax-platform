import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getITR12Timeline, getITR12Workspace } from "@/modules/itr12/itr12-service";

export default async function ITR12WorkspacePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const workspace = await getITR12Workspace(caseId);

  if (!workspace) {
    notFound();
  }

  const timeline = await getITR12Timeline(caseId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{workspace.title}</h1>
          <p className="text-sm text-slate-600">
            {workspace.clientName} • Assessment {workspace.assessmentYear} •{" "}
            {workspace.periodStart} to {workspace.periodEnd}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={workspace.workflowState} />
          <StatusBadge value={workspace.reviewState} />
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardDescription>Assigned User</CardDescription>
          <CardTitle className="mt-2">{workspace.assignedUserName}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Due Date</CardDescription>
          <CardTitle className="mt-2">{workspace.dueDate}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Workflow Stage</CardDescription>
          <CardTitle className="mt-2">{workspace.workflowState.replaceAll("_", " ")}</CardTitle>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Review Assumptions</CardTitle>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {workspace.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>ITR12 Workspace</CardTitle>
          <CardDescription className="mt-1">
            Continue to workpapers and calculation scaffolds.
          </CardDescription>
          <div className="mt-4 grid gap-2">
            <Link
              href={`/itr12/${caseId}/workpapers`}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
            >
              Open Workpapers
            </Link>
            <Link
              href={`/itr12/${caseId}/calculation`}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
            >
              Open Calculation Scaffold
            </Link>
          </div>
        </Card>
      </section>

      <Card>
        <CardTitle>Workflow Timeline</CardTitle>
        <CardDescription className="mt-1">
          State transition history with actor and summary.
        </CardDescription>
        <div className="mt-4 space-y-3">
          {timeline.map((event) => (
            <div key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {event.fromState.replaceAll("_", " ")} → {event.toState.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(event.createdAt).toLocaleString("en-ZA")}
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-700">{event.summary}</p>
              <p className="mt-1 text-xs text-slate-500">{event.actorName}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

