// src/modules/auth/auth.controller.ts

import { UnauthorizedError } from '@shared/errors/app-errors';
import type { ApiSuccess } from '@shared/schemas/common.schema';
import type { Request, Response } from 'express';

import type { AuthSessionResponse, LoginRequest, SignupRequest } from './auth.schema';
import type { ProfileResponse, SyncProfileRequest } from './auth.schema';
import { login, logout, signup, syncProfile } from './auth.service';

/**
 * POST /auth/sync-profile
 * Requires authMiddleware to have run first (req.userId must be set).
 * Request body is expected to already be validated by validateRequest(SyncProfileRequestSchema).
 */
export async function syncProfileHandler(req: Request, res: Response): Promise<void> {
  // req.userId is guaranteed by authMiddleware, but we guard defensively
  // in case this handler is ever wired up without it by mistake.
  if (!req.userId) {
    throw new UnauthorizedError('User is not authenticated');
  }

  const input = req.body as SyncProfileRequest;
  const profile = await syncProfile(req.userId, input);

  const response: ApiSuccess<ProfileResponse> = {
    success: true,
    data: profile,
  };

  res.status(200).json(response);
}

/**
 * POST /auth/login
 * Public endpoint — no authMiddleware. Proxies to Supabase Auth so
 * clients never need to hold the Supabase anon key directly.
 */
export async function loginHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as LoginRequest;
  const session = await login(input);

  const response: ApiSuccess<AuthSessionResponse> = {
    success: true,
    data: session,
  };

  res.status(200).json(response);
}

/**
 * POST /auth/signup
 * Public endpoint — no authMiddleware.
 */
export async function signupHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as SignupRequest;
  const session = await signup(input);

  const response: ApiSuccess<AuthSessionResponse> = {
    success: true,
    data: session,
  };

  res.status(201).json(response);
}

/**
 * POST /auth/logout
 * Requires authMiddleware — logout only makes sense for an
 * authenticated request, and we need req.accessToken from it.
 */
export async function logoutHandler(req: Request, res: Response): Promise<void> {
  if (!req.userId) {
    throw new UnauthorizedError('User is not authenticated');
  }

  const token = req.accessToken;
  if (!token) {
    throw new UnauthorizedError('No access token found on request');
  }

  await logout(token);

  res.status(204).send();
}
