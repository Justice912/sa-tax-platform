import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import type { EstateDetailRecord } from "@/modules/estates/types";

function formatStageLabel(stage?: string) {
  return stage ? stage.replaceAll("_", " ") : "Initial stage captured";
}

export function EstateTimeline({ estate }: { estate: EstateDetailRecord }) {
  const sortedEvents = [...estate.stageEvents].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Estate Timeline</CardTitle>
        <CardDescription className="mt-1">
          Review the estate’s workflow history, responsible actors, and stage transitions over time.
        </CardDescription>
      </Card>

      <div className="space-y-4">
        {sortedEvents.map((event) => (
          <Card key={event.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{event.summary}</CardTitle>
                <CardDescription className="mt-1">
                  {formatDate(event.createdAt)} | {event.actorName}
                </CardDescription>
              </div>
              <StatusBadge value={event.toStage} />
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p className="font-medium">
                {event.fromStage
                  ? `${formatStageLabel(event.fromStage).toUpperCase()} -> ${formatStageLabel(event.toStage).toUpperCase()}`
                  : "Initial stage captured"}
              </p>
              {event.fromStage ? (
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {formatStageLabel(event.fromStage)} to {formatStageLabel(event.toStage)}
                </p>
              ) : (
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {formatStageLabel(event.toStage)}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
