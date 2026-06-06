-- =============================================================================
-- Migration 005: Tabela permission_change_logs (Audit Trail)
-- =============================================================================
-- Execute no Supabase SQL Editor
-- PRÉ-REQUISITO: Tabela profiles deve existir
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.permission_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  changed_by_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_role text,
  new_role text,
  old_default_department uuid,
  new_default_department uuid,
  context text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS permission_change_logs_target_user_id_idx
  ON public.permission_change_logs (target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS permission_change_logs_changed_by_user_id_idx
  ON public.permission_change_logs (changed_by_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS permission_change_logs_created_at_idx
  ON public.permission_change_logs (created_at DESC);
