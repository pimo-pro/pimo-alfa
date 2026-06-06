-- Migration: work_order_events for Dashboard activity stream
-- Run in Supabase SQL Editor
-- Requires: work_orders table

CREATE TABLE IF NOT EXISTS public.work_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('created', 'status_changed', 'assigned', 'rule_applied')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.work_order_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read events" ON public.work_order_events;
CREATE POLICY "Allow authenticated read events"
ON public.work_order_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert events" ON public.work_order_events;
CREATE POLICY "Allow authenticated insert events"
ON public.work_order_events FOR INSERT TO authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON public.work_order_events TO authenticated;
