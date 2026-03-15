import { notFound } from "next/navigation";
import { IndividualTaxIta34 } from "@/components/reports/individual-tax-ita34";
import { getIndividualTaxReportData } from "@/modules/individual-tax/service";

export default async function IndividualTaxPrintPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const data = await getIndividualTaxReportData(assessmentId);

  if (!data) {
    notFound();
  }

  const { report, calc } = data;

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 10mm;
        }

        html, body {
          margin: 0;
          background: white;
          color: #0f172a;
          font-family: Arial, Helvetica, sans-serif;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .ita34-page-break {
            page-break-before: always;
          }
        }
      `}</style>
      <IndividualTaxIta34 report={report} />
      <footer className="mx-auto mt-6 max-w-[960px] border-t border-slate-300 px-4 py-4 text-[11px] text-slate-600 print:mt-3 print:max-w-none print:px-0 print:py-2">
        {calc.disclaimer}
      </footer>
    </>
  );
}
