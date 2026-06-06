-- =============================================================================
-- Migration 007: FK work_order_tasks.work_order_id → work_orders.id
-- =============================================================================
-- A interface do Supabase não exibe mais o botão Relationships.
-- Esta migration cria a foreign key manualmente para habilitar embeds no PostgREST.
--
-- Execute no Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- Remove constraint padrão se existir (criada por REFERENCES no CREATE TABLE)
ALTER TABLE public.work_order_tasks
  DROP CONSTRAINT IF EXISTS work_order_tasks_work_order_id_fkey;

-- Adiciona constraint nomeada com ON DELETE CASCADE
ALTER TABLE public.work_order_tasks
  ADD CONSTRAINT fk_work_order_tasks_work_order
  FOREIGN KEY (work_order_id)
  REFERENCES public.work_orders(id)
  ON DELETE CASCADE;
