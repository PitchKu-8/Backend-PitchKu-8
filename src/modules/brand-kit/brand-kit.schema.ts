// src/modules/brand-kit/brand-kit.schema.ts
import { z } from "zod";

const hexColorRegex = /^#([A-Fa-f0-9]{6})$/;

/**
 * Request body for POST /brand-kits (create/update — upsert).
 * logoUrl is required here because the client is expected to have
 * already uploaded the logo via POST /brand-kits/logo-upload first
 * (FRD user journey step 3), and pass the resulting URL in.
 */
export const UpsertBrandKitRequestSchema = z.object({
  logoUrl: z.string().url("logoUrl must be a valid URL"),
  primaryColor: z
    .string()
    .regex(hexColorRegex, "primaryColor must be a HEX color, e.g. #0F4C81"),
  accentColor: z
    .string()
    .regex(hexColorRegex, "accentColor must be a HEX color, e.g. #F2A007"),
  fontFamily: z.string().min(1).max(50).default("Inter"),
});

export type UpsertBrandKitRequest = z.infer<typeof UpsertBrandKitRequestSchema>;

/**
 * Shape of a brand kit row as returned to the client.
 * Mirrors public.brand_kits (FRD 5.2), camelCased.
 */
export const BrandKitResponseSchema = z.object({
  id: z.string().uuid(),
  logoUrl: z.string().url().nullable(),
  primaryColor: z.string(),
  accentColor: z.string(),
  fontFamily: z.string(),
  updatedAt: z.string(),
});

export type BrandKitResponse = z.infer<typeof BrandKitResponseSchema>;

/**
 * Response shape for POST /brand-kits/logo-upload.
 */
export const LogoUploadResponseSchema = z.object({
  logoUrl: z.string().url(),
});

export type LogoUploadResponse = z.infer<typeof LogoUploadResponseSchema>;

/**
 * File upload constraints (FR-01.2). Kept here rather than hardcoded
 * in the service, so the controller/multer config and the service's
 * own validation stay in sync with a single source of truth.
 */
export const ALLOWED_LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
] as const;
export const MAX_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB, per FR-01.2
