-- =============================================================================
-- Migration 003: Colunas role e default_department na tabela profiles
-- =============================================================================
-- Execute no Supabase SQL Editor
-- PRÉ-REQUISITO: Tabela profiles deve existir
-- =============================================================================

-- Adicionar coluna role se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'worker';
  END IF;
END $$;

-- Adicionar coluna default_department se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'default_department'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN default_department uuid NULL;
  END IF;
END $$;

-- Garantir valor padrão para role
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'worker';

-- Comentários
COMMENT ON COLUMN public.profiles.role IS 'Papel do usuário: admin, operador, worker, guest';
COMMENT ON COLUMN public.profiles.default_department IS 'Departamento padrão do usuário';
