import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ESTATE_CHECKLIST_STATUS_VALUES, ESTATE_STAGE_VALUES } from "@/modules/estates/types";
import type { EstateDetailRecord } from "@/modules/estates/types";
import type { DocumentRecord } from "@/modules/shared/types";

function formatStageLabel(stage: string) {
  return stage.replaceAll("_", " ");
}

export function EstateDocuments({
  estate,
  linkedDocuments,
  checklistStatusAction,
}: {
  estate: EstateDetailRecord;
  linkedDocuments: DocumentRecord[];
  checklistStatusAction?: string | ((formData: FormData) => void | Promise<void>);
}) {
  const checklistGroups = ESTATE_STAGE_VALUES.map((stage) => ({
    stage,
    items: estate.checklistItems.filter((item) => item.stage === stage),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.1fr,1.2fr]">
        <Card>
          <CardTitle>Document Readiness</CardTitle>
          <CardDescription className="mt-1">
            Track supporting estate paperwork by workflow stage so the file is ready for the next
            operational step.
          </CardDescription>

          <div className="mt-4 space-y-4">
            {checklistGroups.map((group) => (
              <section key={group.stage} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {formatStageLabel(group.stage).toUpperCase()}
                </h3>
                <div className="mt-3 space-y-3">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        {item.notes ? (
                          <p className="mt-1 text-xs text-slate-500">{item.notes}</p>
                        ) : null}
                      </div>
                      {checklistStatusAction ? (
                        <form
                          action={checklistStatusAction}
                          className="flex flex-wrap items-end gap-2"
                        >
                          <input type="hidden" name="checklistItemId" value={item.id} />
                          <label className="space-y-1 text-sm text-slate-700">
                            <span className="sr-only">Status for {item.title}</span>
                            <select
                              name="status"
                              defaultValue={item.status}
                              aria-label={`Status for ${item.title}`}
                              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                            >
                              {ESTATE_CHECKLIST_STATUS_VALUES.map((status) => (
                                <option key={status} value={status}>
                                  {status.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="submit"
                            aria-label={`Update status for ${item.title}`}
                            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
                          >
                            Update
                          </button>
                        </form>
                      ) : (
                        <StatusBadge value={item.status} />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>Linked Estate Documents</CardTitle>
            <CardDescription className="mt-1">
              {linkedDocuments.length} linked document
              {linkedDocuments.length === 1 ? "" : "s"} currently available for this estate.
            </CardDescription>
          </Card>

          <DataTable
            headers={["File", "Category", "Uploaded", "By", "Tags"]}
            rows={linkedDocuments.map((document) => [
              document.fileName,
              document.category,
              document.uploadedAt,
              document.uploadedBy,
              document.tags.join(", "),
            ])}
            emptyState="No linked estate documents available yet."
          />
        </div>
      </section>

      <Card>
        <CardTitle>Readiness Snapshot</CardTitle>
        <CardDescription className="mt-1">
          {estate.deceasedName} is currently at {formatStageLabel(estate.currentStage)} with{" "}
          {estate.checklistItems.filter((item) => item.status === "COMPLETE").length} completed
          checklist items.
        </CardDescription>
      </Card>
    </div>
  );
}
