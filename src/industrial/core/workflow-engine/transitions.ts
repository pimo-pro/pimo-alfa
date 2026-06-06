import {
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_ENTITY_TYPES,
  type WorkflowTransition,
} from './types';
import { WORK_ORDER_STATUSES } from './work_order_statuses';

function now(): string {
  return new Date().toISOString();
}

/**
 * Transicoes padrao extraidas das regras originais de workflow.
 * As actions continuam declarativas para o engine executar sem acoplar UI.
 */
export function createDefaultWorkOrderTransitions(): WorkflowTransition[] {
  const timestamp = now();

  return [
    {
      id: 'wo_created_to_pending',
      name: 'work_order_created_to_pending',
      from_state: WORK_ORDER_STATUSES.draft,
      to_state: WORK_ORDER_STATUSES.pendingApproval,
      label: 'Criar Ordem de Trabalho',
      description: 'Transicao automatica ao criar ordem de trabalho',
      auto_trigger: true,
      entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: 'wo_pending_to_approved',
      name: 'work_order_pending_to_approved',
      from_state: WORK_ORDER_STATUSES.pendingApproval,
      to_state: WORK_ORDER_STATUSES.approved,
      label: 'Aprovar Ordem de Trabalho',
      description: 'Aprovacao automatica baseada no departamento',
      auto_trigger: true,
      entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
      created_at: timestamp,
      updated_at: timestamp,
      actions: [
        {
          type: WORKFLOW_ACTION_TYPES.triggerNotification,
          params: {
            severity: 'info',
            message: 'Ordem de trabalho aprovada automaticamente',
            channel: 'in-app',
          },
          description: 'Notificar aprovacao',
        },
      ],
    },
    {
      id: 'wo_approved_to_in_progress',
      name: 'work_order_approved_to_in_progress',
      from_state: WORK_ORDER_STATUSES.approved,
      to_state: WORK_ORDER_STATUSES.inProgress,
      label: 'Iniciar Producao',
      description: 'Inicio automatico da producao',
      auto_trigger: true,
      entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
      created_at: timestamp,
      updated_at: timestamp,
      actions: [
        {
          type: WORKFLOW_ACTION_TYPES.assignToDepartment,
          params: { department_id: 'production' },
          description: 'Atribuir ao departamento de producao',
        },
      ],
    },
    {
      id: 'wo_in_progress_to_completed',
      name: 'work_order_in_progress_to_completed',
      from_state: WORK_ORDER_STATUSES.inProgress,
      to_state: WORK_ORDER_STATUSES.completed,
      label: 'Concluir Ordem de Trabalho',
      description: 'Conclusao automatica da ordem de trabalho',
      auto_trigger: true,
      entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
      created_at: timestamp,
      updated_at: timestamp,
      actions: [
        {
          type: WORKFLOW_ACTION_TYPES.logWorkflowEvent,
          params: { message: 'Ordem de trabalho concluida automaticamente' },
          description: 'Registrar evento de conclusao',
        },
      ],
    },
  ];
}
