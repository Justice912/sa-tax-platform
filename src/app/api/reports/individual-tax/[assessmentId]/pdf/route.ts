import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { withPooledPage } from "@/lib/browser-pool";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { getIndividualTaxReportData } from "@/modules/individual-tax/service";
import { storageProvider } from "@/modules/documents/storage-provider";
import { writeAuditLog } from "@/modules/audit/audit-writer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  const { assessmentId } = await params;
  const session = await getServerSession(authOptions);
  const reportData = await getIndividualTaxReportData(assessmentId);

  if (!reportData) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const printUrl = new URL(
    `/reports/individual-tax/${assessmentId}/print`,
    request.url,
  ).toString();

  try {
    const pdfBuffer = await withPooledPage(async (page) => {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        await page.setExtraHTTPHeaders({ cookie: cookieHeader });
      }
      await page.goto(printUrl, { waitUntil: "networkidle" });
      return page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
      });
    });

    const fileName = `taxops-individual-tax-${reportData.assessment.referenceNumber}.pdf`;
    const stored = await storageProvider.save({
      fileName,
      content: Buffer.from(pdfBuffer),
    });

    if (!isDemoMode) {
      await prisma.generatedReport.create({
        data: {
          assessmentId,
          reportType: "INDIVIDUAL_TAX_ASSESSMENT",
          storageKey: stored.storageKey,
          checksum: stored.checksum,
          generatedById: session?.user?.id,
        },
      });
    }

    await writeAuditLog({
      actorId: session?.user?.id,
      action: "INDIVIDUAL_TAX_PDF_GENERATED",
      entityType: "IndividualTaxAssessment",
      entityId: assessmentId,
      summary: `Generated TaxOps individual tax report PDF (${stored.storageKey}).`,
      afterData: {
        storageKey: stored.storageKey,
        checksum: stored.checksum,
        sizeBytes: stored.sizeBytes,
      },
    });

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
        "X-Storage-Key": stored.storageKey,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
