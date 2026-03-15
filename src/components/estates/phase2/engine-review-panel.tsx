import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import type { EstateEngineRunRecord } from "@/modules/estates/engines/types";

type Phase2Action = string | ((formData: FormData) => void | Promise<void>);

export function EngineReviewPanel({
  title,
  description,
  run,
  emptyState,
  workspaceHref,
  workspaceLabel,
  summaryRows,
  approveAction,
}: {
  title: string;
  description: string;
  run: EstateEngineRunRecord | null;
  emptyState: string;
  workspaceHref: string;
  workspaceLabel: string;
  summaryRows: Array<{ label: string; value: string }>;
  approveAction?: Phase2Action;
}) {
  const hasStaleDependency = run?.dependencyStates.some((dependency) => dependency.isStale) ?? false;
  const canApprove = Boolean(run && run.status !== "APPROVED" && approveAction);

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <CardDescription className="mt-1">{description}</CardDescription>

      {run ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={run.status} />
            {hasStaleDependency ? <StatusBadge value="STALE" /> : null}
            {run.reviewRequired && run.status !== "APPROVED" ? (
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Review pending
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {summaryRows.map((row) => (
              <div key={row.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {row.label}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">{row.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-900">Run metadata</p>
            <dl className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Last updated
                </dt>
                <dd className="mt-1 text-sm text-slate-700">{formatDate(run.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Approved by
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {run.approvedByName ? `${run.approvedByName} on ${formatDate(run.approvedAt)}` : "Pending approval"}
                </dd>
              </div>
            </dl>
          </div>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Dependency states</p>
            {run.dependencyStates.length > 0 ? (
              <div className="mt-3 space-y-2">
                {run.dependencyStates.map((dependency) => (
                  <div
                    key={`${dependency.engineType}-${dependency.runId ?? "none"}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {dependency.engineType.replaceAll("_", " ")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {dependency.runId ? `Run ${dependency.runId}` : "No linked run"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={dependency.status} />
                      {dependency.isStale ? <StatusBadge value="STALE" /> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">No upstream dependencies are required.</p>
            )}
          </section>

          {run.warnings.length > 0 ? (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">Warnings</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-800">
                {run.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Link
              href={workspaceHref}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
            >
              {workspaceLabel}
            </Link>

            {canApprove ? (
              <form action={approveAction}>
                <button
                  type="submit"
                  className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
                >
                  Approve Run
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {emptyState}
          </p>
          <Link
            href={workspaceHref}
            className="inline-flex rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            {workspaceLabel}
          </Link>
        </div>
      )}
    </Card>
  );
}
