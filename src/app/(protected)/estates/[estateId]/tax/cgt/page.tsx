import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { EstateCgtWorkspace } from "@/components/estates/phase2/estate-cgt-workspace";
import { EngineReviewPanel } from "@/components/estates/phase2/engine-review-panel";
import { EstateWorkspaceLayout } from "@/components/estates/phase2/estate-workspace-layout";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listEstateEngineRuns } from "@/modules/estates/engines/repository";
import { estateCgtService } from "@/modules/estates/engines/cgt/service";
import { estateEngineService } from "@/modules/estates/engines/service";
import { readRequiredNumber } from "@/modules/estates/phase2/form-data";
import { saTaxYearFromDate } from "@/lib/utils";
import { buildEngineSummaryRows, selectLatestEngineRun } from "@/modules/estates/phase2/workspace-helpers";
import { getEstateById } from "@/modules/estates/service";

export default async function EstateCgtPage({
  params,
}: {
  params: Promise<{ estateId: string }>;
}) {
  const { estateId } = await params;
  const [estate, runs, session] = await Promise.all([
    getEstateById(estateId),
    listEstateEngineRuns(estateId),
    getServerSession(authOptions),
  ]);

  if (!estate) {
    notFound();
  }

  const run = selectLatestEngineRun(runs, "CGT_ON_DEATH");
  const actorName = session?.user?.name ?? "Estate workflow";
  const taxYear = saTaxYearFromDate(estate.dateOfDeath);

  async function approveRunAction() {
    "use server";

    if (!run) {
      return;
    }

    await estateEngineService.approveRun(run.id, actorName);
    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/tax/cgt`);
    revalidatePath(`/estates/${estateId}/filing-pack`);
  }

  async function createCgtRunAction(formData: FormData) {
    "use server";

    await estateCgtService.createCgtRun({
      estateId,
      taxYear: readRequiredNumber(formData, "taxYear") || taxYear,
    });

    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/tax/cgt`);
    revalidatePath(`/estates/${estateId}/tax/estate-duty`);
    revalidatePath(`/estates/${estateId}/filing-pack`);
  }

  return (
    <EstateWorkspaceLayout
      estate={estate}
      title="CGT on Death"
      description="Review deemed-disposal outputs, relief usage, and downstream dependency state before approving the CGT schedule."
      currentPath={`/estates/${estate.id}/tax/cgt`}
    >
      <section className="grid gap-4 xl:grid-cols-[1.25fr,0.95fr]">
        <EngineReviewPanel
          title="CGT on death engine"
          description="This run feeds both the estate-duty review and the formal SARS CGT-on-death schedule."
          run={run}
          emptyState="No CGT-on-death run has been created yet. Ensure valuation and asset inputs are complete before review."
          workspaceHref={`/estates/${estate.id}/tax/cgt`}
          workspaceLabel="Open CGT workspace"
          summaryRows={buildEngineSummaryRows(run)}
          approveAction={run ? approveRunAction : undefined}
        />

        <Card>
          <CardTitle>Asset readiness</CardTitle>
          <CardDescription className="mt-1">
            Assets with missing base cost or valuation-date support will surface as warnings in the engine output.
          </CardDescription>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>Total assets captured: {estate.assets.length}</p>
            <p>Primary residence flags: {estate.assets.filter((asset) => asset.isPrimaryResidence).length}</p>
            <p>Spouse rollover flags: {estate.assets.filter((asset) => asset.spouseRollover).length}</p>
          </div>
        </Card>
      </section>

      <EstateCgtWorkspace estate={estate} run={run} submitAction={createCgtRunAction} />
    </EstateWorkspaceLayout>
  );
}
