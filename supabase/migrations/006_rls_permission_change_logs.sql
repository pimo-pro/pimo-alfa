-- =============================================================================
-- Migration 006: RLS para permission_change_logs
-- =============================================================================
-- Execute no Supabase SQL Editor
-- PRÉ-REQUISITO: Migration 005 (tabela permission_change_logs)
-- =============================================================================

ALTER TABLE public.permission_change_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admin pode ver os logs
DROP POLICY IF EXISTS "Admins can select permission_change_logs" ON public.permission_change_logs;
CREATE POLICY "Admins can select permission_change_logs"
  ON public.permission_change_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'admin'
    )
  );

-- Apenas admin pode inserir logs (ao alterar role via settings/roles)
DROP POLICY IF EXISTS "Admins can insert permission_change_logs" ON public.permission_change_logs;
CREATE POLICY "Admins can insert permission_change_logs"
  ON public.permission_change_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'admin'
    )
  );

-- Sem UPDATE/DELETE (logs são imutáveis)
