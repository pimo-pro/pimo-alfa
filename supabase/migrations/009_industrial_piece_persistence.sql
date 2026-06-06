-- Migration 009: Persistência UI da peça industrial (Fase 2)
-- Tabelas dedicadas à camada persistence/ — não alteram o core industrial.

CREATE TABLE IF NOT EXISTS public.industrial_piece_transforms (
  piece_id text NOT NULL,
  entity_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('piece', 'remate', 'rodape')),
  position jsonb NOT NULL DEFAULT '{"x":0,"y":0,"z":0}',
  rotation jsonb NOT NULL DEFAULT '{"x":0,"y":0,"z":0}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (piece_id, entity_id)
);

CREATE TABLE IF NOT EXISTS public.industrial_piece_edges (
  piece_id text NOT NULL,
  entity_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('piece', 'remate', 'rodape')),
  payload jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (piece_id, entity_id)
);

CREATE TABLE IF NOT EXISTS public.industrial_piece_operations (
  piece_id text NOT NULL,
  operation_id text NOT NULL,
  status text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (piece_id, operation_id)
);

CREATE TABLE IF NOT EXISTS public.industrial_piece_quality (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected', 'rework')),
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_industrial_piece_quality_piece_id
  ON public.industrial_piece_quality (piece_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.industrial_piece_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_industrial_piece_time_piece_id
  ON public.industrial_piece_time_entries (piece_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.industrial_piece_remates (
  piece_id text NOT NULL,
  entity_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('remate', 'rodape')),
  payload jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (piece_id, entity_id)
);

ALTER TABLE public.industrial_piece_transforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industrial_piece_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industrial_piece_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industrial_piece_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industrial_piece_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industrial_piece_remates ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'industrial_piece_transforms',
    'industrial_piece_edges',
    'industrial_piece_operations',
    'industrial_piece_quality',
    'industrial_piece_time_entries',
    'industrial_piece_remates'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated read %1$s" ON public.%1$s', tbl);
    EXECUTE format('CREATE POLICY "authenticated read %1$s" ON public.%1$s FOR SELECT TO authenticated USING (true)', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated write %1$s" ON public.%1$s', tbl);
    EXECUTE format('CREATE POLICY "authenticated write %1$s" ON public.%1$s FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;
