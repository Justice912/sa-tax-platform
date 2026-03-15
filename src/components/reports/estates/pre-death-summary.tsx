import type { EstatePreDeathSummaryReport } from "@/modules/estates/forms/types";
import { ReportShell, SummaryTable, formatZar } from "@/components/reports/estates/report-shell";

export function EstatePreDeathSummary({ report }: { report: EstatePreDeathSummaryReport }) {
  return (
    <ReportShell
      title={report.title}
      subtitle={`${report.deceasedName} | Assessment year ${report.assessmentYear}`}
    >
      <SummaryTable
        rows={[
          { label: "Estate reference", value: report.estateReference },
          { label: "Taxpayer", value: report.taxpayerName },
          { label: "Date of death", value: report.dateOfDeath },
          { label: "Income period end", value: report.deathTruncatedPeriodEnd },
          { label: "Total income", value: formatZar(report.totalIncome) },
          { label: "Total deductions", value: formatZar(report.totalDeductions) },
          { label: "Taxable income", value: formatZar(report.taxableIncome) },
          { label: "Normal tax", value: formatZar(report.normalTax) },
          { label: "Credits", value: formatZar(report.totalCredits) },
          { label: "Net payable", value: formatZar(report.netAmountPayable) },
          { label: "Net refundable", value: formatZar(report.netAmountRefundable) },
        ]}
      />
      {report.disclaimer ? (
        <p
          style={{
            marginTop: 18,
            padding: 12,
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            background: "#f8fafc",
            fontSize: 12,
          }}
        >
          {report.disclaimer}
        </p>
      ) : null}
    </ReportShell>
  );
}
