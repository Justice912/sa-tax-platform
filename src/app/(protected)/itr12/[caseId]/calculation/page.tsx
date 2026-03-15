import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getITR12Calculation,
  getITR12CalculationInput,
  getITR12Workspace,
  saveITR12CalculationForCase,
} from "@/modules/itr12/itr12-service";

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

export default async function ITR12CalculationPage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { caseId } = await params;
  const query = await searchParams;
  const workspace = await getITR12Workspace(caseId);
  const input = await getITR12CalculationInput(caseId);
  const calculation = await getITR12Calculation(caseId);

  if (!workspace || !calculation || !input) {
    notFound();
  }

  async function saveCalculationAction(formData: FormData) {
    "use server";

    const rateInput = readFormNumber(formData, "estimatedTaxRate");
    const estimatedTaxRate = rateInput > 1 ? rateInput / 100 : rateInput;

    await saveITR12CalculationForCase(caseId, {
      assessmentYear: Math.trunc(readFormNumber(formData, "assessmentYear")),
      employmentIncome: readFormNumber(formData, "employmentIncome"),
      otherIncome: readFormNumber(formData, "otherIncome"),
      deductionsExcludingRetirement: readFormNumber(formData, "deductionsExcludingRetirement"),
      retirementContribution: readFormNumber(formData, "retirementContribution"),
      retirementContributionCap: readFormNumber(formData, "retirementContributionCap"),
      payeWithheld: readFormNumber(formData, "payeWithheld"),
      provisionalPayments: readFormNumber(formData, "provisionalPayments"),
      medicalTaxCredit: readFormNumber(formData, "medicalTaxCredit"),
      estimatedTaxRate,
    });

    revalidatePath(`/itr12/${caseId}/calculation`);
    redirect(`/itr12/${caseId}/calculation?saved=1`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">ITR12 Calculation Scaffold</h1>
          <p className="text-sm text-slate-600">
            {workspace.clientName} - Assessment {calculation.assessmentYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={calculation.reviewStatus} />
          <Link
            href={`/itr12/${caseId}`}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Back to Workspace
          </Link>
        </div>
      </div>

      {query.saved === "1" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          Calculation input saved and recalculated.
        </div>
      ) : null}

      <Card>
        <CardTitle>Interactive Input</CardTitle>
        <CardDescription className="mt-1">
          Update calculation assumptions and save. Output remains review-required.
        </CardDescription>
        <form action={saveCalculationAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Assessment Year</span>
            <input
              type="number"
              name="assessmentYear"
              min={2000}
              max={2100}
              defaultValue={input.assessmentYear}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Employment Income (ZAR)</span>
            <input type="number" name="employmentIncome" step="0.01" min="0" defaultValue={input.employmentIncome} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Other Income (ZAR)</span>
            <input type="number" name="otherIncome" step="0.01" min="0" defaultValue={input.otherIncome} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Deductions Excl. Retirement (ZAR)</span>
            <input type="number" name="deductionsExcludingRetirement" step="0.01" min="0" defaultValue={input.deductionsExcludingRetirement} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Retirement Contribution (ZAR)</span>
            <input type="number" name="retirementContribution" step="0.01" min="0" defaultValue={input.retirementContribution} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Retirement Contribution Cap (ZAR)</span>
            <input type="number" name="retirementContributionCap" step="0.01" min="0" defaultValue={input.retirementContributionCap} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">PAYE Withheld (ZAR)</span>
            <input type="number" name="payeWithheld" step="0.01" min="0" defaultValue={input.payeWithheld} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Provisional Payments (ZAR)</span>
            <input type="number" name="provisionalPayments" step="0.01" min="0" defaultValue={input.provisionalPayments} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Medical Tax Credit (ZAR)</span>
            <input type="number" name="medicalTaxCredit" step="0.01" min="0" defaultValue={input.medicalTaxCredit} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Estimated Tax Rate (decimal or %)</span>
            <input
              type="number"
              name="estimatedTaxRate"
              step="0.00001"
              min="0"
              defaultValue={input.estimatedTaxRate}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
            >
              Save and Recalculate
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>Calculation Summary</CardTitle>
        <CardDescription className="mt-1">
          Draft scaffold output. Professional review and legal verification required.
        </CardDescription>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Taxable Income</p>
            <p className="text-lg font-semibold text-slate-900">
              R {calculation.summary.taxableIncome.toLocaleString("en-ZA")}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Estimated Gross Tax</p>
            <p className="text-lg font-semibold text-slate-900">
              R {calculation.summary.grossTax.toLocaleString("en-ZA")}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Total Credits</p>
            <p className="text-lg font-semibold text-slate-900">
              R {calculation.summary.totalCredits.toLocaleString("en-ZA")}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Net Payable/(Refund)</p>
            <p className="text-lg font-semibold text-slate-900">
              R {calculation.summary.netPayableOrRefund.toLocaleString("en-ZA")}
            </p>
          </div>
        </div>
      </Card>

      <DataTable
        headers={[
          "Line",
          "Amount",
          "Working",
          "Assumptions",
          "Source",
          "Review",
        ]}
        rows={calculation.lineItems.map((line) => [
          line.label,
          `R ${line.amount.toLocaleString("en-ZA")}`,
          line.working,
          line.assumptions.join(" "),
          line.sourceReference,
          line.reviewRequired ? (
            <StatusBadge key={`${line.lineCode}-review`} value="REVIEW_REQUIRED" />
          ) : (
            <StatusBadge key={`${line.lineCode}-review`} value="APPROVED" />
          ),
        ])}
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        {calculation.legalDisclaimer}
      </div>
    </div>
  );
}
