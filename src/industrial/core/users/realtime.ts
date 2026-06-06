import { supabase } from '@/industrial/infra/db';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';
import type { IndustrialUserProfile } from './types';

export function subscribeToUsers(handler: (_profile: IndustrialUserProfile) => void) {
  const channel = supabase
    .channel('industrial:profiles')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: INDUSTRIAL_TABLES.profiles },
      (payload) => handler(payload.new as IndustrialUserProfile),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
