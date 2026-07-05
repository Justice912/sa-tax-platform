import { notFound } from "next/navigation";
import { LogbookAuditSummaryView } from "@/components/reports/logbook-audit-summary";
import { getLogbookAuditSummary } from "@/modules/logbook/service";

export default async function LogbookAuditPrintPage({
  params,
}: {
  params: Promise<{ logbookId: string }>;
}) {
  const { logbookId } = await params;

  let summary;
  try {
    summary = await getLogbookAuditSummary(logbookId);
  } catch {
    notFound();
  }

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
        }
      `}</style>
      <LogbookAuditSummaryView summary={summary} />
    </>
  );
}
