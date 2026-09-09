// src/config/env.ts
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  LLM_API_KEY: z.string().min(1),
  LLM_MODEL_OUTLINE: z.string().min(1),
  LLM_MODEL_CONTENT: z.string().min(1),

  UNSPLASH_ACCESS_KEY: z.string().min(1),
  PEXELS_API_KEY: z.string().min(1),

  MAX_LOGO_FILE_SIZE_MB: z.coerce.number().int().positive().default(2),
});

/**
 * Validate environment variables once at application startup — if any required variable
 * is missing in .env, the process halts immediately with a clear message,
 * rather than failing silently later when a specific module is invoked.
 */
function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;
