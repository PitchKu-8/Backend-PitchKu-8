// src/modules/brand-kit/brand-kit.repository.ts
import { supabaseAdmin } from "@shared/lib/supabase-client";

import type {
  UpsertBrandKitRequest,
  BrandKitResponse,
} from "./brand-kit.schema";

const STORAGE_BUCKET = "brand-assets";

/**
 * Maps a raw brand_kits row (snake_case, as returned by Postgres) to the
 * camelCase shape used throughout the API contract.
 */
function toBrandKitResponse(row: {
  id: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  font_family: string;
  updated_at: string;
}): BrandKitResponse {
  return {
    id: row.id,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    fontFamily: row.font_family,
    updatedAt: row.updated_at,
  };
}

/**
 * Uploads a logo file to Supabase Storage and returns its public URL.
 * File is namespaced under the user's id to avoid collisions between
 * different users uploading files with the same name.
 */
export async function uploadLogo(
  userId: string,
  file: { buffer: Buffer; mimetype: string; originalname: string },
): Promise<string> {
  const fileExtension = file.originalname.split(".").pop() ?? "png";
  const storagePath = `${userId}/logo-${Date.now()}.${fileExtension}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Upserts the brand kit for a given user. Per FRD, each user has at most
 * one active brand kit (MVP scope — one row per user_id).
 */
export async function upsertBrandKit(
  userId: string,
  input: UpsertBrandKitRequest,
): Promise<BrandKitResponse> {
  const { data, error } = await supabaseAdmin
    .from("brand_kits")
    .upsert(
      {
        user_id: userId,
        logo_url: input.logoUrl,
        primary_color: input.primaryColor,
        accent_color: input.accentColor,
        font_family: input.fontFamily,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select(
      "id, logo_url, primary_color, accent_color, font_family, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return toBrandKitResponse(data);
}

/**
 * Fetches the active brand kit for a user. Returns null if the user has
 * never set one up — callers should not treat this as an error.
 */
export async function findActiveBrandKit(
  userId: string,
): Promise<BrandKitResponse | null> {
  const { data, error } = await supabaseAdmin
    .from("brand_kits")
    .select(
      "id, logo_url, primary_color, accent_color, font_family, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toBrandKitResponse(data);
}
