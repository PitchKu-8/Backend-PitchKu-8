-- =========================================
-- Aktifkan RLS di setiap tabel
-- =========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 1. Profiles — user hanya bisa baca/ubah profilenya sendiri
-- =========================================
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =========================================
-- 2. Brand Kits — hanya milik user yang login
-- =========================================
CREATE POLICY "brand_kits_select_own"
  ON public.brand_kits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "brand_kits_insert_own"
  ON public.brand_kits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "brand_kits_update_own"
  ON public.brand_kits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "brand_kits_delete_own"
  ON public.brand_kits FOR DELETE
  USING (auth.uid() = user_id);

-- =========================================
-- 3. Projects — hanya milik user yang login
-- =========================================
CREATE POLICY "projects_select_own"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_own"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_own"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "projects_delete_own"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- =========================================
-- 4. Deck Versions — akses lewat kepemilikan project (tidak ada kolom user_id langsung)
-- =========================================
CREATE POLICY "deck_versions_select_via_project"
  ON public.deck_versions FOR SELECT
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE POLICY "deck_versions_insert_via_project"
  ON public.deck_versions FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- =========================================
-- 5. Generation Logs — read-only untuk user, akses lewat kepemilikan project
-- =========================================
CREATE POLICY "generation_logs_select_via_project"
  ON public.generation_logs FOR SELECT
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );