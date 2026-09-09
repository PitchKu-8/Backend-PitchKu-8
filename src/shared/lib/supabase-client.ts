// src/shared/lib/supabase-client.ts
import { env } from "@config/env";
import { createClient } from "@supabase/supabase-js";

/**
 * The single Supabase client instance for the entire application.
 * Used ONLY by *.repository.ts files in each module —
 * services/controllers must not import this directly, ensuring that
 * database access always goes through the repository layer (making it easy to mock during testing).
 *
 * Uses the service_role key (NOT the anon key) because the backend needs
 * to bypass RLS for specific operations (e.g., generation_logs, which
 * must not be written directly by users — see rls_policies.sql).
 * The backend is still strictly required to validate resource ownership explicitly
 * in the service layer as defense-in-depth, and must not rely solely on RLS
 * since this key bypasses it.
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/**
 * Client with the anon key — used EXCLUSIVELY to verify logged-in user JWTs
 * (in auth.middleware.ts), NOT for querying data.
 * Data queries still go through the supabaseAdmin client above after the user is verified.
 */
export const supabaseAuthClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
