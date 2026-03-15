import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(16).optional(),
  DEMO_MODE: z.enum(["true", "false"]).default("true"),
  STORAGE_ROOT: z.string().default("./storage"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success && process.env.NODE_ENV === "production") {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.success
  ? parsed.data
  : {
      DEMO_MODE: "true",
      STORAGE_ROOT: "./storage",
    };

export const isDemoMode = env.DEMO_MODE === "true";

