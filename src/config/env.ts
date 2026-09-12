// src/config/env.ts
import 'dotenv/config';
import { z } from 'zod';

/**
 * Treats empty string as undefined before validation. Needed because
 * dotenv reads `KEY=` (no value) as an empty string, not as an absent
 * variable — so a plain `.optional()` alone would still fail `.min(1)`.
 */
const optionalString = () =>
  z.preprocess((val) => (val === '' ? undefined : val), z.string().min(1).optional());

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Optional for now — not yet consumed by any module. Each provider
  // client (llm-client.ts, image-service.ts) is responsible for throwing
  // a clear error at the point of use if its required key is missing,
  // rather than blocking server startup for modules that don't need it yet.
  LLM_API_KEY: optionalString(),
  LLM_BASE_URL: optionalString(),
  LLM_MODEL_OUTLINE: optionalString(),
  LLM_MODEL_CONTENT: optionalString(),

  UNSPLASH_ACCESS_KEY: optionalString(),
  PEXELS_API_KEY: optionalString(),

  MAX_LOGO_FILE_SIZE_MB: z.coerce.number().int().positive().default(2),

  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;
