-- Migration: Quality Control Layer
-- Run in Supabase SQL Editor

-- 1) quality_reasons (motivos de rejeição)
CREATE TABLE IF NOT EXISTS public.quality_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quality_reasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read quality_reasons" ON public.quality_reasons;
CREATE POLICY "Allow authenticated read quality_reasons" ON public.quality_reasons FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow admin/manager manage quality_reasons" ON public.quality_reasons;
CREATE POLICY "Allow admin/manager manage quality_reasons" ON public.quality_reasons FOR ALL TO authenticated
  USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

-- 2) quality_checks
CREATE TABLE IF NOT EXISTS public.quality_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.work_order_tasks(id) ON DELETE CASCADE,
  checked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  result text NOT NULL CHECK (result IN ('approved', 'rejected')),
  reason text,
  reason_id uuid REFERENCES public.quality_reasons(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quality_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read quality_checks" ON public.quality_checks;
CREATE POLICY "Allow authenticated read quality_checks" ON public.quality_checks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert quality_checks" ON public.quality_checks;
CREATE POLICY "Allow authenticated insert quality_checks" ON public.quality_checks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated update quality_checks" ON public.quality_checks;
CREATE POLICY "Allow authenticated update quality_checks" ON public.quality_checks FOR UPDATE TO authenticated USING (true);

-- 3) quality_stats (cache opcional)
CREATE TABLE IF NOT EXISTS public.quality_stats (
  work_order_id uuid PRIMARY KEY REFERENCES public.work_orders(id) ON DELETE CASCADE,
  approved_count int DEFAULT 0,
  rejected_count int DEFAULT 0,
  quality_score int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.quality_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read quality_stats" ON public.quality_stats;
CREATE POLICY "Allow authenticated read quality_stats" ON public.quality_stats FOR SELECT TO authenticated USING (true);

-- Seed default reasons (run manually if needed)
-- INSERT INTO public.quality_reasons (name, description) VALUES
--   ('Dimensão incorreta', 'Peça fora das medidas especificadas'),
--   ('Defeito superficial', 'Risco, arranhão ou imperfeição'),
--   ('Material incorreto', 'Material diferente do solicitado'),
--   ('Montagem incorreta', 'Erro no processo de montagem'),
--   ('Outro', 'Outro motivo');
