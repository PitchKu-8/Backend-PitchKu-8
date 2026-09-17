// src/modules/ai-engine/ai-engine.controller.ts
import { UnauthorizedError } from '@shared/errors/app-errors';
import type { ApiSuccess } from '@shared/schemas/common.schema';
import type { Outline, PitchKuDeckPayload } from '@shared/schemas/deck.schema';
import type { Request, Response } from 'express';

import type { ConfirmOutlineRequest, SaveSlidesRequest } from './ai-engine.schema';
import * as aiEngineService from './ai-engine.service';

function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new UnauthorizedError('User is not authenticated');
  }
  return req.userId;
}

/**
 * POST /projects/:id/outline
 */
export async function generateOutlineHandler(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const outline = await aiEngineService.generateOutline(userId, req.params.id as string);

  const response: ApiSuccess<Outline> = { success: true, data: outline };
  res.status(200).json(response);
}

/**
 * PATCH /projects/:id/outline
 */
export async function confirmOutlineHandler(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const { outline } = req.body as ConfirmOutlineRequest;

  const confirmed = await aiEngineService.confirmOutline(userId, req.params.id as string, outline);

  const response: ApiSuccess<Outline> = { success: true, data: confirmed };
  res.status(200).json(response);
}

/**
 * POST /projects/:id/content
 */
export async function generateContentHandler(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const deck = await aiEngineService.generateContent(userId, req.params.id as string);

  const response: ApiSuccess<PitchKuDeckPayload> = {
    success: true,
    data: deck,
  };
  res.status(200).json(response);
}

export async function saveSlidesHandler(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const { slides } = req.body as SaveSlidesRequest;
  const saved = await aiEngineService.saveSlides(userId, req.params.id as string, slides);
  const response: ApiSuccess<PitchKuDeckPayload['slides']> = { success: true, data: saved };
  res.status(200).json(response);
}
