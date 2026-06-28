-- Migration 013: RLS anon para cliente browser (anon key Vite) sem sessão Supabase Auth.
-- O PIMO usa auth PHP; o cliente industrial usa VITE_SUPABASE_ANON_KEY como role anon.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'industrial_work_orders',
    'industrial_work_order_tasks',
    'industrial_work_order_events',
    'industrial_piece_transforms',
    'industrial_piece_edges',
    'industrial_piece_operations',
    'industrial_piece_quality',
    'industrial_piece_time_entries',
    'industrial_piece_remates',
    'system_settings',
    'system_events'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon read %1$s" ON public.%1$s', tbl);
    EXECUTE format(
      'CREATE POLICY "anon read %1$s" ON public.%1$s FOR SELECT TO anon USING (true)',
      tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS "anon write %1$s" ON public.%1$s', tbl);
    EXECUTE format(
      'CREATE POLICY "anon write %1$s" ON public.%1$s FOR ALL TO anon USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;
