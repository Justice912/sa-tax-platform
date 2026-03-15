import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { EstatePreDeathWorkspace } from "@/components/estates/phase2/estate-pre-death-workspace";
import { EngineReviewPanel } from "@/components/estates/phase2/engine-review-panel";
import { EstateWorkspaceLayout } from "@/components/estates/phase2/estate-workspace-layout";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listEstateEngineRuns } from "@/modules/estates/engines/repository";
import { estateEngineService } from "@/modules/estates/engines/service";
import { estatePreDeathService } from "@/modules/estates/engines/pre-death/service";
import {
  readBoolean,
  readRequiredNumber,
  readRequiredString,
} from "@/modules/estates/phase2/form-data";
import { saTaxYearFromDate } from "@/lib/utils";
import { buildEngineSummaryRows, selectLatestEngineRun } from "@/modules/estates/phase2/workspace-helpers";
import { getEstateById } from "@/modules/estates/service";

export default async function EstatePreDeathTaxPage({
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

  const run = selectLatestEngineRun(runs, "PRE_DEATH_ITR12");
  const actorName = session?.user?.name ?? "Estate workflow";
  const taxYear = saTaxYearFromDate(estate.dateOfDeath);

  async function approveRunAction() {
    "use server";

    if (!run) {
      return;
    }

    await estateEngineService.approveRun(run.id, actorName);
    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/tax/pre-death`);
    revalidatePath(`/estates/${estateId}/filing-pack`);
  }

  async function createPreDeathRunAction(formData: FormData) {
    "use server";

    await estatePreDeathService.createPreDeathRun({
      estateId,
      taxYear: readRequiredNumber(formData, "taxYear") || taxYear,
      incomePeriodStart: readRequiredString(formData, "incomePeriodStart"),
      incomePeriodEnd: readRequiredString(formData, "incomePeriodEnd"),
      medicalAidMembers: readRequiredNumber(formData, "medicalAidMembers"),
      medicalAidMonths: readRequiredNumber(formData, "medicalAidMonths"),
      employment: {
        salaryIncome: readRequiredNumber(formData, "employmentSalaryIncome"),
        bonusIncome: readRequiredNumber(formData, "employmentBonusIncome"),
        commissionIncome: readRequiredNumber(formData, "employmentCommissionIncome"),
        fringeBenefits: readRequiredNumber(formData, "employmentFringeBenefits"),
        otherTaxableEmploymentIncome: readRequiredNumber(formData, "employmentOtherTaxableIncome"),
        payeWithheld: readRequiredNumber(formData, "employmentPayeWithheld"),
      },
      travel: {
        hasTravelAllowance: readBoolean(formData, "travelHasTravelAllowance"),
        travelAllowance: readRequiredNumber(formData, "travelAllowance"),
        businessKilometres: readRequiredNumber(formData, "travelBusinessKilometres"),
        totalKilometres: readRequiredNumber(formData, "travelTotalKilometres"),
        vehicleCost: readRequiredNumber(formData, "travelVehicleCost"),
        vehiclePurchaseDate: readRequiredString(formData, "travelVehiclePurchaseDate"),
      },
      medical: {
        medicalSchemeContributions: readRequiredNumber(formData, "medicalSchemeContributions"),
        qualifyingOutOfPocketExpenses: readRequiredNumber(formData, "medicalOutOfPocketExpenses"),
        disabilityFlag: readBoolean(formData, "medicalDisabilityFlag"),
      },
      interest: {
        localInterest: readRequiredNumber(formData, "interestLocalInterest"),
      },
      rental: {
        grossRentalIncome: readRequiredNumber(formData, "rentalGrossIncome"),
        deductibleRentalExpenses: readRequiredNumber(formData, "rentalDeductibleExpenses"),
      },
      soleProprietor: {
        grossBusinessIncome: readRequiredNumber(formData, "soleProprietorGrossIncome"),
        deductibleBusinessExpenses: readRequiredNumber(formData, "soleProprietorDeductibleExpenses"),
      },
      deductions: {
        retirementContributions: readRequiredNumber(
          formData,
          "deductionsRetirementContributions",
        ),
        donationsUnderSection18A: readRequiredNumber(
          formData,
          "deductionsDonationsUnderSection18A",
        ),
        priorAssessmentDebitOrCredit: readRequiredNumber(
          formData,
          "deductionsPriorAssessmentDebitOrCredit",
        ),
      },
    });

    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/tax/pre-death`);
    revalidatePath(`/estates/${estateId}/filing-pack`);
  }

  return (
    <EstateWorkspaceLayout
      estate={estate}
      title="Pre-death ITR12"
      description="Review the deceased taxpayer’s truncated income-tax position before finalising the death-year filing pack."
      currentPath={`/estates/${estate.id}/tax/pre-death`}
    >
      <section className="grid gap-4 xl:grid-cols-[1.25fr,0.95fr]">
        <EngineReviewPanel
          title="Pre-death ITR12 engine"
          description="Confirm the transformed taxpayer input and approval status before downstream filing-pack generation."
          run={run}
          emptyState="No pre-death ITR12 run has been created yet. Complete the income-period inputs before this workspace can be reviewed."
          workspaceHref={`/estates/${estate.id}/tax/pre-death`}
          workspaceLabel="Open pre-death workspace"
          summaryRows={buildEngineSummaryRows(run)}
          approveAction={run ? approveRunAction : undefined}
        />

        <Card>
          <CardTitle>Taxpayer profile</CardTitle>
          <CardDescription className="mt-1">
            The pre-death return uses the deceased taxpayer’s identity and the date of death as the truncated period end.
          </CardDescription>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>Deceased taxpayer: {estate.deceasedName}</p>
            <p>Tax number: {estate.taxNumber ?? "Not recorded"}</p>
            <p>Date of death: {estate.dateOfDeath}</p>
          </div>
        </Card>
      </section>

      <EstatePreDeathWorkspace
        estate={estate}
        run={run}
        submitAction={createPreDeathRunAction}
      />
    </EstateWorkspaceLayout>
  );
}
