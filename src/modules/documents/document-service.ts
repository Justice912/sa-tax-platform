import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import type { DocumentRecord } from "@/modules/shared/types";
import { demoDocuments } from "@/server/demo-data";

export async function listDocuments(filters?: {
  query?: string;
  category?: string;
}) {
  const query = filters?.query?.toLowerCase().trim();
  const category = filters?.category?.toLowerCase().trim();

  if (!isDemoMode) {
    const rows = await prisma.document.findMany({
      where: {
        AND: [
          query
            ? {
                OR: [
                  { fileName: { contains: query, mode: "insensitive" } },
                  { client: { displayName: { contains: query, mode: "insensitive" } } },
                  { tags: { has: query } },
                ],
              }
            : {},
          category && category !== "all"
            ? { category: { label: { equals: category, mode: "insensitive" } } }
            : {},
        ],
      },
      include: {
        client: true,
        category: true,
        uploadedBy: true,
      },
      orderBy: { uploadedAt: "desc" },
    });

    return rows.map<DocumentRecord>((document) => ({
      id: document.id,
      fileName: document.fileName,
      category: document.category.label,
      clientId: document.clientId ?? undefined,
      clientName: document.client?.displayName ?? undefined,
      uploadedBy: document.uploadedBy?.fullName ?? "System",
      uploadedAt: document.uploadedAt.toISOString().slice(0, 10),
      sizeLabel: `${Math.max(1, Math.round(document.fileSizeBytes / 1024))} KB`,
      tags: document.tags,
    }));
  }

  return demoDocuments.filter((document) => {
    const queryMatch =
      !query ||
      document.fileName.toLowerCase().includes(query) ||
      document.clientName?.toLowerCase().includes(query) ||
      document.tags.some((tag) => tag.toLowerCase().includes(query));

    const categoryMatch =
      !category || category === "all" || document.category.toLowerCase() === category;

    return queryMatch && categoryMatch;
  });
}

export function getDocumentCategories() {
  if (!isDemoMode) {
    return [
      "IDs",
      "Financial Statements",
      "IRP5s",
      "Bank Statements",
      "Tax Certificates",
      "Correspondence",
      "Estate Documents",
      "SARS Letters",
      "Objection Supporting Documents",
    ];
  }

  return [
    "IDs",
    "Financial statements",
    "IRP5s",
    "Bank statements",
    "Tax certificates",
    "Correspondence",
    "Estate documents",
    "SARS letters",
    "Objection supporting documents",
  ];
}

