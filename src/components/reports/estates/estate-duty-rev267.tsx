import type { EstateDutyRev267Report } from "@/modules/estates/forms/types";
import { ReportShell, SummaryTable, formatZar } from "@/components/reports/estates/report-shell";

export function EstateDutyRev267({ report }: { report: EstateDutyRev267Report }) {
  return (
    <ReportShell
      title={report.title}
      subtitle={`${report.deceasedName} | Estate reference ${report.estateReference}`}
    >
      <SummaryTable
        rows={[
          { label: "Date of death", value: report.dateOfDeath },
          { label: "Gross estate value", value: formatZar(report.grossEstateValue) },
          { label: "Liabilities", value: formatZar(report.liabilities) },
          { label: "Section 4 deductions", value: formatZar(report.section4Deductions) },
          { label: "Spouse deduction", value: formatZar(report.spouseDeduction) },
          { label: "Total deductions", value: formatZar(report.totalDeductions) },
          { label: "Net estate before abatement", value: formatZar(report.netEstateBeforeAbatement) },
          { label: "Abatement applied", value: formatZar(report.abatementApplied) },
          { label: "Dutiable estate", value: formatZar(report.dutiableEstate) },
          { label: "Estate duty payable", value: formatZar(report.estateDutyPayable) },
        ]}
      />
    </ReportShell>
  );
}
