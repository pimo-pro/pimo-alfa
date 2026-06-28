import {
  getWorkOrderPieceDisplay,
  resolveWorkOrderProjectDisplay,
} from '@/industrial/work-orders/resolveWorkOrderPiece';
import type { IndustrialWorkOrder, IndustrialWorkOrderTask, WorkOrderPieceDisplay } from '@/industrial/work-orders/types';

export function projectIdForTask(task: IndustrialWorkOrderTask, orders: IndustrialWorkOrder[]): string {
  return orders.find((order) => order.id === task.workOrderId)?.projectId ?? '';
}

export function taskPieceDisplay(
  task: IndustrialWorkOrderTask,
  orders: IndustrialWorkOrder[],
): WorkOrderPieceDisplay {
  return getWorkOrderPieceDisplay(task, projectIdForTask(task, orders));
}

export function taskIndustrialLabel(task: IndustrialWorkOrderTask, orders: IndustrialWorkOrder[]): string {
  return taskPieceDisplay(task, orders).fullIndustrialName;
}

export function taskNqrCode(task: IndustrialWorkOrderTask, orders: IndustrialWorkOrder[]): string {
  return taskPieceDisplay(task, orders).nqrCode;
}

export function orderProjectCode(order: IndustrialWorkOrder): string {
  return resolveWorkOrderProjectDisplay(order.projectId);
}

export function projectIdMapFromOrders(orders: IndustrialWorkOrder[]): Map<string, string> {
  return new Map(orders.map((order) => [order.id, order.projectId]));
}
