import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/modules/estates/phase2/workspace-helpers";
import type { EstateEngineRunRecord } from "@/modules/estates/engines/types";
import { saTaxYearFromDate } from "@/lib/utils";
import type { EstateDetailRecord } from "@/modules/estates/types";

type WorkspaceAction = string | ((formData: FormData) => void | Promise<void>);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : 0;
}

function readString(record: Record<string, unknown>, key: string, fallback = "-") {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

function buildAssessmentYearDefaults(dateOfDeath: string) {
  const taxYear = saTaxYearFromDate(dateOfDeath);
  const incomePeriodStart = `${taxYear - 1}-03-01`;
  const [startYear, startMonth] = incomePeriodStart.split("-").map(Number);
  const [endYear, endMonth] = dateOfDeath.split("-").map(Number);
  const medicalAidMonths = Math.min(
    12,
    Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1),
  );

  return {
    taxYear,
    incomePeriodStart,
    incomePeriodEnd: dateOfDeath,
    medicalAidMonths,
  };
}

export function EstatePreDeathWorkspace({
  estate,
  run,
  submitAction,
}: {
  estate: EstateDetailRecord;
  run: EstateEngineRunRecord | null;
  submitAction: WorkspaceAction;
}) {
  const defaults = buildAssessmentYearDefaults(estate.dateOfDeath);
  const output = asRecord(run?.outputSnapshot);
  const transformedInput = asRecord(output.transformedInput);
  const calculation = asRecord(output.calculation);
  const summary = asRecord(calculation.summary);

  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr,0.95fr]">
      <Card>
        <CardTitle>Capture death-year inputs</CardTitle>
        <CardDescription className="mt-1">
          Enter the deceased taxpayer&apos;s assessment-year income and deduction schedules up to
          date of death, then run the pre-death ITR12 estimate.
        </CardDescription>

        <form action={submitAction} className="mt-4 space-y-5">
          <input type="hidden" name="taxYear" value={defaults.taxYear} />

          <section className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Income period start</span>
              <input
                type="date"
                name="incomePeriodStart"
                aria-label="Income period start"
                defaultValue={defaults.incomePeriodStart}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Income period end</span>
              <input
                type="date"
                name="incomePeriodEnd"
                aria-label="Income period end"
                defaultValue={defaults.incomePeriodEnd}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Medical aid members</span>
              <input
                type="number"
                name="medicalAidMembers"
                aria-label="Medical aid members"
                min="1"
                max="20"
                defaultValue="1"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Medical aid months</span>
              <input
                type="number"
                name="medicalAidMonths"
                aria-label="Medical aid months"
                min="0"
                max="12"
                defaultValue={defaults.medicalAidMonths}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </label>
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Employment income</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>Salary income</span>
                <input
                  type="number"
                  name="employmentSalaryIncome"
                  aria-label="Salary income"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Bonus income</span>
                <input
                  type="number"
                  name="employmentBonusIncome"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Commission income</span>
                <input
                  type="number"
                  name="employmentCommissionIncome"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Fringe benefits</span>
                <input
                  type="number"
                  name="employmentFringeBenefits"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Other taxable employment income</span>
                <input
                  type="number"
                  name="employmentOtherTaxableIncome"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>PAYE withheld</span>
                <input
                  type="number"
                  name="employmentPayeWithheld"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Travel and medical</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  name="travelHasTravelAllowance"
                  className="h-4 w-4 rounded border-slate-300 text-teal-700"
                />
                <span>Travel allowance received</span>
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Travel allowance</span>
                <input
                  type="number"
                  name="travelAllowance"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Business kilometres</span>
                <input
                  type="number"
                  name="travelBusinessKilometres"
                  min="0"
                  step="1"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Total kilometres</span>
                <input
                  type="number"
                  name="travelTotalKilometres"
                  min="0"
                  step="1"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Vehicle cost</span>
                <input
                  type="number"
                  name="travelVehicleCost"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Vehicle purchase date</span>
                <input
                  type="date"
                  name="travelVehiclePurchaseDate"
                  defaultValue={defaults.incomePeriodStart}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Medical scheme contributions</span>
                <input
                  type="number"
                  name="medicalSchemeContributions"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Qualifying out-of-pocket expenses</span>
                <input
                  type="number"
                  name="medicalOutOfPocketExpenses"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  name="medicalDisabilityFlag"
                  className="h-4 w-4 rounded border-slate-300 text-teal-700"
                />
                <span>Taxpayer or dependent has a disability flag</span>
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Other income and deductions</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>Local interest</span>
                <input
                  type="number"
                  name="interestLocalInterest"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Gross rental income</span>
                <input
                  type="number"
                  name="rentalGrossIncome"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Deductible rental expenses</span>
                <input
                  type="number"
                  name="rentalDeductibleExpenses"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Gross business income</span>
                <input
                  type="number"
                  name="soleProprietorGrossIncome"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Deductible business expenses</span>
                <input
                  type="number"
                  name="soleProprietorDeductibleExpenses"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Retirement contributions</span>
                <input
                  type="number"
                  name="deductionsRetirementContributions"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Section 18A donations</span>
                <input
                  type="number"
                  name="deductionsDonationsUnderSection18A"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Prior assessment debit or credit</span>
                <input
                  type="number"
                  name="deductionsPriorAssessmentDebitOrCredit"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p>Assessment year: {defaults.taxYear}</p>
            <button
              type="submit"
              className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
            >
              Run Pre-death ITR12
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>Latest pre-death summary</CardTitle>
        <CardDescription className="mt-1">
          Review the most recent transformed taxpayer profile and the truncated assessment result.
        </CardDescription>

        {run ? (
          <dl className="mt-4 grid gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Latest run status
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{formatStatus(run.status)}</dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Taxpayer
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {readString(transformedInput, "taxpayerName", estate.deceasedName)}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Death-truncated period end
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {readString(transformedInput, "deathTruncatedPeriodEnd", estate.dateOfDeath)}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Taxable income
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {formatCurrency(readNumber(summary, "taxableIncome"))}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Net refundable
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {formatCurrency(readNumber(summary, "netAmountRefundable"))}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No pre-death run has been created yet. Submit the death-year income inputs to populate
            this summary and the formal ITR12 support output.
          </p>
        )}
      </Card>
    </section>
  );
}
