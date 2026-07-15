import type { SavedProjectRecord } from '@/core/projects/types';

import { createWorkOrdersForProjetosRecord } from './createWorkOrdersForProject';
import {
  validateWorkOrderBeforeEvent,
  WORK_ORDER_SYNC_ERROR_MESSAGE,
} from '../persistence/work-orders/validateWorkOrderBeforeEvent';

/**
 * Gera ordens de trabalho a partir de um registo PROJETOS e confirma persistência na BD
 * antes de qualquer evento de produção.
 */
export async function generateWorkOrdersFromProjetosRecord(record: SavedProjectRecord) {
  const result = await createWorkOrdersForProjetosRecord(record);

  for (const order of result.orders) {
    const validation = await validateWorkOrderBeforeEvent(
      order.id,
      `generateWorkOrders:station=${order.station}`,
    );
    if (!validation.ok) {
      throw new Error(validation.message ?? WORK_ORDER_SYNC_ERROR_MESSAGE);
    }
  }

  return result;
}
