// src/modules/auth/auth.service.ts
import { createModuleLogger } from '@shared/lib/logger';
import { supabaseAdmin } from '@shared/lib/supabase-client';
import { supabaseAuthClient } from '@shared/lib/supabase-client';

import type {
  ProfileResponse,
  SyncProfileRequest,
  AuthSessionResponse,
  LoginRequest,
  SignupRequest,
} from './auth.schema';

const log = createModuleLogger('auth');

/**
 * Upsert a profile row for the given user.
 *
 * Deliberately idempotent — safe to call on every login, not just the
 * first one. If a partial failure ever left the profile row missing or
 * out of sync, calling this again is the recovery path (see
 * docs/API-CONTRACT.md section 2.2 for the full rationale on why this
 * endpoint exists separately from Supabase Auth signup).
 *
 * NOTE: this module accesses supabaseAdmin directly rather than through
 * a *.repository.ts file. Auth is the one deliberate exception to that
 * convention, since it performs a single trivial upsert — introducing a
 * repository layer for one query would be unnecessary indirection.
 */

/**
 * Thin proxy over Supabase Auth's password login. Exists so API clients
 * only ever need to talk to this backend, never hold the Supabase anon
 * key or call Supabase's auth endpoints directly.
 */
export async function login(input: LoginRequest): Promise<AuthSessionResponse> {
  const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.session || !data.user) {
    log.warn({ action: 'login', email: input.email, error: error?.message }, 'Login failed');
    throw error ?? new Error('Login failed: no session returned');
  }

  log.info({ action: 'login', userId: data.user.id }, 'Login successful');

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    userId: data.user.id,
    email: data.user.email ?? input.email,
  };
}

/**
 * Thin proxy over Supabase Auth's signup. Same rationale as login().
 */
export async function signup(input: SignupRequest): Promise<AuthSessionResponse> {
  const { data, error } = await supabaseAuthClient.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    log.warn({ action: 'signup', email: input.email, error: error?.message }, 'Signup failed');
    throw error ?? new Error('Signup failed: no user returned');
  }

  // If email confirmation is enabled in Supabase, data.session will be
  // null here — the user must confirm their email before a session exists.
  if (!data.session) {
    log.info(
      { action: 'signup', userId: data.user.id },
      'Signup successful, email confirmation required before login',
    );
    throw new Error('Signup successful, but email confirmation is required before you can log in');
  }

  log.info({ action: 'signup', userId: data.user.id }, 'Signup successful');

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    userId: data.user.id,
    email: data.user.email ?? input.email,
  };
}

export async function syncProfile(
  userId: string,
  input: SyncProfileRequest,
): Promise<ProfileResponse> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: userId,
        full_name: input.fullName,
        company_name: input.companyName,
      },
      { onConflict: 'id' },
    )
    .select('id, full_name, company_name, created_at')
    .single();

  if (error) {
    log.error({ action: 'syncProfile', userId, error: error.message }, 'Failed to sync profile');
    throw error;
  }

  log.info({ action: 'syncProfile', userId }, 'Profile synced successfully');

  return {
    id: data.id as string,
    fullName: data.full_name as string | null,
    companyName: data.company_name as string | null,
    createdAt: data.created_at as string,
  };
}

export async function logout(accessToken: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);

  if (error) {
    log.warn({ action: 'logout', error: error.message }, 'Logout failed');
    throw error;
  }

  log.info({ action: 'logout' }, 'Session invalidated');
}
