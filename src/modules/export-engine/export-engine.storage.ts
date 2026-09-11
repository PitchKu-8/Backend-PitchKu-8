// src/modules/export-engine/export-engine.storage.ts
import { supabaseAdmin } from "@shared/lib/supabase-client";

const STORAGE_BUCKET = "exports";

/**
 * Uploads a generated export buffer to Supabase Storage, namespaced
 * under the user's id (consistent with brand-kit.repository.ts's
 * logo upload pattern), and returns its public URL.
 */
export async function uploadExportFile(
  userId: string,
  fileName: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const storagePath = `${userId}/${fileName}`;

  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}
