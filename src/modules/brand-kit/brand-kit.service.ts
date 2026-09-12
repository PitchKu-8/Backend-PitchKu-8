// src/modules/brand-kit/brand-kit.service.ts
import {
  FileTooLargeError,
  InvalidFileTypeError,
} from "@shared/errors/app-errors";
import { createModuleLogger } from "@shared/lib/logger";

import * as brandKitRepository from "./brand-kit.repository";
import {
  ALLOWED_LOGO_MIME_TYPES,
  MAX_LOGO_FILE_SIZE_BYTES,
  type BrandKitResponse,
  type UpsertBrandKitRequest,
} from "./brand-kit.schema";

const log = createModuleLogger("brand-kit");

type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

const EXTENSION_TO_MIME_TYPE: Record<
  string,
  (typeof ALLOWED_LOGO_MIME_TYPES)[number]
> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
};

/**
 * Resolves the effective MIME type for validation. Falls back to the
 * file extension when the client sends a generic type like
 * 'application/octet-stream' — some browsers/tools fail to detect the
 * correct MIME type for certain files, so relying on Content-Type alone
 * is not reliable enough here.
 */
function resolveEffectiveMimeType(file: UploadedFile): string {
  if (
    ALLOWED_LOGO_MIME_TYPES.includes(
      file.mimetype as (typeof ALLOWED_LOGO_MIME_TYPES)[number],
    )
  ) {
    return file.mimetype;
  }

  const extension = file.originalname.split(".").pop()?.toLowerCase();
  return (extension && EXTENSION_TO_MIME_TYPE[extension]) || file.mimetype;
}

/**
 * Validates the uploaded logo against FR-01.2 constraints (type, size)
 * before handing it to the repository. This is a defense-in-depth check —
 * the controller's multer config should already reject oversized/invalid
 * files at the HTTP layer, but the service must not trust that alone.
 */
function assertValidLogoFile(file: UploadedFile): void {
  const effectiveMimeType = resolveEffectiveMimeType(file);

  if (
    !ALLOWED_LOGO_MIME_TYPES.includes(
      effectiveMimeType as (typeof ALLOWED_LOGO_MIME_TYPES)[number],
    )
  ) {
    throw new InvalidFileTypeError(
      `Logo must be one of: ${ALLOWED_LOGO_MIME_TYPES.join(", ")}. Received: ${file.mimetype}`,
    );
  }

  if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
    throw new FileTooLargeError(
      `Logo must be at most ${MAX_LOGO_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
      { maxBytes: MAX_LOGO_FILE_SIZE_BYTES, actualBytes: file.size },
    );
  }
}

export async function uploadLogo(
  userId: string,
  file: UploadedFile,
): Promise<string> {
  assertValidLogoFile(file);

  const logoUrl = await brandKitRepository.uploadLogo(userId, file);

  log.info({ action: "uploadLogo", userId }, "Logo uploaded successfully");

  return logoUrl;
}

export async function upsertBrandKit(
  userId: string,
  input: UpsertBrandKitRequest,
): Promise<BrandKitResponse> {
  const brandKit = await brandKitRepository.upsertBrandKit(userId, input);

  log.info(
    { action: "upsertBrandKit", userId, brandKitId: brandKit.id },
    "Brand kit saved",
  );

  return brandKit;
}

export async function getActiveBrandKit(
  userId: string,
): Promise<BrandKitResponse | null> {
  return brandKitRepository.findActiveBrandKit(userId);
}
