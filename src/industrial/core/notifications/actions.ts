import { supabase } from '@/industrial/infra/db';
import { notificationsCache } from '@/industrial/infra/cache';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';
import type {
  IndustrialNotification,
  IndustrialNotificationFilter,
  IndustrialNotificationInput,
} from './types';

/**
 * Persiste uma notificacao industrial. Canais externos continuam como adapters,
 * para manter o core independente da infraestrutura de envio real.
 */
export async function createNotification(input: IndustrialNotificationInput): Promise<IndustrialNotification | null> {
  const { data, error } = await supabase
    .from(INDUSTRIAL_TABLES.notifications)
    .insert({
      type: input.type,
      severity: input.severity ?? 'info',
      title: input.title,
      message: input.message,
      user_id: input.user_id,
      channel: input.channel,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar notificacao industrial:', error);
    return null;
  }

  notificationsCache.invalidate();
  return data as IndustrialNotification;
}

export async function sendInAppNotification(payload: IndustrialNotificationInput): Promise<IndustrialNotification | null> {
  return createNotification({ ...payload, channel: 'in-app' });
}

export async function sendEmailNotification(payload: IndustrialNotificationInput): Promise<IndustrialNotification | null> {
  console.info('Industrial email notification queued:', payload);
  return createNotification({ ...payload, channel: 'email' });
}

export async function sendSMSNotification(payload: IndustrialNotificationInput): Promise<IndustrialNotification | null> {
  console.info('Industrial SMS notification queued:', payload);
  return createNotification({ ...payload, channel: 'sms' });
}

export async function listNotifications(filter: IndustrialNotificationFilter = {}): Promise<IndustrialNotification[]> {
  const cacheKey = JSON.stringify(filter);
  const cached = notificationsCache.get<IndustrialNotification[]>(cacheKey);
  if (cached) return cached;

  let query = supabase.from(INDUSTRIAL_TABLES.notifications).select('*');
  if (filter.user_id) query = query.eq('user_id', filter.user_id);
  if (filter.channel) query = query.eq('channel', filter.channel);
  if (filter.unreadOnly) query = query.is('read_at', null);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(filter.offset ?? 0, (filter.offset ?? 0) + (filter.limit ?? 50) - 1);

  if (error) {
    console.error('Erro ao listar notificacoes industriais:', error);
    return [];
  }

  const notifications = (data ?? []) as IndustrialNotification[];
  notificationsCache.set(cacheKey, notifications);
  return notifications;
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from(INDUSTRIAL_TABLES.notifications)
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    console.error('Erro ao marcar notificacao como lida:', error);
    return false;
  }

  notificationsCache.invalidate();
  return true;
}
