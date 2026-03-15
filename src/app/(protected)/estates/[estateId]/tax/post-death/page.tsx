import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { EngineReviewPanel } from "@/components/estates/phase2/engine-review-panel";
import { EstateWorkspaceLayout } from "@/components/estates/phase2/estate-workspace-layout";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listEstateEngineRuns } from "@/modules/estates/engines/repository";
import { estateEngineService } from "@/modules/estates/engines/service";
import { buildEngineSummaryRows, selectLatestEngineRun } from "@/modules/estates/phase2/workspace-helpers";
import { getEstateById } from "@/modules/estates/service";

export default async function EstatePostDeathPage({
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

  const run = selectLatestEngineRun(runs, "POST_DEATH_IT_AE");
  const actorName = session?.user?.name ?? "Estate workflow";

  async function approveRunAction() {
    "use server";

    if (!run) {
      return;
    }

    await estateEngineService.approveRun(run.id, actorName);
    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/tax/post-death`);
    revalidatePath(`/estates/${estateId}/filing-pack`);
  }

  return (
    <EstateWorkspaceLayout
      estate={estate}
      title="Post-death IT-AE"
      description="Review the estate-income tax run and confirm the applied rate before adding it to the formal filing pack."
      currentPath={`/estates/${estate.id}/tax/post-death`}
    >
      <section className="grid gap-4 xl:grid-cols-[1.25fr,0.95fr]">
        <EngineReviewPanel
          title="Post-death IT-AE engine"
          description="This run governs the estate’s post-death income tax position for the selected year pack."
          run={run}
          emptyState="No post-death IT-AE run has been created yet. Add income schedules and deductions before review."
          workspaceHref={`/estates/${estate.id}/tax/post-death`}
          workspaceLabel="Open post-death workspace"
          summaryRows={buildEngineSummaryRows(run)}
          approveAction={run ? approveRunAction : undefined}
        />

        <Card>
          <CardTitle>Estate administration context</CardTitle>
          <CardDescription className="mt-1">
            Use this workspace once estate-income schedules are complete and the L&amp;D timeline is ready for tax review.
          </CardDescription>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>Current estate stage: {estate.currentStage.replaceAll("_", " ")}</p>
            <p>Notes: {estate.notes ?? "No internal estate notes recorded yet."}</p>
          </div>
        </Card>
      </section>
    </EstateWorkspaceLayout>
  );
}
