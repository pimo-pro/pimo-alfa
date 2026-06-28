-- Migration 014: Views industriais com nomenclatura de etiqueta (project/box/piece codes)

CREATE OR REPLACE VIEW public.industrial_work_order_tasks_view AS
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
  t.updated_at,
  o.project_id,
  COALESCE(NULLIF(t.metadata->>'project_code', ''), NULLIF(o.metadata->>'project_code', ''), '') AS project_code,
  COALESCE(t.metadata->>'box_code', '') AS box_code,
  COALESCE(t.metadata->>'piece_code', '') AS piece_code,
  COALESCE(t.metadata->>'full_industrial_name', '') AS full_industrial_name,
  COALESCE(t.metadata->>'nqr_code', '') AS nqr_code
FROM public.industrial_work_order_tasks t
JOIN public.industrial_work_orders o ON o.id = t.work_order_id;

CREATE OR REPLACE VIEW public.industrial_tracking AS
SELECT
  v.id,
  v.work_order_id,
  v.piece_id,
  v.operation_type,
  v.status,
  v.operator_id,
  v.started_at,
  v.completed_at,
  v.rejected_at,
  v.metadata,
  v.created_at,
  v.updated_at,
  v.project_id,
  v.project_code,
  v.box_code,
  v.piece_code,
  v.full_industrial_name,
  v.nqr_code
FROM public.industrial_work_order_tasks_view v;

GRANT SELECT ON public.industrial_work_order_tasks_view TO authenticated, anon;
