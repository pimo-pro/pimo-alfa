import { supabase } from '@/industrial/infra/db';

import { WORK_ORDER_TABLES } from './tables';

const knownValid = new Set<string>();
const knownInvalid = new Set<string>();

function warnInvalidWorkOrderId(workOrderId: string, context?: string, detail?: string) {
  const suffix = context ? ` (${context})` : '';
  const extra = detail ? `: ${detail}` : '';
  console.warn(`[industrial] work_order_id inválido ou inexistente: ${workOrderId}${suffix}${extra}`);
}

/**
 * Confirma que o ID existe em `industrial_work_orders`.
 * Devolve o ID validado ou `null` (com aviso no console).
 */
export async function validateWorkOrderId(
  workOrderId: string | null | undefined,
  context?: string,
): Promise<string | null> {
  const id = typeof workOrderId === 'string' ? workOrderId.trim() : '';
  if (!id) {
    if (workOrderId != null && String(workOrderId).trim() === '') {
      console.warn(`[industrial] work_order_id vazio${context ? ` (${context})` : ''}`);
    }
    return null;
  }

  if (knownValid.has(id)) return id;
  if (knownInvalid.has(id)) {
    warnInvalidWorkOrderId(id, context);
    return null;
  }

  const { data, error } = await supabase
    .from(WORK_ORDER_TABLES.orders)
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    knownInvalid.add(id);
    warnInvalidWorkOrderId(id, context, error?.message);
    return null;
  }

  knownValid.add(id);
  return id;
}

/** Marca um ID como válido após criação local (evita round-trip imediato). */
export function markWorkOrderIdKnownValid(workOrderId: string) {
  const id = workOrderId.trim();
  if (id) {
    knownValid.add(id);
    knownInvalid.delete(id);
  }
}

/** Tipos de evento UI/peça que exigem ordem de trabalho válida. */
export const INDUSTRIAL_PIECE_EVENT_TYPES = new Set([
  'operation_started',
  'operation_finished',
  'quality_checked',
  'rework_requested',
  'time_started',
  'time_stopped',
  'work_order_task_start',
  'work_order_task_complete',
  'work_order_task_reject',
]);
