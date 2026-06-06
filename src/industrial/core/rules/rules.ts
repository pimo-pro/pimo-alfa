import {
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_ENTITY_TYPES,
  WORKFLOW_OPERATORS,
  type WorkflowCondition,
  type WorkflowEntity,
  type WorkflowEntityType,
  type WorkflowRule,
} from '@/industrial/core/workflow-engine/types';
import { WORK_ORDER_STATUSES } from '@/industrial/core/workflow-engine/work_order_statuses';

function timestamp(): string {
  return new Date().toISOString();
}

function createDefaultRules(): WorkflowRule[] {
  const createdAt = timestamp();

  return [
    {
      id: 'work_order_creation',
      name: 'Criacao de Ordem de Trabalho',
      description: 'Regra automatica ao criar uma nova ordem de trabalho',
      entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
      event_type: ['work_order_created'],
      conditions: [],
      transitions: [
        {
          id: 'wo_created_to_pending',
          name: 'work_order_created_to_pending',
          from_state: WORK_ORDER_STATUSES.draft,
          to_state: WORK_ORDER_STATUSES.pendingApproval,
          label: 'Criar Ordem de Trabalho',
          description: 'Transicao automatica ao criar ordem de trabalho',
          auto_trigger: true,
          entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
          created_at: createdAt,
          updated_at: createdAt,
        },
      ],
      priority: 1,
      enabled: true,
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: 'work_order_approval',
      name: 'Aprovacao de Ordem de Trabalho',
      description: 'Aprova ordem de trabalho baseado em departamento',
      entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
      event_type: ['work_order_updated'],
      conditions: [
        { field: 'status', operator: WORKFLOW_OPERATORS.equals, value: WORK_ORDER_STATUSES.pendingApproval },
        { field: 'department_id', operator: WORKFLOW_OPERATORS.inList, value: ['admin', 'management', 'production'] },
      ],
      transitions: [
        {
          id: 'wo_pending_to_approved',
          name: 'work_order_pending_to_approved',
          from_state: WORK_ORDER_STATUSES.pendingApproval,
          to_state: WORK_ORDER_STATUSES.approved,
          label: 'Aprovar Ordem de Trabalho',
          description: 'Aprovacao automatica baseada no departamento',
          auto_trigger: true,
          entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
          created_at: createdAt,
          updated_at: createdAt,
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
      ],
      priority: 2,
      enabled: true,
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: 'work_order_completion',
      name: 'Conclusao de Ordem de Trabalho',
      description: 'Conclui ordem de trabalho quando todas as tarefas sao finalizadas',
      entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
      event_type: ['task_completed'],
      conditions: [
        { field: 'status', operator: WORKFLOW_OPERATORS.equals, value: WORK_ORDER_STATUSES.inProgress },
        { field: 'all_tasks_completed', operator: WORKFLOW_OPERATORS.equals, value: true },
      ],
      transitions: [
        {
          id: 'wo_in_progress_to_completed',
          name: 'work_order_in_progress_to_completed',
          from_state: WORK_ORDER_STATUSES.inProgress,
          to_state: WORK_ORDER_STATUSES.completed,
          label: 'Concluir Ordem de Trabalho',
          description: 'Conclusao automatica da ordem de trabalho',
          auto_trigger: true,
          entity_type: WORKFLOW_ENTITY_TYPES.workOrder,
          created_at: createdAt,
          updated_at: createdAt,
          actions: [
            {
              type: WORKFLOW_ACTION_TYPES.logWorkflowEvent,
              params: { message: 'Ordem de trabalho concluida automaticamente' },
              description: 'Registrar evento de conclusao',
            },
          ],
        },
      ],
      priority: 4,
      enabled: true,
      created_at: createdAt,
      updated_at: createdAt,
    },
  ];
}

class WorkflowRules {
  private rules: WorkflowRule[] = createDefaultRules();

  /**
   * Avalia condicoes declarativas sem efeitos colaterais.
   */
  evaluateConditions(conditions: WorkflowCondition[], entity: WorkflowEntity): boolean {
    if (conditions.length === 0) return true;

    let result = true;
    let currentLogic: 'AND' | 'OR' = 'AND';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, entity);
      currentLogic = condition.logic ?? currentLogic;
      result = currentLogic === 'AND' ? result && conditionResult : result || conditionResult;
    }

    return result;
  }

  getRulesByEntityType(entityType: WorkflowEntityType): WorkflowRule[] {
    return this.rules
      .filter((rule) => rule.entity_type === entityType && rule.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  getRulesByEventType(eventType: string): WorkflowRule[] {
    return this.rules.filter((rule) => rule.event_type?.includes(eventType) && rule.enabled);
  }

  registerRule(rule: Omit<WorkflowRule, 'id' | 'created_at' | 'updated_at'>): WorkflowRule {
    const newRule: WorkflowRule = {
      ...rule,
      id: this.generateId(),
      created_at: timestamp(),
      updated_at: timestamp(),
    };

    this.rules.push(newRule);
    return newRule;
  }

  updateRule(ruleId: string, updates: Partial<WorkflowRule>): WorkflowRule | null {
    const index = this.rules.findIndex((rule) => rule.id === ruleId);
    if (index === -1) return null;

    this.rules[index] = {
      ...this.rules[index],
      ...updates,
      updated_at: timestamp(),
    };

    return this.rules[index];
  }

  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex((rule) => rule.id === ruleId);
    if (index === -1) return false;

    this.rules.splice(index, 1);
    return true;
  }

  getAllRules(): WorkflowRule[] {
    return this.rules;
  }

  private evaluateCondition(condition: WorkflowCondition, entity: WorkflowEntity): boolean {
    const fieldValue = this.getFieldValue(condition.field, entity);

    switch (condition.operator) {
      case WORKFLOW_OPERATORS.equals:
        return fieldValue === condition.value;
      case WORKFLOW_OPERATORS.notEquals:
        return fieldValue !== condition.value;
      case WORKFLOW_OPERATORS.greaterThan:
        return Number(fieldValue) > Number(condition.value);
      case WORKFLOW_OPERATORS.lessThan:
        return Number(fieldValue) < Number(condition.value);
      case WORKFLOW_OPERATORS.greaterThanOrEqual:
        return Number(fieldValue) >= Number(condition.value);
      case WORKFLOW_OPERATORS.lessThanOrEqual:
        return Number(fieldValue) <= Number(condition.value);
      case WORKFLOW_OPERATORS.contains:
        return String(fieldValue).includes(String(condition.value));
      case WORKFLOW_OPERATORS.notContains:
        return !String(fieldValue).includes(String(condition.value));
      case WORKFLOW_OPERATORS.inList:
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case WORKFLOW_OPERATORS.notInList:
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case WORKFLOW_OPERATORS.startsWith:
        return String(fieldValue).startsWith(String(condition.value));
      case WORKFLOW_OPERATORS.endsWith:
        return String(fieldValue).endsWith(String(condition.value));
      case WORKFLOW_OPERATORS.isNull:
        return fieldValue === null || fieldValue === undefined;
      case WORKFLOW_OPERATORS.isNotNull:
        return fieldValue !== null && fieldValue !== undefined;
      default:
        return false;
    }
  }

  private getFieldValue(field: string, entity: WorkflowEntity): unknown {
    if (!field.includes('.')) return entity[field];

    return field.split('.').reduce<unknown>((current, key) => {
      if (typeof current !== 'object' || current === null) return undefined;
      return (current as Record<string, unknown>)[key];
    }, entity);
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2, 11);
  }
}

export const workflowRules = new WorkflowRules();
export default workflowRules;
