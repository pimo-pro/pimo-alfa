import type { IndustrialSystemEvent } from '@/industrial/infra/supabase/events';
import type { IndustrialUiCard } from './types';

export function industrialEventToUiCard(event: IndustrialSystemEvent): IndustrialUiCard {
  return {
    id: event.id,
    title: event.type,
    subtitle: event.created_at,
    status: event.type.includes('error') ? 'critical' : 'normal',
    meta: event.metadata,
  };
}
