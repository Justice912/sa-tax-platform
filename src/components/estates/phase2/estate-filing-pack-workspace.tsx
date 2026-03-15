import { FilingPackStatus } from "@/components/estates/phase2/filing-pack-status";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { EstateFilingPackManifest } from "@/modules/estates/forms/types";
import type { EstateFilingPackEngineReadiness } from "@/modules/estates/phase2/workspace-helpers";

export function EstateFilingPackWorkspace({
  estateId,
  taxYear,
  manifest,
  readiness,
  detail,
  requiredEngines,
}: {
  estateId: string;
  taxYear: number;
  manifest: EstateFilingPackManifest | null;
  readiness: "READY" | "BLOCKED";
  detail: string;
  requiredEngines: EstateFilingPackEngineReadiness[];
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
      <Card>
        <CardTitle>Required engine approvals</CardTitle>
        <CardDescription className="mt-1">
          Filing-pack generation is unlocked only when each upstream engine has a current approved
          run for the selected estate year pack.
        </CardDescription>

        <div className="mt-4 space-y-2">
          {requiredEngines.map((engine) => (
            <div
              key={engine.engineType}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">
                  {engine.engineType.replaceAll("_", " ")}
                </p>
                <StatusBadge value={engine.status} />
              </div>
              <p className="mt-2 text-sm text-slate-600">{engine.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <FilingPackStatus
        estateId={estateId}
        taxYear={taxYear}
        manifest={manifest}
        readiness={readiness}
        detail={detail}
      />

      {manifest ? (
        <Card className="xl:col-span-2">
          <CardTitle>Artifact provenance</CardTitle>
          <CardDescription className="mt-1">
            Confirm which approved engine run feeds each formal SARS or Master output.
          </CardDescription>

          <div className="mt-4 space-y-2">
            {manifest.artifacts.map((artifact) => (
              <div
                key={artifact.code}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{artifact.title}</p>
                  <StatusBadge value={artifact.status} />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {artifact.code.replaceAll("_", " ")} | Source run {artifact.sourceRunId ?? "n/a"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </section>
  );
}
