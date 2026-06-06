-- =============================================================================
-- 002_full_repair.sql - REPARO COMPLETO DO BANCO
-- =============================================================================
-- Execute no Supabase SQL Editor. Este script é IDEMPOTENTE.
-- 1. Move tabelas de schema errado para public
-- 2. Cria tabelas faltantes
-- 3. Adiciona PK se faltando (exceto quality_stats que usa work_order_id)
-- 4. Recria RLS e policies
-- 5. Aplica GRANTs
-- 6. Recria índices essenciais
--
-- PRÉ-REQUISITO: Tabela `profiles` deve existir (Supabase Auth)
-- PÓS-EXECUÇÃO: Se 404 persistir, Settings > API > Restart Project (aguardar 2 min)
-- =============================================================================

-- ========== 0. MOVER TABELAS PARA PUBLIC (se em schema errado) ==========
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname NOT IN ('public', 'pg_catalog', 'information_schema', 'auth', 'storage', 'extensions', 'graphql', 'graphql_public', 'realtime', 'vault')
    AND c.relname IN ('departments', 'work_orders', 'work_order_tasks', 'task_status_history', 'work_order_statuses', 'work_order_transitions', 'work_order_rules', 'work_order_events', 'system_events', 'quality_reasons', 'quality_checks', 'quality_stats')
  ) LOOP
    EXECUTE format('ALTER TABLE %I.%I SET SCHEMA public', r.schema_name, r.table_name);
    RAISE NOTICE 'Movido: %.% -> public.%', r.schema_name, r.table_name, r.table_name;
  END LOOP;
END $$;

-- ========== 1. CRIAR TABELAS FALTANTES ==========

CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  status text DEFAULT 'novo',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS priority text;

CREATE TABLE IF NOT EXISTS public.work_order_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text DEFAULT 'task',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')); $$ LANGUAGE sql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS public.work_order_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  color text DEFAULT '#3b82f6',
  order_index int DEFAULT 0,
  is_default boolean DEFAULT false,
  is_final boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_order_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_status_id uuid REFERENCES public.work_order_statuses(id) ON DELETE CASCADE,
  to_status_id uuid REFERENCES public.work_order_statuses(id) ON DELETE CASCADE,
  allowed_roles text[] DEFAULT '{}',
  allowed_departments uuid[] DEFAULT '{}',
  auto_advance boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_order_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  match_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  match_role text,
  match_priority text,
  assign_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assign_to_role text,
  assign_to_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('created', 'status_changed', 'assigned', 'rule_applied')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quality_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.quality_stats (
  work_order_id uuid PRIMARY KEY REFERENCES public.work_orders(id) ON DELETE CASCADE,
  approved_count int DEFAULT 0,
  rejected_count int DEFAULT 0,
  quality_score int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.work_order_tasks(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.work_order_statuses (name, slug, color, order_index, is_default, is_final)
VALUES ('Novo', 'novo', '#3b82f6', 0, true, false), ('Em andamento', 'em_andamento', '#f59e0b', 1, false, false), ('Feito', 'feito', '#10b981', 2, false, true)
ON CONFLICT (slug) DO NOTHING;

-- ========== 2. ÍNDICES ESSENCIAIS ==========
CREATE INDEX IF NOT EXISTS idx_work_orders_department_id ON public.work_orders(department_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON public.work_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_order_tasks_work_order_id ON public.work_order_tasks(work_order_id);
CREATE INDEX IF NOT EXISTS idx_task_status_history_work_order_id ON public.task_status_history(work_order_id);
CREATE INDEX IF NOT EXISTS idx_system_events_type ON public.system_events(type);
CREATE INDEX IF NOT EXISTS idx_system_events_work_order_id ON public.system_events(work_order_id);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON public.system_events(created_at DESC);

-- ========== 3. RLS E POLICIES (idempotente) ==========

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read departments" ON public.departments;
CREATE POLICY "Allow authenticated read departments" ON public.departments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert departments" ON public.departments;
CREATE POLICY "Allow authenticated insert departments" ON public.departments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated update departments" ON public.departments;
CREATE POLICY "Allow authenticated update departments" ON public.departments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated delete departments" ON public.departments;
CREATE POLICY "Allow authenticated delete departments" ON public.departments FOR DELETE TO authenticated USING (true);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read work_orders" ON public.work_orders;
CREATE POLICY "Allow authenticated read work_orders" ON public.work_orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert work_orders" ON public.work_orders;
CREATE POLICY "Allow authenticated insert work_orders" ON public.work_orders FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated update work_orders" ON public.work_orders;
CREATE POLICY "Allow authenticated update work_orders" ON public.work_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated delete work_orders" ON public.work_orders;
CREATE POLICY "Allow authenticated delete work_orders" ON public.work_orders FOR DELETE TO authenticated USING (true);

ALTER TABLE public.work_order_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read work_order_tasks" ON public.work_order_tasks;
CREATE POLICY "Allow authenticated read work_order_tasks" ON public.work_order_tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert work_order_tasks" ON public.work_order_tasks;
CREATE POLICY "Allow authenticated insert work_order_tasks" ON public.work_order_tasks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated update work_order_tasks" ON public.work_order_tasks;
CREATE POLICY "Allow authenticated update work_order_tasks" ON public.work_order_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated delete work_order_tasks" ON public.work_order_tasks;
CREATE POLICY "Allow authenticated delete work_order_tasks" ON public.work_order_tasks FOR DELETE TO authenticated USING (true);

ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read task_status_history" ON public.task_status_history;
CREATE POLICY "Allow authenticated read task_status_history" ON public.task_status_history FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert task_status_history" ON public.task_status_history;
CREATE POLICY "Allow authenticated insert task_status_history" ON public.task_status_history FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE public.work_order_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read statuses" ON public.work_order_statuses;
CREATE POLICY "Allow authenticated read statuses" ON public.work_order_statuses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow admin/manager manage statuses" ON public.work_order_statuses;
CREATE POLICY "Allow admin/manager manage statuses" ON public.work_order_statuses FOR ALL TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

ALTER TABLE public.work_order_transitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read transitions" ON public.work_order_transitions;
CREATE POLICY "Allow authenticated read transitions" ON public.work_order_transitions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow admin/manager manage transitions" ON public.work_order_transitions;
CREATE POLICY "Allow admin/manager manage transitions" ON public.work_order_transitions FOR ALL TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

ALTER TABLE public.work_order_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read rules" ON public.work_order_rules;
CREATE POLICY "Allow authenticated read rules" ON public.work_order_rules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow admin/manager manage rules" ON public.work_order_rules;
CREATE POLICY "Allow admin/manager manage rules" ON public.work_order_rules FOR ALL TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

ALTER TABLE public.work_order_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read events" ON public.work_order_events;
CREATE POLICY "Allow authenticated read events" ON public.work_order_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert events" ON public.work_order_events;
CREATE POLICY "Allow authenticated insert events" ON public.work_order_events FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE public.quality_reasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read quality_reasons" ON public.quality_reasons;
CREATE POLICY "Allow authenticated read quality_reasons" ON public.quality_reasons FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow admin/manager manage quality_reasons" ON public.quality_reasons;
CREATE POLICY "Allow admin/manager manage quality_reasons" ON public.quality_reasons FOR ALL TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

ALTER TABLE public.quality_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read quality_checks" ON public.quality_checks;
CREATE POLICY "Allow authenticated read quality_checks" ON public.quality_checks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert quality_checks" ON public.quality_checks;
CREATE POLICY "Allow authenticated insert quality_checks" ON public.quality_checks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated update quality_checks" ON public.quality_checks;
CREATE POLICY "Allow authenticated update quality_checks" ON public.quality_checks FOR UPDATE TO authenticated USING (true);

ALTER TABLE public.quality_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read quality_stats" ON public.quality_stats;
CREATE POLICY "Allow authenticated read quality_stats" ON public.quality_stats FOR SELECT TO authenticated USING (true);

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read system_events" ON public.system_events;
CREATE POLICY "Allow authenticated read system_events" ON public.system_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert system_events" ON public.system_events;
CREATE POLICY "Allow authenticated insert system_events" ON public.system_events FOR INSERT TO authenticated WITH CHECK (true);

-- ========== 4. GRANTS (PostgREST / REST API) ==========
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_tasks TO authenticated;
GRANT SELECT, INSERT ON public.task_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_statuses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_transitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_rules TO authenticated;
GRANT SELECT, INSERT ON public.work_order_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_reasons TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quality_checks TO authenticated;
GRANT SELECT ON public.quality_stats TO authenticated;
GRANT SELECT, INSERT ON public.system_events TO authenticated;

-- ========== FIM ==========
SELECT 'Reparo concluído. Execute 001_diagnostic_check.sql para confirmar. Se 404 persistir: Settings > API > Restart Project.' AS resultado;
