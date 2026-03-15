import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { EstimateWizard } from "@/components/individual-tax/estimate-wizard";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listClients } from "@/modules/clients/client-service";
import {
  buildNearEfilingFormValues,
  parseNearEfilingEstimateFormData,
} from "@/modules/individual-tax/near-efiling-form";
import {
  getIndividualTaxAssessmentResult,
  updateIndividualTaxAssessmentInput,
  updateNearEfilingEstimateInput,
} from "@/modules/individual-tax/service";

function readFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readFormNumber(formData: FormData, key: string) {
  const raw = readFormString(formData, key);
  if (!raw) {
    return 0;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export default async function EditIndividualTaxAssessmentPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const result = await getIndividualTaxAssessmentResult(assessmentId);

  if (!result) {
    notFound();
  }

  const { assessment } = result;

  async function updateAssessmentAction(formData: FormData) {
    "use server";

    const rateInput = readFormNumber(formData, "effectiveTaxRate");
    const effectiveTaxRate = rateInput > 1 ? rateInput / 100 : rateInput;

    await updateIndividualTaxAssessmentInput(assessmentId, {
      assessmentYear: Math.trunc(readFormNumber(formData, "assessmentYear")),
      salaryIncome: readFormNumber(formData, "salaryIncome"),
      localInterest: readFormNumber(formData, "localInterest"),
      travelAllowance: readFormNumber(formData, "travelAllowance"),
      retirementContributions: readFormNumber(formData, "retirementContributions"),
      travelDeduction: readFormNumber(formData, "travelDeduction"),
      rebates: readFormNumber(formData, "rebates"),
      medicalTaxCredit: readFormNumber(formData, "medicalTaxCredit"),
      paye: readFormNumber(formData, "paye"),
      priorAssessmentDebitOrCredit: readFormNumber(formData, "priorAssessmentDebitOrCredit"),
      effectiveTaxRate,
    });

    revalidatePath("/individual-tax");
    revalidatePath(`/individual-tax/${assessmentId}`);
    redirect(`/individual-tax/${assessmentId}`);
  }

  async function updateNearEfilingAction(formData: FormData) {
    "use server";

    const payload = parseNearEfilingEstimateFormData(formData);
    await updateNearEfilingEstimateInput(assessmentId, payload.input);

    revalidatePath("/individual-tax");
    revalidatePath(`/individual-tax/${assessmentId}`);
    redirect(`/individual-tax/${assessmentId}`);
  }

  if (
    assessment.assessmentMode === "NEAR_EFILING_ESTIMATE" &&
    assessment.nearEfilingInput
  ) {
    const clients = (await listClients())
      .filter((client) => client.clientType === "INDIVIDUAL")
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Edit Near-eFiling Estimate</h1>
            <p className="text-sm text-slate-600">
              {assessment.taxpayerName} - Ref {assessment.referenceNumber}
            </p>
          </div>
          <Link
            href={`/individual-tax/${assessmentId}`}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Back to Assessment
          </Link>
        </div>

        <EstimateWizard
          mode="edit"
          clients={clients}
          defaultClientId={assessment.clientId}
          defaultValues={buildNearEfilingFormValues({
            clientId: assessment.clientId ?? clients[0]?.id ?? "",
            referenceNumber: assessment.referenceNumber,
            taxpayerName: assessment.taxpayerName,
            assessmentDate: assessment.assessmentDate,
            input: assessment.nearEfilingInput,
          })}
          action={updateNearEfilingAction}
          cancelHref={`/individual-tax/${assessmentId}`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Edit Individual Tax Input</h1>
          <p className="text-sm text-slate-600">
            {assessment.taxpayerName} - Ref {assessment.referenceNumber}
          </p>
        </div>
        <Link
          href={`/individual-tax/${assessmentId}`}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
        >
          Back to Assessment
        </Link>
      </div>

      <Card>
        <CardTitle>Calculation Input</CardTitle>
        <CardDescription className="mt-1">
          Update and recalculate the legacy assessment output. Review status remains required.
        </CardDescription>
        <form action={updateAssessmentAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Assessment Year</span>
            <input
              type="number"
              name="assessmentYear"
              min={2000}
              max={2100}
              defaultValue={assessment.assessmentYear}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Salary Income (ZAR)</span>
            <input type="number" name="salaryIncome" step="0.01" min="0" defaultValue={assessment.input.salaryIncome} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Local Interest (ZAR)</span>
            <input type="number" name="localInterest" step="0.01" min="0" defaultValue={assessment.input.localInterest} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Travel Allowance (ZAR)</span>
            <input type="number" name="travelAllowance" step="0.01" min="0" defaultValue={assessment.input.travelAllowance} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Retirement Contributions (ZAR)</span>
            <input type="number" name="retirementContributions" step="0.01" min="0" defaultValue={assessment.input.retirementContributions} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Travel Deduction (ZAR)</span>
            <input type="number" name="travelDeduction" step="0.01" min="0" defaultValue={assessment.input.travelDeduction} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Rebates (ZAR)</span>
            <input type="number" name="rebates" step="0.01" min="0" defaultValue={assessment.input.rebates} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Medical Tax Credit (ZAR)</span>
            <input type="number" name="medicalTaxCredit" step="0.01" min="0" defaultValue={assessment.input.medicalTaxCredit} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">PAYE (ZAR)</span>
            <input type="number" name="paye" step="0.01" min="0" defaultValue={assessment.input.paye} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Prior Assessment Debit/(Credit) (ZAR)</span>
            <input type="number" name="priorAssessmentDebitOrCredit" step="0.01" defaultValue={assessment.input.priorAssessmentDebitOrCredit} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Effective Tax Rate (decimal or %)</span>
            <input
              type="number"
              name="effectiveTaxRate"
              step="0.00001"
              min="0"
              defaultValue={assessment.input.effectiveTaxRate}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
            >
              Save and Recalculate
            </button>
            <Link
              href={`/individual-tax/${assessmentId}`}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
