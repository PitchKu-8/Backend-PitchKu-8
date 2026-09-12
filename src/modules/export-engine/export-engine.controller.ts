// src/modules/export-engine/export-engine.controller.ts
import { UnauthorizedError } from "@shared/errors/app-errors";
import type { ApiSuccess } from "@shared/schemas/common.schema";
import type { Request, Response } from "express";

import * as exportEngineService from "./export-engine.service";
import type { ExportResult } from "./export-engine.types";

function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new UnauthorizedError("User is not authenticated");
  }
  return req.userId;
}

/**
 * POST /projects/:id/export/pptx
 */
export async function exportPptxHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const result = await exportEngineService.exportDeck(
    userId,
    req.params.id as string,
    "pptx",
  );

  const response: ApiSuccess<ExportResult> = { success: true, data: result };
  res.status(200).json(response);
}

/**
 * POST /projects/:id/export/pdf
 */
export async function exportPdfHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const result = await exportEngineService.exportDeck(
    userId,
    req.params.id as string,
    "pdf",
  );

  const response: ApiSuccess<ExportResult> = { success: true, data: result };
  res.status(200).json(response);
}
