import { INDUSTRIAL_EVENT_TYPES, industrialEventUtils, type IndustrialEventType } from '@/industrial/infra/supabase/events';

export const formatEventType = industrialEventUtils.formatEventType;
export const getEventColor = industrialEventUtils.getEventColor;
export const isCriticalEvent = industrialEventUtils.isCriticalEvent;

export function isIndustrialEventType(value: string): value is IndustrialEventType {
  return INDUSTRIAL_EVENT_TYPES.includes(value as IndustrialEventType);
}
