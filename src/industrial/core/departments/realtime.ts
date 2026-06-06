import { supabase } from '@/industrial/infra/db';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';
import type { IndustrialDepartment } from './types';

export function subscribeToDepartments(handler: (_department: IndustrialDepartment) => void) {
  const channel = supabase
    .channel('industrial:departments')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: INDUSTRIAL_TABLES.departments },
      (payload) => handler(payload.new as IndustrialDepartment),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
