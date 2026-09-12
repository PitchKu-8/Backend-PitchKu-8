-- =========================================
-- 1. Profiles (synchronized with Supabase auth.users)
-- =========================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================
-- 2. Brand Kits
-- =========================================
CREATE TABLE public.brand_kits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#0F4C81' NOT NULL,
  accent_color VARCHAR(7) DEFAULT '#F2A007' NOT NULL,
  font_family VARCHAR(50) DEFAULT 'Inter' NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT primary_color_hex_format CHECK (primary_color ~ '^#([A-Fa-f0-9]{6})$'),
  CONSTRAINT accent_color_hex_format CHECK (accent_color ~ '^#([A-Fa-f0-9]{6})$')
);

CREATE INDEX idx_brand_kits_user_id ON public.brand_kits(user_id);

-- =========================================
-- 3. Projects
-- =========================================
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(150) NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT status_valid_values CHECK (status IN ('draft', 'completed')),
  CONSTRAINT template_type_valid_values CHECK (
    template_type IN ('company_profile', 'penawaran_produk', 'proposal_kerjasama', 'laporan_ringkas')
  )
);

CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_status ON public.projects(status);

-- =========================================
-- 4. Deck Versions (slide JSON snapshot)
-- =========================================
CREATE TABLE public.deck_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  version_number INT DEFAULT 1 NOT NULL,
  slides_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_deck_versions_project_id ON public.deck_versions(project_id);

-- =========================================
-- 5. Generation Logs (cost tracking & SLA)
-- =========================================
CREATE TABLE public.generation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  stage VARCHAR(20) NOT NULL,
  model_name VARCHAR(50) NOT NULL,
  prompt_tokens INT DEFAULT 0 NOT NULL,
  completion_tokens INT DEFAULT 0 NOT NULL,
  duration_ms INT NOT NULL,
  estimated_cost_usd NUMERIC(10, 6) DEFAULT 0.0,
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT stage_valid_values CHECK (stage IN ('outline', 'content')),
  CONSTRAINT status_valid_values CHECK (status IN ('success', 'retry', 'failed'))
);

CREATE INDEX idx_generation_logs_project_id ON public.generation_logs(project_id);