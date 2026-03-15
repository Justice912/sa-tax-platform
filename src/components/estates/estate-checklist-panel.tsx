import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { EstateChecklistItemRecord } from "@/modules/estates/types";

export function EstateChecklistPanel({
  checklistItems,
}: {
  checklistItems: EstateChecklistItemRecord[];
}) {
  const completedCount = checklistItems.filter((item) => item.status === "COMPLETE" || item.status === "NOT_APPLICABLE").length;

  return (
    <Card>
      <CardTitle>Checklist Progress</CardTitle>
      <CardDescription className="mt-1">
        {completedCount} of {checklistItems.length} operational checklist items completed.
      </CardDescription>
      <div className="mt-4 space-y-3">
        {checklistItems.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.stage.replaceAll("_", " ")}</p>
              </div>
              <StatusBadge value={item.status} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
