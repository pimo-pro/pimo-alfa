import { supabase } from '@/industrial/infra/db';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';
import type { WorkOrder } from './types';

export type WorkOrderRealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';
export type WorkOrderRealtimeHandler = (_payload: {
  eventType: WorkOrderRealtimeEvent;
  new: WorkOrder | null;
  old: Partial<WorkOrder> | null;
}) => void;

export function subscribeToWorkOrders(handler: WorkOrderRealtimeHandler) {
  const channel = supabase
    .channel('industrial:work_orders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: INDUSTRIAL_TABLES.workOrders },
      (payload) =>
        handler({
          eventType: payload.eventType as WorkOrderRealtimeEvent,
          new: payload.new as WorkOrder | null,
          old: payload.old as Partial<WorkOrder> | null,
        }),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
