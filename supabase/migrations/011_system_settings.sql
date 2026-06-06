-- =============================================================================
-- Migration 011: Tabela system_settings (configurações chave-valor)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read system_settings" ON public.system_settings;
CREATE POLICY "Allow authenticated read system_settings"
  ON public.system_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated upsert system_settings" ON public.system_settings;
CREATE POLICY "Allow authenticated upsert system_settings"
  ON public.system_settings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update system_settings" ON public.system_settings;
CREATE POLICY "Allow authenticated update system_settings"
  ON public.system_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at ON public.system_settings(updated_at DESC);
