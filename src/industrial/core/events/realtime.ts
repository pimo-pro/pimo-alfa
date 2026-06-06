import { supabase } from '@/industrial/infra/db';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';
import type { IndustrialSystemEvent } from '@/industrial/infra/supabase/events';

export type IndustrialEventHandler = (_event: IndustrialSystemEvent) => void;

/**
 * Subscricao realtime para o log de eventos industriais.
 */
export function subscribeToIndustrialEvents(handler: IndustrialEventHandler) {
  const channel = supabase
    .channel('industrial:system_events')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: INDUSTRIAL_TABLES.systemEvents },
      (payload) => handler(payload.new as IndustrialSystemEvent),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
