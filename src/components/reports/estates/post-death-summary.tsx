import type { EstatePostDeathSummaryReport } from "@/modules/estates/forms/types";
import {
  ReportShell,
  SummaryTable,
  formatRate,
  formatZar,
} from "@/components/reports/estates/report-shell";

export function EstatePostDeathSummary({ report }: { report: EstatePostDeathSummaryReport }) {
  return (
    <ReportShell
      title={report.title}
      subtitle={`${report.deceasedName} | Tax year ${report.taxYear}`}
    >
      <SummaryTable
        rows={[
          { label: "Estate reference", value: report.estateReference },
          { label: "Total income", value: formatZar(report.totalIncome) },
          { label: "Deductions", value: formatZar(report.deductions) },
          { label: "Taxable income", value: formatZar(report.taxableIncome) },
          { label: "Applied rate", value: formatRate(report.appliedRate) },
          { label: "Tax payable", value: formatZar(report.taxPayable) },
        ]}
      />
    </ReportShell>
  );
}
