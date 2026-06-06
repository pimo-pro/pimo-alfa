import { supabase } from '@/industrial/infra/db';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';
import type { IndustrialTask } from './types';

export type TaskRealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';
export type TaskRealtimeHandler = (_payload: {
  eventType: TaskRealtimeEvent;
  new: IndustrialTask | null;
  old: Partial<IndustrialTask> | null;
}) => void;

export function subscribeToTasks(handler: TaskRealtimeHandler) {
  const channel = supabase
    .channel('industrial:work_order_tasks')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: INDUSTRIAL_TABLES.workOrderTasks },
      (payload) =>
        handler({
          eventType: payload.eventType as TaskRealtimeEvent,
          new: payload.new as IndustrialTask | null,
          old: payload.old as Partial<IndustrialTask> | null,
        }),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
