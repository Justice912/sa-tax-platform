import { describe, expect, it } from "vitest";
import { caseFormSchema, clientFormSchema, knowledgeBaseArticleSchema } from "@/modules/shared/schemas";

describe("validation schemas", () => {
  it("accepts valid client payload", () => {
    const parsed = clientFormSchema.safeParse({
      displayName: "Example Client",
      clientType: "INDIVIDUAL",
      status: "ACTIVE",
      email: "client@example.com",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid case due date format", () => {
    const parsed = caseFormSchema.safeParse({
      title: "VAT Case",
      caseType: "VERIFICATION",
      taxType: "VAT201",
      taxPeriodLabel: "2026-Q1",
      dueDate: "06-03-2026",
      priority: "HIGH",
      status: "OPEN",
      reviewStatus: "REVIEW_REQUIRED",
    });

    expect(parsed.success).toBe(false);
  });

  it("requires minimum summary length for knowledge base entries", () => {
    const parsed = knowledgeBaseArticleSchema.safeParse({
      title: "Test",
      category: "administration",
      jurisdiction: "South Africa",
      effectiveDate: "2026-03-06",
      sourceReference: "Sample",
      summary: "short",
      tags: [],
      relatedModules: [],
    });

    expect(parsed.success).toBe(false);
  });
});

