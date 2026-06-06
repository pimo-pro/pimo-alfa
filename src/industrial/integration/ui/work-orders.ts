import type { CreateWorkOrderDto, UpdateWorkOrderDto, WorkOrder } from '@/industrial/core/work-orders/types';
import type { IndustrialUiActionIntent, IndustrialUiCard } from './types';

export function workOrderToUiCard(workOrder: WorkOrder): IndustrialUiCard {
  return {
    id: workOrder.id,
    title: workOrder.title,
    subtitle: workOrder.order_number ?? workOrder.description ?? undefined,
    status: workOrder.status,
    meta: {
      priority: workOrder.priority,
      departmentId: workOrder.department_id,
      assignedTo: workOrder.assigned_to,
    },
  };
}

export function uiToCreateWorkOrderIntent(payload: CreateWorkOrderDto): IndustrialUiActionIntent<CreateWorkOrderDto> {
  return { type: 'work-order:create', payload };
}

export function uiToUpdateWorkOrderIntent(payload: UpdateWorkOrderDto): IndustrialUiActionIntent<UpdateWorkOrderDto> {
  return { type: 'work-order:update', payload };
}
