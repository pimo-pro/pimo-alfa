-- =============================================================================
-- Migration 004: Políticas RLS baseadas em roles (admin, operador, worker, guest)
-- =============================================================================
-- Execute no Supabase SQL Editor
-- PRÉ-REQUISITO: Migration 003 (profiles.role, profiles.default_department)
--
-- Estas políticas substituem políticas genéricas "Allow authenticated"
-- por políticas que verificam o role em profiles.
-- =============================================================================

-- ============================
-- work_orders
-- ============================
-- Admin: acesso total
DROP POLICY IF EXISTS "Admin full access work_orders" ON public.work_orders;
CREATE POLICY "Admin full access work_orders"
  ON public.work_orders FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Operador: leitura e escrita (sem delete)
DROP POLICY IF EXISTS "Operador read write work_orders" ON public.work_orders;
CREATE POLICY "Operador read write work_orders"
  ON public.work_orders FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'operador', 'manager')));
CREATE POLICY "Operador insert work_orders"
  ON public.work_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'operador', 'manager')));
CREATE POLICY "Operador update work_orders"
  ON public.work_orders FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'operador', 'manager')));

-- Worker: leitura apenas (work orders do seu departamento ou atribuídas)
DROP POLICY IF EXISTS "Worker read work_orders" ON public.work_orders;
CREATE POLICY "Worker read work_orders"
  ON public.work_orders FOR SELECT TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'operador', 'manager', 'worker'))
  );

-- Manter política genérica para compatibilidade - remover se preferir RLS restritivo
-- Se as políticas acima forem insuficientes, descomente as antigas em 001_create_base_tables.sql

-- ============================
-- work_order_tasks
-- ============================
DROP POLICY IF EXISTS "Allow authenticated read work_order_tasks" ON public.work_order_tasks;
DROP POLICY IF EXISTS "Allow authenticated insert work_order_tasks" ON public.work_order_tasks;
DROP POLICY IF EXISTS "Allow authenticated update work_order_tasks" ON public.work_order_tasks;
DROP POLICY IF EXISTS "Allow authenticated delete work_order_tasks" ON public.work_order_tasks;

DROP POLICY IF EXISTS "Admin full access work_order_tasks" ON public.work_order_tasks;
CREATE POLICY "Admin full access work_order_tasks"
  ON public.work_order_tasks FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

DROP POLICY IF EXISTS "Operador read write work_order_tasks" ON public.work_order_tasks;
CREATE POLICY "Operador read write work_order_tasks"
  ON public.work_order_tasks FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'operador', 'manager')));
CREATE POLICY "Operador insert work_order_tasks"
  ON public.work_order_tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'operador', 'manager')));
CREATE POLICY "Operador update work_order_tasks"
  ON public.work_order_tasks FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'operador', 'manager')));

-- Worker: leitura de tasks
CREATE POLICY "Worker read work_order_tasks"
  ON public.work_order_tasks FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'operador', 'manager', 'worker')));

-- ============================
-- departments
-- ============================
-- Admin e Operador: leitura e escrita
-- Worker e Guest: leitura
DROP POLICY IF EXISTS "Allow authenticated read departments" ON public.departments;
DROP POLICY IF EXISTS "Allow authenticated insert departments" ON public.departments;
DROP POLICY IF EXISTS "Allow authenticated update departments" ON public.departments;
DROP POLICY IF EXISTS "Allow authenticated delete departments" ON public.departments;

CREATE POLICY "Roles read departments"
  ON public.departments FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles));

CREATE POLICY "Admin operador manage departments"
  ON public.departments FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'operador', 'manager')));
