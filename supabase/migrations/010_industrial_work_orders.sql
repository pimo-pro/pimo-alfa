-- Migration 010: Work Orders industriais (Fase 3)
-- Camada UI/persistence — separada do core work_orders legado.

CREATE TABLE IF NOT EXISTS public.industrial_work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  station text NOT NULL CHECK (
    station IN ('warehouse', 'nesting', 'drill', 'orlar', 'montagem', 'embalagem')
  ),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'cancelled')
  ),
  piece_ids jsonb NOT NULL DEFAULT '[]',
  operation_types jsonb NOT NULL DEFAULT '[]',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_industrial_work_orders_project
  ON public.industrial_work_orders (project_id);

CREATE INDEX IF NOT EXISTS idx_industrial_work_orders_station
  ON public.industrial_work_orders (station, status);

CREATE TABLE IF NOT EXISTS public.industrial_work_order_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.industrial_work_orders(id) ON DELETE CASCADE,
  piece_id text NOT NULL,
  operation_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'rejected')
  ),
  operator_id text,
  started_at timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_industrial_work_order_tasks_order
  ON public.industrial_work_order_tasks (work_order_id);

CREATE INDEX IF NOT EXISTS idx_industrial_work_order_tasks_piece
  ON public.industrial_work_order_tasks (piece_id);

CREATE INDEX IF NOT EXISTS idx_industrial_work_order_tasks_status
  ON public.industrial_work_order_tasks (status);

CREATE TABLE IF NOT EXISTS public.industrial_work_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.industrial_work_orders(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.industrial_work_order_tasks(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  operator_id text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_industrial_work_order_events_order
  ON public.industrial_work_order_events (work_order_id, created_at DESC);

ALTER TABLE public.industrial_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industrial_work_order_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industrial_work_order_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'industrial_work_orders',
    'industrial_work_order_tasks',
    'industrial_work_order_events'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated read %1$s" ON public.%1$s', tbl);
    EXECUTE format('CREATE POLICY "authenticated read %1$s" ON public.%1$s FOR SELECT TO authenticated USING (true)', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated write %1$s" ON public.%1$s', tbl);
    EXECUTE format('CREATE POLICY "authenticated write %1$s" ON public.%1$s FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;
