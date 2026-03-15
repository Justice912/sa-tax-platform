import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import type { CaseActivityRecord, CaseRecord } from "@/modules/shared/types";
import { demoCaseActivities, demoCases } from "@/server/demo-data";

export async function listCases(filters?: {
  status?: string;
  taxType?: string;
  query?: string;
}) {
  const query = filters?.query?.toLowerCase().trim();

  if (!isDemoMode) {
    const rows = await prisma.case.findMany({
      where: {
        AND: [
          filters?.status && filters.status !== "ALL"
            ? { status: filters.status as never }
            : {},
          filters?.taxType && filters.taxType !== "ALL"
            ? { taxType: { code: filters.taxType } }
            : {},
          query
            ? {
                OR: [
                  { title: { contains: query, mode: "insensitive" } },
                  { client: { displayName: { contains: query, mode: "insensitive" } } },
                ],
              }
            : {},
        ],
      },
      include: {
        client: true,
        taxType: true,
        taxPeriod: true,
        assignedUser: true,
        caseDocuments: { select: { documentId: true } },
        knowledgeLinks: { select: { articleId: true } },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    });

    return rows.map<CaseRecord>((entry) => ({
      id: entry.id,
      caseType: entry.caseType,
      taxType: entry.taxType.code,
      clientId: entry.clientId,
      clientName: entry.client.displayName,
      title: entry.title,
      taxPeriodLabel: entry.taxPeriod?.label ?? "Unspecified period",
      assignedUserName: entry.assignedUser?.fullName,
      dueDate: entry.dueDate ? entry.dueDate.toISOString().slice(0, 10) : "-",
      priority: entry.priority,
      status: entry.status,
      reviewStatus: entry.reviewStatusId,
      notes: entry.description ?? undefined,
      linkedDocumentIds: entry.caseDocuments.map((doc) => doc.documentId),
      linkedKnowledgeArticleIds: entry.knowledgeLinks.map((article) => article.articleId),
    }));
  }

  return demoCases.filter((entry) => {
    const statusMatch = !filters?.status || filters.status === "ALL" || entry.status === filters.status;
    const taxTypeMatch = !filters?.taxType || filters.taxType === "ALL" || entry.taxType === filters.taxType;
    const queryMatch =
      !query ||
      entry.title.toLowerCase().includes(query) ||
      entry.clientName.toLowerCase().includes(query) ||
      entry.caseType.toLowerCase().includes(query);

    return statusMatch && taxTypeMatch && queryMatch;
  });
}

export async function getCaseById(caseId: string) {
  if (!isDemoMode) {
    const entry = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        client: true,
        taxType: true,
        taxPeriod: true,
        assignedUser: true,
        caseDocuments: { select: { documentId: true } },
        knowledgeLinks: { select: { articleId: true } },
      },
    });

    if (!entry) {
      return null;
    }

    return {
      id: entry.id,
      caseType: entry.caseType,
      taxType: entry.taxType.code,
      clientId: entry.clientId,
      clientName: entry.client.displayName,
      title: entry.title,
      taxPeriodLabel: entry.taxPeriod?.label ?? "Unspecified period",
      assignedUserName: entry.assignedUser?.fullName,
      dueDate: entry.dueDate ? entry.dueDate.toISOString().slice(0, 10) : "-",
      priority: entry.priority,
      status: entry.status,
      reviewStatus: entry.reviewStatusId,
      notes: entry.description ?? undefined,
      linkedDocumentIds: entry.caseDocuments.map((doc) => doc.documentId),
      linkedKnowledgeArticleIds: entry.knowledgeLinks.map((article) => article.articleId),
    } satisfies CaseRecord;
  }

  return demoCases.find((entry) => entry.id === caseId) ?? null;
}

export async function getCaseActivities(caseId: string) {
  if (!isDemoMode) {
    const rows = await prisma.caseActivity.findMany({
      where: { caseId },
      include: { actor: true },
      orderBy: { createdAt: "desc" },
    });

    return rows.map<CaseActivityRecord>((entry) => ({
      id: entry.id,
      caseId: entry.caseId,
      actorName: entry.actor.fullName,
      action: entry.action,
      summary: entry.summary,
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  return demoCaseActivities
    .filter((entry) => entry.caseId === caseId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

