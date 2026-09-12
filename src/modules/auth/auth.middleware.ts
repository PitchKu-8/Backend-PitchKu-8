// src/modules/auth/auth.middleware.ts
import { UnauthorizedError } from '@shared/errors/app-errors';
import { createModuleLogger } from '@shared/lib/logger';
import { supabaseAuthClient } from '@shared/lib/supabase-client';
import type { NextFunction, Request, Response } from 'express';

const log = createModuleLogger('auth');

/**
 * Extracts the token from the 'Authorization: Bearer <jwt>' header.
 * Returns null if the header format does not match (not an error directly
 * here — lets authMiddleware decide how to respond).
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  return token;
}

/**
 * Mandatory middleware for all routes except /auth/* itself.
 * Verifies the JWT with Supabase, then injects req.userId if valid.
 *
 * IMPORTANT: uses supabaseAuthClient (anon key), NOT supabaseAdmin —
 * verifying a token is an auth operation, not a database query that
 * requires bypassing RLS.
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    log.warn({ action: 'authMiddleware' }, 'Request without a valid Bearer token');
    throw new UnauthorizedError('Authentication token not found or header format incorrect');
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(token);

  if (error || !data.user) {
    log.warn({ action: 'authMiddleware', error: error?.message }, 'Token verification failed');
    throw new UnauthorizedError('Authentication token is invalid or expired');
  }

  req.userId = data.user.id;
  req.accessToken = token;

  log.debug({ action: 'authMiddleware', userId: req.userId }, 'Token terverifikasi');

  next();
}
