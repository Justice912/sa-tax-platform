import Link from "next/link";
import { notFound } from "next/navigation";
import { EstimateResult } from "@/components/individual-tax/estimate-result";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { listAuditLogsForEntities } from "@/modules/audit/audit-service";
import { getClientById } from "@/modules/clients/client-service";
import { getIndividualTaxAssessmentResult } from "@/modules/individual-tax/service";

function zarc(value: number) {
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function IndividualTaxAssessmentPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const result = await getIndividualTaxAssessmentResult(assessmentId);

  if (!result) {
    notFound();
  }

  const { assessment, calc } = result;
  const linkedClient = assessment.clientId
    ? await getClientById(assessment.clientId)
    : null;
  const auditLogs = await listAuditLogsForEntities(
    [{ entityType: "IndividualTaxAssessment", entityId: assessment.id }],
    15,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {assessment.assessmentMode === "NEAR_EFILING_ESTIMATE"
              ? "Near-eFiling Estimate"
              : "Individual Tax Assessment"}
          </h1>
          <p className="text-sm text-slate-600">
            {assessment.taxpayerName} - Ref {assessment.referenceNumber} - {assessment.assessmentDate}
          </p>
          {linkedClient ? (
            <p className="text-xs text-slate-500">
              Linked Client:{" "}
              <Link href={`/clients/${linkedClient.id}`} className="font-medium text-teal-700 hover:text-teal-800">
                {linkedClient.displayName}
              </Link>
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={assessment.status} />
          <Link
            href={`/individual-tax/${assessment.id}/edit`}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            {assessment.assessmentMode === "NEAR_EFILING_ESTIMATE"
              ? "Edit Estimate Input"
              : "Edit Calculation Input"}
          </Link>
          <a
            href={`/api/reports/individual-tax/${assessment.id}/pdf`}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Download ITA34 PDF
          </a>
          <Link
            href={`/reports/individual-tax/${assessment.id}/print`}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Open ITA34 Print View
          </Link>
        </div>
      </div>

      {assessment.assessmentMode === "NEAR_EFILING_ESTIMATE" && assessment.nearEfilingInput ? (
        <EstimateResult input={assessment.nearEfilingInput} calc={calc} />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardDescription>Taxable Income</CardDescription>
              <CardTitle className="mt-2">{zarc(calc.summary.taxableIncome)}</CardTitle>
            </Card>
            <Card>
              <CardDescription>Normal Tax</CardDescription>
              <CardTitle className="mt-2">{zarc(calc.summary.normalTax)}</CardTitle>
            </Card>
            <Card>
              <CardDescription>Total Credits</CardDescription>
              <CardTitle className="mt-2">{zarc(calc.summary.totalCredits)}</CardTitle>
            </Card>
            <Card>
              <CardDescription>Net Amount Payable</CardDescription>
              <CardTitle className="mt-2">{zarc(calc.summary.netAmountPayable)}</CardTitle>
            </Card>
          </section>

          <Card>
            <CardTitle>Income</CardTitle>
            <DataTable
              headers={["Code", "Description", "Computations", "Amount Assessed", "Review"]}
              rows={calc.incomeLines.map((line) => [
                line.code,
                line.description,
                line.computations,
                zarc(line.amountAssessed),
                <StatusBadge key={`${line.code}-income`} value="REVIEW_REQUIRED" />,
              ])}
            />
          </Card>

          <Card>
            <CardTitle>Deductions Allowed</CardTitle>
            <DataTable
              headers={["Code", "Description", "Computations", "Amount Assessed", "Review"]}
              rows={calc.deductionLines.map((line) => [
                line.code,
                line.description,
                line.computations,
                zarc(line.amountAssessed),
                <StatusBadge key={`${line.code}-deduction`} value="REVIEW_REQUIRED" />,
              ])}
            />
          </Card>

          <Card>
            <CardTitle>Tax Calculation</CardTitle>
            <DataTable
              headers={["Code", "Description", "Computations", "Amount Assessed", "Review"]}
              rows={calc.taxCalculationLines.map((line) => [
                line.code,
                line.description,
                line.computations,
                zarc(line.amountAssessed),
                <StatusBadge key={`${line.code}-tax`} value="REVIEW_REQUIRED" />,
              ])}
            />
          </Card>
        </>
      )}

      <Card>
        <CardTitle>Assessment Timeline</CardTitle>
        <CardDescription className="mt-1">
          Audit history of assessment creation, updates, and report actions.
        </CardDescription>
        <div className="mt-3 space-y-2">
          {auditLogs.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{entry.action}</p>
                <p className="text-xs text-slate-500">
                  {new Date(entry.createdAt).toLocaleString("en-ZA")}
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-700">{entry.summary}</p>
              <p className="mt-1 text-xs text-slate-500">{entry.actorName}</p>
            </div>
          ))}
          {!auditLogs.length ? (
            <p className="text-sm text-slate-500">No assessment timeline entries yet.</p>
          ) : null}
        </div>
      </Card>

      {assessment.assessmentMode !== "NEAR_EFILING_ESTIMATE" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {calc.disclaimer}
        </div>
      ) : null}
    </div>
  );
}
