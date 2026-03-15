import Link from "next/link";
import { EstateReportActions } from "@/components/estates/phase2/estate-report-actions";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FilingPackArtifactActions } from "@/components/estates/phase2/filing-pack-artifact-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import type { EstateFilingPackManifest } from "@/modules/estates/forms/types";

export function FilingPackStatus({
  estateId,
  taxYear,
  manifest,
  readiness,
  detail,
}: {
  estateId: string;
  taxYear: number;
  manifest: EstateFilingPackManifest | null;
  readiness: "READY" | "BLOCKED";
  detail: string;
}) {
  const ready = readiness === "READY";

  return (
    <Card>
      <CardTitle>{ready ? "Filing Pack Ready" : "Filing Pack Blocked"}</CardTitle>
      <CardDescription className="mt-1">{detail}</CardDescription>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge value={readiness} />
        {manifest ? (
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {manifest.artifacts.length} artifacts
          </span>
        ) : null}
      </div>

      {manifest ? (
        <div className="mt-4 space-y-2">
          {manifest.artifacts.map((artifact) => (
            <div
              key={artifact.code}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{artifact.title}</p>
                <p className="text-xs text-slate-500">
                  {artifact.code.replaceAll("_", " ")} | Template {artifact.templateVersion}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={artifact.status} />
                <FilingPackArtifactActions
                  estateId={estateId}
                  taxYear={taxYear}
                  artifactCode={artifact.code}
                  artifactTitle={artifact.title}
                  outputFormat={artifact.outputFormat}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/estates/${estateId}/filing-pack`}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
        >
          Open Filing Workspace
        </Link>
        {ready ? (
          <EstateReportActions
            estateId={estateId}
            taxYear={taxYear}
            bundle="zip"
            resourceLabel="Filing pack ZIP"
            actions={[{ kind: "download", label: "Download Filing Pack ZIP", tone: "primary" }]}
          />
        ) : null}
      </div>
    </Card>
  );
}
