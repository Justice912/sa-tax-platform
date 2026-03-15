import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { demoCases, demoClients, demoDeadlines } from "@/server/demo-data";
import { buildDeadlineSummary, classifyDeadline } from "@/modules/deadlines/deadline-engine";

export async function getDashboardSummary() {
  if (!isDemoMode) {
    const [clientsCount, cases, deadlines] = await Promise.all([
      prisma.client.count(),
      prisma.case.findMany({
        include: {
          client: true,
          taxType: true,
        },
      }),
      prisma.deadline.findMany({
        include: { case: true },
      }),
    ]);

    const classifiedDeadlines = deadlines.map((entry) => ({
      id: entry.id,
      caseId: entry.caseId,
      title: entry.title,
      dueAt: entry.dueAt.toISOString().slice(0, 10),
      status: classifyDeadline(
        entry.dueAt.toISOString(),
        entry.case.status,
      ),
    }));

    const summary = buildDeadlineSummary(classifiedDeadlines);
    const byStatus = cases.reduce<Record<string, number>>((acc, taxCase) => {
      acc[taxCase.status] = (acc[taxCase.status] ?? 0) + 1;
      return acc;
    }, {});

    const byTaxType = cases.reduce<Record<string, number>>((acc, taxCase) => {
      const code = taxCase.taxType.code;
      acc[code] = (acc[code] ?? 0) + 1;
      return acc;
    }, {});

    return {
      totalClients: clientsCount,
      totalCases: cases.length,
      deadlines: summary,
      casesByStatus: byStatus,
      casesByTaxType: byTaxType,
      urgentCases: cases
        .filter((taxCase) => taxCase.priority === "CRITICAL" || taxCase.priority === "HIGH")
        .map((taxCase) => ({
          id: taxCase.id,
          title: taxCase.title,
          priority: taxCase.priority,
          clientName: taxCase.client.displayName,
          dueDate: taxCase.dueDate ? taxCase.dueDate.toISOString().slice(0, 10) : "-",
        })),
    };
  }

  const deadlines = demoDeadlines.map((entry) => {
    const linkedCase = demoCases.find((taxCase) => taxCase.id === entry.caseId);
    return {
      ...entry,
      status: classifyDeadline(entry.dueAt, linkedCase?.status ?? "OPEN"),
    };
  });

  const summary = buildDeadlineSummary(deadlines);
  const byStatus = demoCases.reduce<Record<string, number>>((acc, taxCase) => {
    acc[taxCase.status] = (acc[taxCase.status] ?? 0) + 1;
    return acc;
  }, {});

  const byTaxType = demoCases.reduce<Record<string, number>>((acc, taxCase) => {
    acc[taxCase.taxType] = (acc[taxCase.taxType] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalClients: demoClients.length,
    totalCases: demoCases.length,
    deadlines: summary,
    casesByStatus: byStatus,
    casesByTaxType: byTaxType,
    urgentCases: demoCases.filter((taxCase) => taxCase.priority === "CRITICAL" || taxCase.priority === "HIGH"),
  };
}

