-- Migration 000: Bootstrap da tabela profiles (projecto Supabase novo / sem Auth trigger)
-- Necessária antes de 002_full_repair.sql (função is_admin_or_manager referencia profiles).

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  role text DEFAULT 'worker',
  default_department uuid NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated read profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert profiles" ON public.profiles;
CREATE POLICY "Allow authenticated insert profiles"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update profiles" ON public.profiles;
CREATE POLICY "Allow authenticated update profiles"
  ON public.profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
