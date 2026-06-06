import { supabase } from '@/industrial/infra/db';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';
import type { IndustrialNotification } from './types';

export type IndustrialNotificationHandler = (_notification: IndustrialNotification) => void;

export function subscribeToNotifications(userId: string, handler: IndustrialNotificationHandler) {
  const channel = supabase
    .channel(`industrial:notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: INDUSTRIAL_TABLES.notifications, filter: `user_id=eq.${userId}` },
      (payload) => handler(payload.new as IndustrialNotification),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
