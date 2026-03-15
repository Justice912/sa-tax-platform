import { z } from "zod";

export const clientFormSchema = z.object({
  displayName: z.string().min(2),
  clientType: z.enum(["INDIVIDUAL", "COMPANY", "ESTATE", "TRUST"]),
  status: z.enum(["ACTIVE", "ONBOARDING", "DORMANT", "ARCHIVED"]),
  taxReferenceNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const caseFormSchema = z.object({
  title: z.string().min(3),
  caseType: z.string().min(3),
  taxType: z.string().min(3),
  taxPeriodLabel: z.string().min(3),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  status: z.enum([
    "OPEN",
    "IN_PROGRESS",
    "AWAITING_DOCUMENTS",
    "UNDER_REVIEW",
    "SUBMITTED",
    "CLOSED",
    "ON_HOLD",
  ]),
  reviewStatus: z.string().min(3),
  notes: z.string().max(2000).optional(),
});

export const knowledgeBaseArticleSchema = z.object({
  title: z.string().min(4),
  category: z.string().min(3),
  jurisdiction: z.string().min(2),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  repealDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sourceReference: z.string().min(3),
  summary: z.string().min(10),
  tags: z.array(z.string()).default([]),
  relatedModules: z.array(z.string()).default([]),
  isIllustrative: z.boolean().default(true),
});

export const documentUploadSchema = z.object({
  fileName: z.string().min(3),
  category: z.string().min(2),
  clientId: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

