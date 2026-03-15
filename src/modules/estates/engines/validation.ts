import { z } from "zod";
import {
  ESTATE_ENGINE_DEPENDENCY_STATUS_VALUES,
  ESTATE_ENGINE_RUN_STATUS_VALUES,
  ESTATE_ENGINE_TYPE_VALUES,
} from "@/modules/estates/engines/types";

const isoDateTimeSchema = z.iso.datetime({ offset: true });

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const jsonObjectSchema = z.record(z.string(), jsonValueSchema);

export const estateEngineDependencyStateSchema = z.object({
  engineType: z.enum(ESTATE_ENGINE_TYPE_VALUES),
  runId: z.string().trim().min(1).optional(),
  status: z.enum(ESTATE_ENGINE_DEPENDENCY_STATUS_VALUES),
  isStale: z.boolean(),
  reviewedAt: isoDateTimeSchema.optional(),
});

export const createEstateEngineRunSchema = z.object({
  estateId: z.string().trim().min(1),
  yearPackId: z.string().trim().min(1),
  engineType: z.enum(ESTATE_ENGINE_TYPE_VALUES),
  inputSnapshot: jsonObjectSchema,
  outputSnapshot: jsonObjectSchema,
  warnings: z.array(z.string().trim().min(1)),
  dependencyStates: z.array(estateEngineDependencyStateSchema),
});

export const createEstateEngineRunRecordSchema = createEstateEngineRunSchema.extend({
  status: z.enum(ESTATE_ENGINE_RUN_STATUS_VALUES),
  reviewRequired: z.boolean(),
});

export const approveEstateEngineRunSchema = z.object({
  runId: z.string().trim().min(1),
  approvedByName: z.string().trim().min(1),
});
