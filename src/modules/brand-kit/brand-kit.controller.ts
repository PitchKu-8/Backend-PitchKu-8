// src/modules/brand-kit/brand-kit.controller.ts
import { UnauthorizedError, ValidationError } from "@shared/errors/app-errors";
import type { ApiSuccess } from "@shared/schemas/common.schema";
import type { Request, Response } from "express";
import multer from "multer";

import {
  MAX_LOGO_FILE_SIZE_BYTES,
  type BrandKitResponse,
  type LogoUploadResponse,
  type UpsertBrandKitRequest,
} from "./brand-kit.schema";
import * as brandKitService from "./brand-kit.service";

/**
 * Multer config for the logo upload endpoint. Stores the file in memory
 * (not disk) since it's immediately forwarded to Supabase Storage —
 * no need to persist it locally first.
 *
 * File size limit is set here as the first line of defense (rejects
 * oversized uploads before they're fully read into memory), with the
 * service layer's assertValidLogoFile() as a second, independent check.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOGO_FILE_SIZE_BYTES },
});

export const logoUploadMiddleware = upload.single("file");

/**
 * POST /brand-kits/logo-upload
 * Requires authMiddleware + logoUploadMiddleware to have run first.
 */
export async function uploadLogoHandler(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.userId) {
    throw new UnauthorizedError("User is not authenticated");
  }

  if (!req.file) {
    throw new ValidationError(
      'No file was uploaded. Expected field name: "file"',
    );
  }

  const logoUrl = await brandKitService.uploadLogo(req.userId, {
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    originalname: req.file.originalname,
    size: req.file.size,
  });

  const response: ApiSuccess<LogoUploadResponse> = {
    success: true,
    data: { logoUrl },
  };

  res.status(200).json(response);
}

/**
 * POST /brand-kits
 * Requires authMiddleware + validateRequest(UpsertBrandKitRequestSchema).
 */
export async function upsertBrandKitHandler(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.userId) {
    throw new UnauthorizedError("User is not authenticated");
  }

  const input = req.body as UpsertBrandKitRequest;
  const brandKit = await brandKitService.upsertBrandKit(req.userId, input);

  const response: ApiSuccess<BrandKitResponse> = {
    success: true,
    data: brandKit,
  };

  res.status(200).json(response);
}

/**
 * GET /brand-kits/active
 * Requires authMiddleware.
 */
export async function getActiveBrandKitHandler(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.userId) {
    throw new UnauthorizedError("User is not authenticated");
  }

  const brandKit = await brandKitService.getActiveBrandKit(req.userId);

  const response: ApiSuccess<BrandKitResponse | null> = {
    success: true,
    data: brandKit,
  };

  res.status(200).json(response);
}
