import { persistWorkOrderDraft } from '@/industrial/persistence/work-orders/persistWorkOrder';

import { generateDrillOrder } from './generateDrillOrder';
import { generateEmbalagemOrder } from './generateEmbalagemOrder';
import { generateMontagemOrder } from './generateMontagemOrder';
import { generateNestingOrder } from './generateNestingOrder';
import { generateOrlarOrder } from './generateOrlarOrder';
import { generateWarehouseOrder } from './generateWarehouseOrder';
import { resolveProjectCutlist } from './resolveProjectCutlist';
import type { GeneratedWorkOrderDraft, IndustrialWorkOrder } from './types';

const GENERATORS = [
  generateWarehouseOrder,
  generateNestingOrder,
  generateDrillOrder,
  generateOrlarOrder,
  generateMontagemOrder,
  generateEmbalagemOrder,
] as const;

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

  const drafts: GeneratedWorkOrderDraft[] = GENERATORS.map((generate) => generate(context.pieces));
  const skippedStations: string[] = [];
  const orders: IndustrialWorkOrder[] = [];

  for (const draft of drafts) {
    if (draft.tasks.length === 0) {
      skippedStations.push(draft.station);
      continue;
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
