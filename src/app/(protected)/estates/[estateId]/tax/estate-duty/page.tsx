import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { EstateDutyWorkspace } from "@/components/estates/phase2/estate-duty-workspace";
import { EngineReviewPanel } from "@/components/estates/phase2/engine-review-panel";
import { EstateWorkspaceLayout } from "@/components/estates/phase2/estate-workspace-layout";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listEstateEngineRuns } from "@/modules/estates/engines/repository";
import { estateDutyService } from "@/modules/estates/engines/estate-duty/service";
import { estateEngineService } from "@/modules/estates/engines/service";
import { readRequiredNumber } from "@/modules/estates/phase2/form-data";
import { saTaxYearFromDate } from "@/lib/utils";
import {
  buildEngineSummaryRows,
  buildEstateDutyDependencyStates,
  selectLatestEngineRun,
} from "@/modules/estates/phase2/workspace-helpers";
import { getEstateById } from "@/modules/estates/service";

export default async function EstateDutyPage({
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

  const run = selectLatestEngineRun(runs, "ESTATE_DUTY");
  const actorName = session?.user?.name ?? "Estate workflow";
  const taxYear = saTaxYearFromDate(estate.dateOfDeath);
  const dependencyStates = buildEstateDutyDependencyStates(estate, runs);

  async function approveRunAction() {
    "use server";

    if (!run) {
      return;
    }

    await estateEngineService.approveRun(run.id, actorName);
    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/tax/estate-duty`);
    revalidatePath(`/estates/${estateId}/filing-pack`);
  }

  async function createEstateDutyRunAction(formData: FormData) {
    "use server";

    const [currentEstate, currentRuns] = await Promise.all([
      getEstateById(estateId),
      listEstateEngineRuns(estateId),
    ]);

    if (!currentEstate) {
      throw new Error("Estate not found.");
    }

    await estateDutyService.createEstateDutyRun({
      estateId,
      taxYear: readRequiredNumber(formData, "taxYear") || taxYear,
      section4Deductions: readRequiredNumber(formData, "section4Deductions"),
      spouseDeduction: readRequiredNumber(formData, "spouseDeduction"),
      dependencyStates: buildEstateDutyDependencyStates(currentEstate, currentRuns),
    });

    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/tax/estate-duty`);
    revalidatePath(`/estates/${estateId}/filing-pack`);
  }

  return (
    <EstateWorkspaceLayout
      estate={estate}
      title="Estate Duty"
      description="Confirm gross-estate, deduction, and abatement outputs before releasing the Rev267 summary into the filing pack."
      currentPath={`/estates/${estate.id}/tax/estate-duty`}
    >
      <section className="grid gap-4 xl:grid-cols-[1.25fr,0.95fr]">
        <EngineReviewPanel
          title="Estate-duty engine"
          description="Approval here depends on current CGT and valuation outputs where the estate requires them."
          run={run}
          emptyState="No estate-duty run has been created yet. Approve valuation and CGT outputs first where applicable."
          workspaceHref={`/estates/${estate.id}/tax/estate-duty`}
          workspaceLabel="Open estate-duty workspace"
          summaryRows={buildEngineSummaryRows(run)}
          approveAction={run ? approveRunAction : undefined}
        />

        <Card>
          <CardTitle>Estate totals</CardTitle>
          <CardDescription className="mt-1">
            Estate-duty calculations combine gross assets, liabilities, and statutory deductions from the estate file.
          </CardDescription>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>Gross date-of-death assets: {estate.assets.length}</p>
            <p>Recorded liabilities: {estate.liabilities.length}</p>
            <p>Beneficiaries on file: {estate.beneficiaries.length}</p>
          </div>
        </Card>
      </section>

      <EstateDutyWorkspace
        estate={estate}
        run={run}
        dependencyStates={dependencyStates}
        submitAction={createEstateDutyRunAction}
      />
    </EstateWorkspaceLayout>
  );
}
