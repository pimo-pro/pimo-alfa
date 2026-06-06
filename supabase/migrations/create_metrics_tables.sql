-- Migration: Metrics Engine - Optional aggregated tables
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.work_order_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  total_time_seconds int DEFAULT 0,
  time_per_status jsonb DEFAULT '{}',
  time_per_department jsonb DEFAULT '{}',
  tasks_count int DEFAULT 0,
  tasks_completed int DEFAULT 0,
  tasks_rejected int DEFAULT 0,
  completion_percentage int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(work_order_id)
);

CREATE TABLE IF NOT EXISTS public.user_metrics (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tasks_completed int DEFAULT 0,
  tasks_rejected int DEFAULT 0,
  avg_task_time_seconds int DEFAULT 0,
  total_task_time_seconds int DEFAULT 0,
  work_orders_assigned int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.department_metrics (
  department_id uuid PRIMARY KEY REFERENCES public.departments(id) ON DELETE CASCADE,
  work_orders_count int DEFAULT 0,
  avg_completion_time_seconds int DEFAULT 0,
  bottleneck_status text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.work_order_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read work_order_metrics" ON public.work_order_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read user_metrics" ON public.user_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read department_metrics" ON public.department_metrics FOR SELECT TO authenticated USING (true);
