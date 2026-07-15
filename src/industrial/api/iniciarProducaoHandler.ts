import type { SavedProjectRecord } from '@/core/projects/types';
import { fetchWorkOrders } from '@/industrial/api/workOrderActions';
import { logWorkOrderEvent } from '@/industrial/persistence/work-orders/logWorkOrderEvent';
import { getOrCreateIndustrialUser } from '@/industrial/persistence/users/getOrCreateIndustrialUser';
import {
  notifyWorkOrderSyncError,
  validateWorkOrderBeforeEvent,
  WORK_ORDER_SYNC_ERROR_MESSAGE,
} from '@/industrial/persistence/work-orders/validateWorkOrderBeforeEvent';
import { generateWorkOrdersFromProjetosRecord } from '@/industrial/work-orders/generateWorkOrdersFromProjetosRecord';

/**
 * Handler PIMO-TRAK — Iniciar Produção (Supervisor Geral / PROJETOS).
 * Garante ordens persistidas, utilizador válido e eventos em industrial_work_order_events.
 */
export async function iniciarProducaoHandler(
  record: SavedProjectRecord,
  operatorId?: string | null,
) {
  const industrialUser = await getOrCreateIndustrialUser(operatorId);
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

    await logWorkOrderEvent({
      workOrderId: order.id,
      eventType: 'production_started',
      operatorId: industrialUser.id,
      metadata: {
        projectId: result.projectId,
        projectName: result.projectName,
        station: order.station,
        industrial_user_id: industrialUser.id,
      },
    });
  }

  return {
    ...result,
    industrialUserId: industrialUser.id,
  };
}
