-- Migration: Event Log + Analytics Layer
-- Run in Supabase SQL Editor

-- system_events: central event log for all system activities
CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.work_order_tasks(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_events_type ON public.system_events(type);
CREATE INDEX IF NOT EXISTS idx_system_events_work_order_id ON public.system_events(work_order_id);
CREATE INDEX IF NOT EXISTS idx_system_events_task_id ON public.system_events(task_id);
CREATE INDEX IF NOT EXISTS idx_system_events_user_id ON public.system_events(user_id);
CREATE INDEX IF NOT EXISTS idx_system_events_department_id ON public.system_events(department_id);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON public.system_events(created_at DESC);

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read system_events" ON public.system_events;
CREATE POLICY "Allow authenticated read system_events" ON public.system_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert system_events" ON public.system_events;
CREATE POLICY "Allow authenticated insert system_events" ON public.system_events FOR INSERT TO authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON public.system_events TO authenticated;

-- Add to Realtime publication (run in Supabase Dashboard > Database > Replication)
-- Add "system_events" table to supabase_realtime publication
