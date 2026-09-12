-- Add UNIQUE constraint on brand_kits.user_id.
-- Required for upsertBrandKit() to work correctly with onConflict: 'user_id' —
-- without this, Supabase's upsert cannot detect an existing row and will
-- always insert a new one instead of updating (MVP assumes one brand kit
-- per user, per docs/API-CONTRACT.md).
ALTER TABLE public.brand_kits
  ADD CONSTRAINT brand_kits_user_id_unique UNIQUE (user_id);