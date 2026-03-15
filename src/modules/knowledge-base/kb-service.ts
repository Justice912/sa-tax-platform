import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import type { KnowledgeBaseArticleRecord } from "@/modules/shared/types";
import { demoArticles } from "@/server/demo-data";

export async function listKnowledgeBaseArticles(filters?: {
  category?: string;
  tag?: string;
  query?: string;
}) {
  const query = filters?.query?.toLowerCase().trim();
  const category = filters?.category?.toLowerCase().trim();
  const tag = filters?.tag?.toLowerCase().trim();

  if (!isDemoMode) {
    const rows = await prisma.knowledgeBaseArticle.findMany({
      where: {
        AND: [
          category && category !== "all"
            ? { category: { equals: category, mode: "insensitive" } }
            : {},
          query
            ? {
                OR: [
                  { title: { contains: query, mode: "insensitive" } },
                  { summary: { contains: query, mode: "insensitive" } },
                  { sourceReference: { contains: query, mode: "insensitive" } },
                ],
              }
            : {},
          tag ? { tags: { has: tag } } : {},
        ],
      },
      orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
    });

    return rows.map<KnowledgeBaseArticleRecord>((article) => ({
      id: article.id,
      title: article.title,
      category: article.category,
      jurisdiction: article.jurisdiction,
      effectiveDate: article.effectiveDate.toISOString().slice(0, 10),
      repealDate: article.repealDate?.toISOString().slice(0, 10),
      sourceReference: article.sourceReference,
      summary: article.summary,
      tags: article.tags,
      relatedModules: article.relatedModules,
      isIllustrative: article.isIllustrative,
    }));
  }

  return demoArticles.filter((article) => {
    const categoryMatch = !category || category === "all" || article.category.toLowerCase() === category;
    const tagMatch = !tag || article.tags.some((value) => value.toLowerCase() === tag);
    const queryMatch =
      !query ||
      article.title.toLowerCase().includes(query) ||
      article.summary.toLowerCase().includes(query) ||
      article.sourceReference.toLowerCase().includes(query);

    return categoryMatch && tagMatch && queryMatch;
  });
}

export function getKnowledgeCategories() {
  if (!isDemoMode) {
    return [
      "individual tax",
      "company tax",
      "VAT",
      "payroll taxes",
      "disputes",
      "deceased estates",
      "administration",
    ];
  }

  return [
    "individual tax",
    "company tax",
    "VAT",
    "payroll taxes",
    "disputes",
    "deceased estates",
    "administration",
  ];
}

