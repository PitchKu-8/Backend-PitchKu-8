// src/modules/auth/auth.schema.ts
import { z } from "zod";

/**
 * Request body for POST /auth/sync-profile.
 * Called once after a successful Supabase Auth signup/login (email/password
 * or Google OAuth), to ensure the corresponding row in public.profiles exists.
 * See docs/API-CONTRACT.md section 2.2 for the full rationale.
 */
export const SyncProfileRequestSchema = z.object({
  fullName: z.string().min(1, "fullName is required").max(150),
  companyName: z.string().min(1, "companyName is required").max(150),
});

export type SyncProfileRequest = z.infer<typeof SyncProfileRequestSchema>;

/**
 * Shape of a profile row as returned to the client.
 * Mirrors the public.profiles table (FRD 5.2), excluding internal-only
 * columns if any are added later.
 */
export const ProfileResponseSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  companyName: z.string().nullable(),
  createdAt: z.string(),
});

export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;

/**
 * Request body for POST /auth/login (proxy to Supabase Auth).
 * Exists purely so API clients (Postman, and potentially the frontend
 * in specific flows) don't need to hold the Supabase anon key themselves —
 * the backend already has it via env.SUPABASE_ANON_KEY.
 */
export const LoginRequestSchema = z.object({
  email: z.string().email("email must be a valid email address"),
  password: z.string().min(6, "password must be at least 6 characters"),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const SignupRequestSchema = LoginRequestSchema;
export type SignupRequest = LoginRequest;

/**
 * Shape of the auth session returned to the client after login/signup.
 * Mirrors Supabase's token response, camelCased for consistency with
 * the rest of the API contract.
 */
export const AuthSessionResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  userId: z.string().uuid(),
  email: z.string().email(),
});

export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>;
