/**
 * Nomes centralizados das tabelas usadas pelo nucleo industrial no Supabase.
 * Usar estas constantes evita divergencias entre actions, workflow e auditoria.
 */
export const INDUSTRIAL_TABLES = {
  profiles: 'profiles',
  departments: 'departments',
  workOrders: 'work_orders',
  workOrderTasks: 'work_order_tasks',
  taskStatusHistory: 'task_status_history',
  workOrderTransitions: 'work_order_transitions',
  workOrderRules: 'work_order_rules',
  workflowLogs: 'workflow_logs',
  qualityReasons: 'quality_reasons',
  qualityStats: 'quality_stats',
  permissionChangeLogs: 'permission_change_logs',
  notifications: 'notifications',
  systemEvents: 'system_events',
} as const;

export type IndustrialTableName = (typeof INDUSTRIAL_TABLES)[keyof typeof INDUSTRIAL_TABLES];
