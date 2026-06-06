import { workflowRules } from '@/industrial/core/rules/rules';
import { supabase } from '@/industrial/infra/db';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';
import { workflowActions } from './actions';
import {
  WORKFLOW_ENTITY_TYPES,
  type WorkflowAction,
  type WorkflowContext,
  type WorkflowEntity,
  type WorkflowEntityType,
  type WorkflowEvent,
  type WorkflowExecutionResult,
  type WorkflowLog,
  type WorkflowRule,
  type WorkflowTransition,
  type WorkflowValidationError,
} from './types';

class WorkflowEngine {
  private executionHistory: WorkflowExecutionResult[] = [];

  async evaluateWorkflow(
    entity: WorkflowEntity,
    event: WorkflowEvent,
    context?: Partial<WorkflowContext>,
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const transitionsApplied: WorkflowTransition[] = [];
    const actionsExecuted: WorkflowAction[] = [];
    const logs: WorkflowLog[] = [];
    const errors: WorkflowValidationError[] = [];

    try {
      const validationErrors = this.validateInput(entity, event);
      if (validationErrors.length > 0) {
        return this.result(false, [], [], [], validationErrors, startTime);
      }

      const workflowContext: WorkflowContext = {
        entity,
        event,
        current_state: entity.status ?? 'draft',
        previous_state: entity.previous_status,
        user_id: context?.user_id ?? entity.updated_by ?? entity.created_by,
        metadata: context?.metadata ?? {},
      };

      const applicableRules = this.getApplicableRules(entity, event);

      for (const rule of applicableRules) {
        const result = await this.executeRule(rule, workflowContext);
        transitionsApplied.push(...result.transitions_applied);
        actionsExecuted.push(...result.actions_executed);
        logs.push(...result.logs);
        errors.push(...result.errors);
      }

      const success = errors.length === 0;
      await this.createExecutionLog({
        entity_type: entity.entity_type ?? this.detectEntityType(entity),
        entity_id: entity.id,
        transitions_applied: transitionsApplied,
        actions_executed: actionsExecuted,
        success,
        execution_time: Date.now() - startTime,
      });

      const result = this.result(success, transitionsApplied, actionsExecuted, logs, errors, startTime);
      this.executionHistory.push(result);
      return result;
    } catch (error) {
      console.error('Erro ao avaliar workflow:', error);
      return this.result(
        false,
        [],
        [],
        [],
        [{ field: 'engine', message: `Erro interno do motor de workflow: ${String(error)}`, severity: 'error' }],
        startTime,
      );
    }
  }

  async applyTransition(transition: WorkflowTransition, context: WorkflowContext): Promise<WorkflowExecutionResult> {
    const actionsExecuted: WorkflowAction[] = [];
    const logs: WorkflowLog[] = [];
    const errors: WorkflowValidationError[] = [];

    try {
      if (transition.conditions?.length && !workflowRules.evaluateConditions(transition.conditions, context.entity)) {
        return this.result(true, [], [], [], [], Date.now());
      }

      for (const action of transition.actions ?? []) {
        const actionResult = await workflowActions.executeAction(action, context);

        if (!actionResult) {
          errors.push({ field: 'action', message: `Falha ao executar acao: ${action.type}`, severity: 'error' });
          continue;
        }

        actionsExecuted.push(action);
        const log = await workflowActions.createWorkflowLog({
          entity_type: context.entity.entity_type ?? this.detectEntityType(context.entity),
          entity_id: context.entity.id,
          action: action.type,
          description: action.description ?? `Acao executada: ${action.type}`,
          result: 'success',
          user_id: context.user_id,
        });

        if (log) logs.push(log);
      }

      if (transition.auto_trigger) {
        const updated = await this.updateEntityState(context.entity, transition);
        if (!updated) {
          errors.push({ field: 'transition', message: `Falha ao aplicar transicao: ${transition.name}`, severity: 'error' });
        }
      }

      return this.result(errors.length === 0, [transition], actionsExecuted, logs, errors, Date.now());
    } catch (error) {
      console.error(`Erro ao aplicar transicao ${transition.id}:`, error);
      return this.result(
        false,
        [],
        [],
        [],
        [{ field: 'transition', message: `Erro ao aplicar transicao ${transition.name}: ${String(error)}`, severity: 'error' }],
        Date.now(),
      );
    }
  }

  async runWorkflow(
    entity: WorkflowEntity,
    event: WorkflowEvent,
    context?: Partial<WorkflowContext>,
  ): Promise<WorkflowExecutionResult> {
    return this.evaluateWorkflow(entity, event, context);
  }

  getExecutionHistory(): WorkflowExecutionResult[] {
    return this.executionHistory;
  }

  clearHistory(): void {
    this.executionHistory = [];
  }

  async simulateWorkflow(
    _entity: WorkflowEntity,
    _event: WorkflowEvent,
    _context?: Partial<WorkflowContext>,
  ): Promise<WorkflowExecutionResult> {
    return { success: true, transitions_applied: [], actions_executed: [], logs: [], errors: [], execution_time: 0 };
  }

  private async executeRule(rule: WorkflowRule, context: WorkflowContext): Promise<WorkflowExecutionResult> {
    if (!workflowRules.evaluateConditions(rule.conditions, context.entity)) {
      return this.result(true, [], [], [], [], Date.now());
    }

    const transitionsApplied: WorkflowTransition[] = [];
    const actionsExecuted: WorkflowAction[] = [];
    const logs: WorkflowLog[] = [];
    const errors: WorkflowValidationError[] = [];

    for (const transition of rule.transitions) {
      const result = await this.applyTransition(transition, context);
      transitionsApplied.push(...result.transitions_applied);
      actionsExecuted.push(...result.actions_executed);
      logs.push(...result.logs);
      errors.push(...result.errors);
    }

    return this.result(errors.length === 0, transitionsApplied, actionsExecuted, logs, errors, Date.now());
  }

  private getApplicableRules(entity: WorkflowEntity, event: WorkflowEvent): WorkflowRule[] {
    const entityType = this.detectEntityType(entity);
    const eventType = event.type ?? event.name ?? 'unknown';
    let rules = workflowRules.getRulesByEntityType(entityType);

    if (eventType !== 'unknown') {
      const eventRules = workflowRules.getRulesByEventType(eventType);
      rules = rules.filter((rule) => eventRules.some((eventRule) => eventRule.id === rule.id));
    }

    return rules;
  }

  private detectEntityType(entity: WorkflowEntity): WorkflowEntityType {
    if (entity.entity_type) return entity.entity_type;
    if (entity.work_order_id || entity.order_number) return WORKFLOW_ENTITY_TYPES.workOrder;
    if (entity.task_id || entity.title) return WORKFLOW_ENTITY_TYPES.task;
    if (entity.department_id || entity.name) return WORKFLOW_ENTITY_TYPES.department;
    if (entity.user_id || entity.email) return WORKFLOW_ENTITY_TYPES.user;

    switch (entity.table_name) {
      case INDUSTRIAL_TABLES.workOrders:
        return WORKFLOW_ENTITY_TYPES.workOrder;
      case INDUSTRIAL_TABLES.workOrderTasks:
        return WORKFLOW_ENTITY_TYPES.task;
      case INDUSTRIAL_TABLES.departments:
        return WORKFLOW_ENTITY_TYPES.department;
      case INDUSTRIAL_TABLES.profiles:
        return WORKFLOW_ENTITY_TYPES.user;
      default:
        return WORKFLOW_ENTITY_TYPES.workOrder;
    }
  }

  private validateInput(entity: WorkflowEntity, event: WorkflowEvent): WorkflowValidationError[] {
    const errors: WorkflowValidationError[] = [];
    if (!entity.id) errors.push({ field: 'entity.id', message: 'Entidade sem id', severity: 'error' });
    if (!event || typeof event !== 'object') errors.push({ field: 'event', message: 'Evento invalido', severity: 'error' });
    return errors;
  }

  private async updateEntityState(entity: WorkflowEntity, transition: WorkflowTransition): Promise<boolean> {
    const tableName = this.getEntityTable(this.detectEntityType(entity));
    if (!tableName) return false;

    const { error } = await supabase
      .from(tableName)
      .update({
        status: transition.to_state,
        previous_status: transition.from_state,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entity.id);

    if (error) {
      console.error('Erro ao atualizar estado da entidade:', error);
      return false;
    }

    return true;
  }

  private getEntityTable(entityType: WorkflowEntityType): string | null {
    switch (entityType) {
      case WORKFLOW_ENTITY_TYPES.workOrder:
        return INDUSTRIAL_TABLES.workOrders;
      case WORKFLOW_ENTITY_TYPES.task:
        return INDUSTRIAL_TABLES.workOrderTasks;
      case WORKFLOW_ENTITY_TYPES.department:
        return INDUSTRIAL_TABLES.departments;
      case WORKFLOW_ENTITY_TYPES.user:
        return INDUSTRIAL_TABLES.profiles;
      default:
        return null;
    }
  }

  private async createExecutionLog(data: {
    entity_type: WorkflowEntityType;
    entity_id: string;
    transitions_applied: WorkflowTransition[];
    actions_executed: WorkflowAction[];
    success: boolean;
    execution_time: number;
  }): Promise<void> {
    const { error } = await supabase.from(INDUSTRIAL_TABLES.workflowLogs).insert({
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      action: 'workflow_execution',
      description: `Workflow executado: ${data.transitions_applied.length} transicoes, ${data.actions_executed.length} acoes`,
      result: data.success ? 'success' : 'failed',
      user_id: null,
      metadata: {
        transitions_count: data.transitions_applied.length,
        actions_count: data.actions_executed.length,
        execution_time: data.execution_time,
      },
    });

    if (error) console.error('Erro ao criar log de execucao:', error);
  }

  private result(
    success: boolean,
    transitions: WorkflowTransition[],
    actions: WorkflowAction[],
    logs: WorkflowLog[],
    errors: WorkflowValidationError[],
    startTime: number,
  ): WorkflowExecutionResult {
    return {
      success,
      transitions_applied: transitions,
      actions_executed: actions,
      logs,
      errors,
      execution_time: Date.now() - startTime,
    };
  }
}

export const workflowEngine = new WorkflowEngine();
export default workflowEngine;
