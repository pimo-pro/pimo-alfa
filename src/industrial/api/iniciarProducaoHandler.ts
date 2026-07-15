import type { SavedProjectRecord } from '@/core/projects/types';
import { fetchWorkOrders } from '@/industrial/api/workOrderActions';
import {
  notifyWorkOrderSyncError,
  validateWorkOrderBeforeEvent,
  WORK_ORDER_SYNC_ERROR_MESSAGE,
} from '@/industrial/persistence/work-orders/validateWorkOrderBeforeEvent';
import { generateWorkOrdersFromProjetosRecord } from '@/industrial/work-orders/generateWorkOrdersFromProjetosRecord';

/**
 * Handler PIMO-TRAK — Iniciar Produção (Supervisor Geral / PROJETOS).
 * Garante ordens persistidas e IDs válidos antes de eventos de produção.
 */
export async function iniciarProducaoHandler(record: SavedProjectRecord) {
  const result = await generateWorkOrdersFromProjetosRecord(record);

  const persisted = await fetchWorkOrders({ projectId: result.projectId });
  if (result.orders.length > 0 && persisted.length === 0) {
    notifyWorkOrderSyncError();
    throw new Error(WORK_ORDER_SYNC_ERROR_MESSAGE);
  }

  for (const order of result.orders) {
    const validation = await validateWorkOrderBeforeEvent(
      order.id,
      `iniciarProducao:station=${order.station}`,
    );
    if (!validation.ok) {
      notifyWorkOrderSyncError();
      throw new Error(validation.message ?? WORK_ORDER_SYNC_ERROR_MESSAGE);
    }
  }

  return result;
}
