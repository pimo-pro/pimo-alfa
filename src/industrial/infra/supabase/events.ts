export const INDUSTRIAL_EVENT_TYPES = [
  'work_order_created',
  'work_order_status_changed',
  'work_order_assigned',
  'work_order_deleted',
  'task_created',
  'task_status_changed',
  'task_assigned',
  'task_completed',
  'task_deleted',
  'department_created',
  'department_updated',
  'department_deleted',
  'user_created',
  'user_updated',
  'user_role_changed',
  'user_department_changed',
  'user_login',
  'user_logout',
  'rule_applied',
  'workflow_transition',
  'permission_changed',
  'system_error',
] as const;

export type IndustrialEventType = (typeof INDUSTRIAL_EVENT_TYPES)[number];

export interface IndustrialSystemEvent {
  id: string;
  type: IndustrialEventType;
  work_order_id?: string;
  task_id?: string;
  user_id?: string;
  department_id?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface IndustrialEventStats {
  byType: Record<string, number>;
  total: number;
  byDay: Record<string, number>;
}

export interface IndustrialEventFilter {
  type?: IndustrialEventType[];
  user_id?: string;
  department_id?: string;
  work_order_id?: string;
  task_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Agrupa eventos por entidade para dashboards e regras de workflow.
 */
export const INDUSTRIAL_EVENT_TYPES_BY_ENTITY = {
  work_order: [
    'work_order_created',
    'work_order_status_changed',
    'work_order_assigned',
    'work_order_deleted',
  ],
  task: [
    'task_created',
    'task_status_changed',
    'task_assigned',
    'task_completed',
    'task_deleted',
  ],
  department: ['department_created', 'department_updated', 'department_deleted'],
  user: [
    'user_created',
    'user_updated',
    'user_role_changed',
    'user_department_changed',
    'user_login',
    'user_logout',
  ],
  system: ['rule_applied', 'workflow_transition', 'permission_changed', 'system_error'],
} as const satisfies Record<string, readonly IndustrialEventType[]>;

const eventLabels: Record<IndustrialEventType, string> = {
  work_order_created: 'Ordem de Trabalho Criada',
  work_order_status_changed: 'Status da Ordem Alterado',
  work_order_assigned: 'Ordem Atribuida',
  work_order_deleted: 'Ordem Excluida',
  task_created: 'Tarefa Criada',
  task_status_changed: 'Status da Tarefa Alterado',
  task_assigned: 'Tarefa Atribuida',
  task_completed: 'Tarefa Concluida',
  task_deleted: 'Tarefa Excluida',
  department_created: 'Departamento Criado',
  department_updated: 'Departamento Atualizado',
  department_deleted: 'Departamento Excluido',
  user_created: 'Usuario Criado',
  user_updated: 'Usuario Atualizado',
  user_role_changed: 'Cargo do Usuario Alterado',
  user_department_changed: 'Departamento do Usuario Alterado',
  user_login: 'Login de Usuario',
  user_logout: 'Logout de Usuario',
  rule_applied: 'Regra Aplicada',
  workflow_transition: 'Transicao de Workflow',
  permission_changed: 'Permissao Alterada',
  system_error: 'Erro do Sistema',
};

export const industrialEventUtils = {
  formatEventType: (type: IndustrialEventType): string => eventLabels[type],
  getEventColor: (type: IndustrialEventType): string => {
    if (type.includes('created')) return '#10b981';
    if (type.includes('changed')) return '#3b82f6';
    if (type.includes('deleted')) return '#ef4444';
    if (type.includes('error')) return '#f59e0b';
    return '#6b7280';
  },
  isCriticalEvent: (type: IndustrialEventType): boolean =>
    ['system_error', 'permission_changed', 'user_role_changed', 'work_order_deleted', 'task_deleted'].includes(type),
  createMetadata: (data: Record<string, unknown>): Record<string, unknown> => ({
    ...data,
    timestamp: new Date().toISOString(),
    ip_address: '',
    user_agent: '',
  }),
};
