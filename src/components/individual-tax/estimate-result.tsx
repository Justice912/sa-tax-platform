import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import type { IndividualTaxCalculation, NearEfilingIndividualTaxInput } from "@/modules/individual-tax/types";

function zarc(value: number) {
  return `R ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function profileLabel(value: NearEfilingIndividualTaxInput["profile"]["maritalStatus"]) {
  switch (value) {
    case "MARRIED_IN_COMMUNITY":
      return "Married in community";
    case "MARRIED_OUT_OF_COMMUNITY":
      return "Married out of community";
    case "WIDOWED":
      return "Widowed";
    case "DIVORCED":
      return "Divorced";
    default:
      return "Single";
  }
}

export function EstimateResult({
  input,
  calc,
}: {
  input: NearEfilingIndividualTaxInput;
  calc: IndividualTaxCalculation;
}) {
  const outcomeValue =
    calc.summary.netAmountPayable > 0
      ? zarc(calc.summary.netAmountPayable)
      : zarc(calc.summary.netAmountRefundable);
  const outcomeLabel =
    calc.summary.netAmountPayable > 0
      ? "Estimated amount payable to SARS"
      : "Estimated refund due from SARS";

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={outcomeLabel} value={outcomeValue} />
        <MetricCard label="Taxable Income" value={zarc(calc.summary.taxableIncome)} />
        <MetricCard label="Normal Tax" value={zarc(calc.summary.normalTax)} />
        <MetricCard label="Total Credits and Offsets" value={zarc(calc.summary.totalCredits)} />
      </section>

      <Card>
        <CardTitle>Near-eFiling Estimate Overview</CardTitle>
        <CardDescription className="mt-1">
          This worksheet estimates the taxpayer&apos;s likely SARS outcome before
          actual eFiling submission.
        </CardDescription>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Assessment Year" value={String(input.profile.assessmentYear)} compact />
          <MetricCard label="Date of Birth" value={input.profile.dateOfBirth} compact />
          <MetricCard label="Marital Status" value={profileLabel(input.profile.maritalStatus)} compact />
          <MetricCard label="Medical Aid Members" value={String(input.profile.medicalAidMembers)} compact />
          <MetricCard label="Months on Medical Aid" value={String(input.profile.medicalAidMonths)} compact />
          <MetricCard label="Salary Income" value={zarc(input.employment.salaryIncome)} compact />
          <MetricCard label="PAYE Withheld" value={zarc(input.employment.payeWithheld)} compact />
          <MetricCard label="Retirement Contributions" value={zarc(input.deductions.retirementContributions)} compact />
        </div>
      </Card>

      {calc.warnings?.length ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardTitle>Review Warnings</CardTitle>
          <div className="mt-3 space-y-2 text-sm text-amber-900">
            {calc.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Income Schedules</CardTitle>
        <DataTable
          headers={["Code", "Description", "Computations", "Amount Assessed"]}
          rows={calc.incomeLines.map((line) => [
            line.code,
            line.description,
            line.computations,
            zarc(line.amountAssessed),
          ])}
        />
      </Card>

      <Card>
        <CardTitle>Deductions and Credits</CardTitle>
        <DataTable
          headers={["Code", "Description", "Computations", "Amount Assessed"]}
          rows={calc.deductionLines.map((line) => [
            line.code,
            line.description,
            line.computations,
            zarc(line.amountAssessed),
          ])}
        />
      </Card>

      <Card>
        <CardTitle>Tax Calculation</CardTitle>
        <DataTable
          headers={["Code", "Description", "Computations", "Amount Assessed"]}
          rows={calc.taxCalculationLines.map((line) => [
            line.code,
            line.description,
            line.computations,
            zarc(line.amountAssessed),
          ])}
        />
      </Card>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        {calc.disclaimer}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-lg border border-slate-200 bg-white",
        compact ? "p-3" : "p-4",
      ].join(" ")}
    >
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
