export const WORK_ORDER_TABLES = {
  orders: 'industrial_work_orders',
  tasks: 'industrial_work_order_tasks',
  events: 'industrial_work_order_events',
} as const;

export const INDUSTRIAL_VIEW_TABLES = {
  tracking: 'industrial_tracking',
  tasksView: 'industrial_work_order_tasks_view',
} as const;
