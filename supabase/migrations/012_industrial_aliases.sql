-- Migration 012: Aliases/views para nomenclatura industrial PIMO-TRAK
-- O código usa industrial_piece_*; estas views expõem nomes canónicos pedidos em documentação.

CREATE OR REPLACE VIEW public.industrial_operations AS
SELECT
  piece_id,
  operation_id,
  status,
  payload,
  updated_at
FROM public.industrial_piece_operations;

CREATE OR REPLACE VIEW public.industrial_quality AS
SELECT
  id,
  piece_id,
  decision,
  payload,
  created_at AS updated_at
FROM public.industrial_piece_quality;

CREATE OR REPLACE VIEW public.industrial_time_tracking AS
SELECT
  id,
  piece_id,
  payload,
  created_at AS updated_at
FROM public.industrial_piece_time_entries;

CREATE OR REPLACE VIEW public.industrial_tracking AS
SELECT
  t.id,
  t.work_order_id,
  t.piece_id,
  t.operation_type,
  t.status,
  t.operator_id,
  t.started_at,
  t.completed_at,
  t.rejected_at,
  t.metadata,
  t.created_at,
  t.updated_at
FROM public.industrial_work_order_tasks t;

CREATE OR REPLACE VIEW public.industrial_rework AS
SELECT
  q.id,
  q.piece_id,
  q.decision,
  q.payload,
  q.created_at AS updated_at
FROM public.industrial_piece_quality q
WHERE q.decision IN ('rework', 'rejected');

CREATE OR REPLACE VIEW public.industrial_settings AS
SELECT key, value, updated_at FROM public.system_settings;

CREATE OR REPLACE VIEW public.industrial_events AS
SELECT
  e.id,
  e.work_order_id,
  e.task_id,
  e.event_type AS type,
  e.operator_id AS user_id,
  e.metadata,
  e.created_at
FROM public.industrial_work_order_events e;

GRANT SELECT ON public.industrial_operations TO authenticated, anon;
GRANT SELECT ON public.industrial_quality TO authenticated, anon;
GRANT SELECT ON public.industrial_time_tracking TO authenticated, anon;
GRANT SELECT ON public.industrial_tracking TO authenticated, anon;
GRANT SELECT ON public.industrial_rework TO authenticated, anon;
GRANT SELECT ON public.industrial_settings TO authenticated, anon;
GRANT SELECT ON public.industrial_events TO authenticated, anon;
