import { WORKFLOW_ENTITY_TYPES, type WorkflowState } from './types';

export const WORK_ORDER_STATUSES = {
  draft: 'draft',
  pendingApproval: 'pending_approval',
  approved: 'approved',
  inProgress: 'in_progress',
  paused: 'paused',
  qualityReview: 'quality_review',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[keyof typeof WORK_ORDER_STATUSES];

/**
 * Estados base do workflow de ordens de trabalho migrado do PIMO-TRAK.
 */
export const WORK_ORDER_WORKFLOW_STATES: WorkflowState[] = [
  {
    id: WORK_ORDER_STATUSES.draft,
    name: WORK_ORDER_STATUSES.draft,
    label: 'Rascunho',
    is_initial: true,
    entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
  },
  {
    id: WORK_ORDER_STATUSES.pendingApproval,
    name: WORK_ORDER_STATUSES.pendingApproval,
    label: 'Pendente de Aprovacao',
    entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
  },
  {
    id: WORK_ORDER_STATUSES.approved,
    name: WORK_ORDER_STATUSES.approved,
    label: 'Aprovada',
    entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
  },
  {
    id: WORK_ORDER_STATUSES.inProgress,
    name: WORK_ORDER_STATUSES.inProgress,
    label: 'Em Producao',
    entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
  },
  {
    id: WORK_ORDER_STATUSES.paused,
    name: WORK_ORDER_STATUSES.paused,
    label: 'Pausada',
    entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
  },
  {
    id: WORK_ORDER_STATUSES.qualityReview,
    name: WORK_ORDER_STATUSES.qualityReview,
    label: 'Revisao de Qualidade',
    entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
  },
  {
    id: WORK_ORDER_STATUSES.completed,
    name: WORK_ORDER_STATUSES.completed,
    label: 'Concluida',
    is_final: true,
    entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
  },
  {
    id: WORK_ORDER_STATUSES.cancelled,
    name: WORK_ORDER_STATUSES.cancelled,
    label: 'Cancelada',
    is_final: true,
    entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
  },
];
