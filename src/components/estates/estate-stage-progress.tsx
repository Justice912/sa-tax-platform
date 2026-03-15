import { ESTATE_STAGE_VALUES } from "@/modules/estates/types";
import type { EstateStageCode } from "@/modules/estates/types";
import { cn } from "@/lib/utils";

function formatStageLabel(stage: EstateStageCode) {
  return stage.replaceAll("_", " ");
}

export function EstateStageProgress({ currentStage }: { currentStage: EstateStageCode }) {
  const currentIndex = ESTATE_STAGE_VALUES.indexOf(currentStage);

  return (
    <div className="grid gap-2 md:grid-cols-5 xl:grid-cols-10">
      {ESTATE_STAGE_VALUES.map((stage, index) => {
        const state =
          index < currentIndex
            ? "complete"
            : index === currentIndex
              ? "current"
              : "upcoming";

        return (
          <div
            key={stage}
            className={cn(
              "rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide",
              state === "complete" && "border-emerald-200 bg-emerald-50 text-emerald-700",
              state === "current" && "border-sky-200 bg-sky-50 text-sky-700",
              state === "upcoming" && "border-slate-200 bg-white text-slate-500",
            )}
          >
            {formatStageLabel(stage)}
          </div>
        );
      })}
    </div>
  );
}
