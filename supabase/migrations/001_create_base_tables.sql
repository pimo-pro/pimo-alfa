-- =============================================================================
-- Migration 001: Tabelas base (departments, work_orders, work_order_tasks)
-- =============================================================================
-- Execute no Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- PRÉ-REQUISITO: A tabela `profiles` deve existir (criada pelo Supabase Auth ou create_profiles_table_safe.js)
--
-- Após executar, o REST API exporá:
--   GET /rest/v1/departments
--   GET /rest/v1/work_orders
--   GET /rest/v1/work_order_tasks
-- =============================================================================

-- ============================
-- 1. TABELA: departments
-- ============================
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read departments" ON public.departments;
CREATE POLICY "Allow authenticated read departments"
  ON public.departments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert departments" ON public.departments;
CREATE POLICY "Allow authenticated insert departments"
  ON public.departments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update departments" ON public.departments;
CREATE POLICY "Allow authenticated update departments"
  ON public.departments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete departments" ON public.departments;
CREATE POLICY "Allow authenticated delete departments"
  ON public.departments FOR DELETE TO authenticated USING (true);

-- ============================
-- 2. TABELA: work_orders
-- ============================
CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  status text DEFAULT 'novo',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read work_orders" ON public.work_orders;
CREATE POLICY "Allow authenticated read work_orders"
  ON public.work_orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert work_orders" ON public.work_orders;
CREATE POLICY "Allow authenticated insert work_orders"
  ON public.work_orders FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update work_orders" ON public.work_orders;
CREATE POLICY "Allow authenticated update work_orders"
  ON public.work_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete work_orders" ON public.work_orders;
CREATE POLICY "Allow authenticated delete work_orders"
  ON public.work_orders FOR DELETE TO authenticated USING (true);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_work_orders_department_id ON public.work_orders(department_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON public.work_orders(created_at DESC);

-- ============================
-- 3. TABELA: work_order_tasks
-- ============================
CREATE TABLE IF NOT EXISTS public.work_order_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text DEFAULT 'task',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.work_order_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read work_order_tasks" ON public.work_order_tasks;
CREATE POLICY "Allow authenticated read work_order_tasks"
  ON public.work_order_tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert work_order_tasks" ON public.work_order_tasks;
CREATE POLICY "Allow authenticated insert work_order_tasks"
  ON public.work_order_tasks FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update work_order_tasks" ON public.work_order_tasks;
CREATE POLICY "Allow authenticated update work_order_tasks"
  ON public.work_order_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete work_order_tasks" ON public.work_order_tasks;
CREATE POLICY "Allow authenticated delete work_order_tasks"
  ON public.work_order_tasks FOR DELETE TO authenticated USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_work_order_tasks_work_order_id ON public.work_order_tasks(work_order_id);

-- ============================
-- 4. TABELA: task_status_history
-- ============================
CREATE TABLE IF NOT EXISTS public.task_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read task_status_history" ON public.task_status_history;
CREATE POLICY "Allow authenticated read task_status_history"
  ON public.task_status_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert task_status_history" ON public.task_status_history;
CREATE POLICY "Allow authenticated insert task_status_history"
  ON public.task_status_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_task_status_history_work_order_id ON public.task_status_history(work_order_id);

-- ============================
-- 5. Grant para API (PostgREST)
-- ============================
-- Garante que o role anon e service_role possam acessar
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_tasks TO authenticated;
GRANT SELECT, INSERT ON public.task_status_history TO authenticated;

-- ============================
-- 6. Reload schema cache (PostgREST)
-- ============================
-- O PostgREST usa cache do schema. Após criar tabelas, pode ser necessário:
-- - Supabase Dashboard > Settings > API > "Reload schema" (se disponível)
-- - Ou aguardar alguns segundos para o cache expirar
-- - Ou fazer um restart do projeto no Dashboard
