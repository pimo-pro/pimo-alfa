-- =============================================================================
-- Migration 008: Garantir coluna order_number em work_orders
-- =============================================================================
-- Se work_orders foi criada sem order_number, esta migration adiciona a coluna.
-- Execute no Supabase SQL Editor.
-- =============================================================================

ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS order_number text;
