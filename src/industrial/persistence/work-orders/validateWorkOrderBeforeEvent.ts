import { notifyUser, type NotifyUserOptions } from '../../errors/industrialNotificationBridge';

import { validateWorkOrderId } from './validateWorkOrderId';

export const WORK_ORDER_SYNC_ERROR_MESSAGE =
  'Work Order inexistente ou não sincronizado. Produção não iniciada.';

export type WorkOrderEventValidation = {
  ok: boolean;
  workOrderId: string | null;
  message?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertIndustrialWorkOrderId(workOrderId: string): void {
  if (!UUID_RE.test(workOrderId.trim())) {
    throw new Error('Work Order criado sem ID válido (UUID).');
  }
}

/**
 * Valida existência em `industrial_work_orders` antes de criar eventos em `system_events`.
 * Nunca cria evento — apenas autoriza ou bloqueia.
 */
export async function validateWorkOrderBeforeEvent(
  workOrderId: string | null | undefined,
  context?: string,
): Promise<WorkOrderEventValidation> {
  const validated = await validateWorkOrderId(workOrderId, context);
  if (!validated) {
    return {
      ok: false,
      workOrderId: null,
      message: WORK_ORDER_SYNC_ERROR_MESSAGE,
    };
  }
  return { ok: true, workOrderId: validated };
}

export function notifyWorkOrderSyncError(options?: NotifyUserOptions): void {
  notifyUser(
    {
      source: 'trak',
      severity: 'error',
      step: 'PIMO-TRAK',
      message: WORK_ORDER_SYNC_ERROR_MESSAGE,
    },
    options,
  );
}
