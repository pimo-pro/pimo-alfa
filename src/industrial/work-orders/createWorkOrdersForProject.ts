import { persistWorkOrderDraft } from '../persistence/work-orders/persistWorkOrder';
import { loadWorkOrders } from '../persistence/work-orders/loadWorkOrders';

import { resolveProjectCutlist } from './resolveProjectCutlist';
import { generateAllStationOrderDrafts } from './stationOrderFactory';
import type { GeneratedWorkOrderDraft, IndustrialWorkOrder } from './types';
import { woIdempotencyConfig } from './woIdempotencyConfig';
export interface CreateWorkOrdersResult {
  projectId: string;
  projectName: string;
  orders: IndustrialWorkOrder[];
  skippedStations: string[];
}

export async function createWorkOrdersForProject(projectId: string): Promise<CreateWorkOrdersResult> {
  const context = resolveProjectCutlist(projectId);
  if (!context) {
    throw new Error(`Projeto não encontrado ou sem cutlist: ${projectId}`);
  }

  const drafts: GeneratedWorkOrderDraft[] = generateAllStationOrderDrafts(context.pieces);
  const skippedStations: string[] = [];
  const orders: IndustrialWorkOrder[] = [];

  for (const draft of drafts) {
    if (draft.tasks.length === 0) {
      skippedStations.push(draft.station);
      continue;
    }

    if (woIdempotencyConfig.skipExistingStationOrders || woIdempotencyConfig.warnOnDuplicate) {
      const existing = await loadWorkOrders({
        projectId: context.projectId,
        station: draft.station,
      });
      if (existing.length > 0) {
        if (woIdempotencyConfig.warnOnDuplicate) {
          console.warn(
            `[WO] Ordem existente para projeto ${context.projectId} estação ${draft.station}: ${existing[0].id}`,
          );
        }
        if (woIdempotencyConfig.skipExistingStationOrders) {
          orders.push(existing[0]);
          continue;
        }
      }
    }

    const order = await persistWorkOrderDraft(projectId, draft);
    orders.push(order);
  }

  return {
    projectId: context.projectId,
    projectName: context.projectName,
    orders,
    skippedStations,
  };
}
