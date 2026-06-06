export const WORKFLOW_ENTITY_TYPES = {
  workOrder: 'work_order',
  task: 'task',
  department: 'department',
  user: 'user',
} as const;

export type WorkflowEntityType = (typeof WORKFLOW_ENTITY_TYPES)[keyof typeof WORKFLOW_ENTITY_TYPES];

export const WORKFLOW_OPERATORS = {
  equals: 'equals',
  notEquals: 'not_equals',
  greaterThan: 'greater_than',
  lessThan: 'less_than',
  greaterThanOrEqual: 'greater_than_or_equal',
  lessThanOrEqual: 'less_than_or_equal',
  contains: 'contains',
  notContains: 'not_contains',
  inList: 'in_list',
  notInList: 'not_in_list',
  startsWith: 'starts_with',
  endsWith: 'ends_with',
  isNull: 'is_null',
  isNotNull: 'is_not_null',
  custom: 'custom',
} as const;

export type WorkflowOperator = (typeof WORKFLOW_OPERATORS)[keyof typeof WORKFLOW_OPERATORS];

export const WORKFLOW_ACTION_TYPES = {
  updateStatus: 'update_status',
  assignToDepartment: 'assign_to_department',
  assignToUser: 'assign_to_user',
  triggerNotification: 'trigger_notification',
  logWorkflowEvent: 'log_workflow_event',
  createTask: 'create_task',
  autoCloseWorkOrder: 'auto_close_work_order',
  updateField: 'update_field',
  sendEmail: 'send_email',
  sendSms: 'send_sms',
  callWebhook: 'call_webhook',
  customAction: 'custom_action',
} as const;

export type WorkflowActionType = (typeof WORKFLOW_ACTION_TYPES)[keyof typeof WORKFLOW_ACTION_TYPES];

export interface WorkflowState {
  id: string;
  name: string;
  label: string;
  description?: string;
  color?: string;
  is_initial?: boolean;
  is_final?: boolean;
  entity_type: WorkflowEntityType;
}

export interface WorkflowCondition {
  field: string;
  operator: WorkflowOperator;
  value: unknown;
  logic?: 'AND' | 'OR';
}

export interface WorkflowAction {
  type: WorkflowActionType;
  params: Record<string, unknown>;
  description?: string;
}

export interface WorkflowTransition {
  id: string;
  name: string;
  from_state: string;
  to_state: string;
  label: string;
  description?: string;
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
  auto_trigger?: boolean;
  entity_type: WorkflowEntityType;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description?: string;
  entity_type: WorkflowEntityType;
  event_type?: string[];
  conditions: WorkflowCondition[];
  transitions: WorkflowTransition[];
  priority: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowContext {
  entity: WorkflowEntity;
  event: WorkflowEvent;
  previous_state?: string;
  current_state: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowEntity {
  id: string;
  entity_type?: WorkflowEntityType;
  status?: string;
  previous_status?: string;
  updated_by?: string;
  created_by?: string;
  assigned_to?: string;
  work_order_id?: string;
  order_number?: string;
  task_id?: string;
  title?: string;
  department_id?: string;
  name?: string;
  user_id?: string;
  email?: string;
  table_name?: string;
  [key: string]: unknown;
}

export interface WorkflowEvent {
  type?: string;
  name?: string;
  [key: string]: unknown;
}

export interface WorkflowLog {
  id: string;
  rule_id?: string;
  transition_id?: string;
  entity_type: WorkflowEntityType;
  entity_id: string;
  action: string;
  description: string;
  result: 'success' | 'failed' | 'skipped';
  error_message?: string;
  created_at: string;
  user_id?: string;
}

export interface WorkflowValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface WorkflowExecutionResult {
  success: boolean;
  transitions_applied: WorkflowTransition[];
  actions_executed: WorkflowAction[];
  logs: WorkflowLog[];
  errors: WorkflowValidationError[];
  execution_time: number;
}
