import { notFound } from "next/navigation";
import { EstateFilingPackWorkspace } from "@/components/estates/phase2/estate-filing-pack-workspace";
import { EstateWorkspaceLayout } from "@/components/estates/phase2/estate-workspace-layout";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listEstateEngineRuns } from "@/modules/estates/engines/repository";
import { estateFilingPackService } from "@/modules/estates/forms/service";
import type { EstateFilingPackManifest } from "@/modules/estates/forms/types";
import { saTaxYearFromDate } from "@/lib/utils";
import { buildEstateFilingPackReadiness } from "@/modules/estates/phase2/workspace-helpers";
import { getEstateById } from "@/modules/estates/service";

export default async function EstateFilingPackPage({
  params,
}: {
  params: Promise<{ estateId: string }>;
}) {
  const { estateId } = await params;
  const [estate, runs] = await Promise.all([getEstateById(estateId), listEstateEngineRuns(estateId)]);

  if (!estate) {
    notFound();
  }

  const taxYear = saTaxYearFromDate(estate.dateOfDeath);
  const requiredEngines = buildEstateFilingPackReadiness(runs);
  let manifest: EstateFilingPackManifest | null = null;
  let readiness: "READY" | "BLOCKED" = "BLOCKED";
  let detail = "Approve the required engine runs before the filing pack can be generated.";

  try {
    manifest = await estateFilingPackService.generateFilingPackManifest({
      estateId,
      taxYear,
    });
    readiness = "READY";
    detail = "All required engine runs are approved and the formal filing pack is ready to generate.";
  } catch (error) {
    detail = error instanceof Error ? error.message : detail;
  }

  return (
    <EstateWorkspaceLayout
      estate={estate}
      title="Filing Pack"
      description="Check whether formal SARS and Master outputs are ready, then generate the filing pack directly from the approved estate runs."
      currentPath={`/estates/${estate.id}/filing-pack`}
    >
      <Card>
        <CardTitle>Pack scope</CardTitle>
        <CardDescription className="mt-1">
          The current filing pack includes valuation, pre-death, CGT-on-death, estate-duty,
          post-death, and Master outputs for the selected year pack.
        </CardDescription>
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <p>Estate reference: {estate.estateReference}</p>
          <p>Tax year: {taxYear}</p>
          <p>Current stage: {estate.currentStage.replaceAll("_", " ")}</p>
        </div>
      </Card>

      <EstateFilingPackWorkspace
        estateId={estate.id}
        taxYear={taxYear}
        manifest={manifest}
        readiness={readiness}
        detail={detail}
        requiredEngines={requiredEngines}
      />
    </EstateWorkspaceLayout>
  );
}
