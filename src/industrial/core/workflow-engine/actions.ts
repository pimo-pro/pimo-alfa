import { logEvent } from '@/industrial/core/events/actions';
import {
  sendEmailNotification,
  sendInAppNotification,
  sendSMSNotification,
} from '@/industrial/core/notifications/actions';
import { supabase } from '@/industrial/infra/db';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';
import {
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_ENTITY_TYPES,
  type WorkflowAction,
  type WorkflowContext,
  type WorkflowEntityType,
  type WorkflowLog,
} from './types';

class WorkflowActions {
  async executeAction(action: WorkflowAction, context: WorkflowContext): Promise<boolean> {
    try {
      switch (action.type) {
        case WORKFLOW_ACTION_TYPES.updateStatus:
          return await this.updateStatus(action, context);
        case WORKFLOW_ACTION_TYPES.assignToDepartment:
          return await this.assignToDepartment(action, context);
        case WORKFLOW_ACTION_TYPES.assignToUser:
          return await this.assignToUser(action, context);
        case WORKFLOW_ACTION_TYPES.triggerNotification:
          return await this.triggerNotification(action, context);
        case WORKFLOW_ACTION_TYPES.logWorkflowEvent:
          return await this.logWorkflowEvent(action, context);
        case WORKFLOW_ACTION_TYPES.createTask:
          return await this.createTask(action, context);
        case WORKFLOW_ACTION_TYPES.autoCloseWorkOrder:
          return await this.autoCloseWorkOrder(context);
        case WORKFLOW_ACTION_TYPES.updateField:
          return await this.updateField(action, context);
        case WORKFLOW_ACTION_TYPES.sendEmail:
          return await this.sendEmail(action, context);
        case WORKFLOW_ACTION_TYPES.sendSms:
          return await this.sendSMS(action, context);
        case WORKFLOW_ACTION_TYPES.callWebhook:
          return await this.callWebhook(action, context);
        case WORKFLOW_ACTION_TYPES.customAction:
          return await this.executeCustomAction(action, context);
        default:
          console.warn(`Acao desconhecida: ${action.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Erro ao executar acao ${action.type}:`, error);
      return false;
    }
  }

  async createWorkflowLog(log: Omit<WorkflowLog, 'id' | 'created_at'>): Promise<WorkflowLog | null> {
    try {
      const { data, error } = await supabase
        .from(INDUSTRIAL_TABLES.workflowLogs)
        .insert({ ...log, created_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw error;
      return data as WorkflowLog;
    } catch (error) {
      console.error('Erro ao criar log de workflow:', error);
      return null;
    }
  }

  private async updateStatus(action: WorkflowAction, context: WorkflowContext): Promise<boolean> {
    const table = this.getEntityTable(context.entity.entity_type ?? WORKFLOW_ENTITY_TYPES.workOrder);
    const newStatus = action.params.status;

    if (!table || typeof newStatus !== 'string') return false;

    const { error } = await supabase
      .from(table)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', context.entity.id);

    if (error) {
      console.error('Erro ao atualizar status:', error);
      return false;
    }

    return this.logWorkflowEvent(
      { type: WORKFLOW_ACTION_TYPES.logWorkflowEvent, params: { message: `Status atualizado para: ${newStatus}` } },
      context,
    );
  }

  private async assignToDepartment(action: WorkflowAction, context: WorkflowContext): Promise<boolean> {
    const table = this.getEntityTable(context.entity.entity_type ?? WORKFLOW_ENTITY_TYPES.workOrder);
    const departmentId = action.params.department_id;

    if (!table || typeof departmentId !== 'string') return false;

    const { error } = await supabase
      .from(table)
      .update({ department_id: departmentId, updated_at: new Date().toISOString() })
      .eq('id', context.entity.id);

    if (error) {
      console.error('Erro ao atribuir ao departamento:', error);
      return false;
    }

    return this.triggerNotification(
      {
        type: WORKFLOW_ACTION_TYPES.triggerNotification,
        params: {
          severity: 'info',
          message: `Nova atribuicao para o departamento: ${departmentId}`,
          channel: 'in-app',
        },
      },
      context,
    );
  }

  private async assignToUser(action: WorkflowAction, context: WorkflowContext): Promise<boolean> {
    const table = this.getEntityTable(context.entity.entity_type ?? WORKFLOW_ENTITY_TYPES.workOrder);
    let userId = typeof action.params.user_id === 'string' ? action.params.user_id : undefined;

    if (!table) return false;

    if (action.params.auto_assign === true) {
      userId = await this.findAvailableUser(
        typeof action.params.skill_required === 'string' ? action.params.skill_required : undefined,
      );
    }

    if (!userId) return false;

    const { error } = await supabase
      .from(table)
      .update({ assigned_to: userId, updated_at: new Date().toISOString() })
      .eq('id', context.entity.id);

    if (error) {
      console.error('Erro ao atribuir ao usuario:', error);
      return false;
    }

    return this.triggerNotification(
      {
        type: WORKFLOW_ACTION_TYPES.triggerNotification,
        params: {
          severity: 'info',
          message: 'Nova tarefa atribuida a voce',
          channel: 'in-app',
        },
      },
      { ...context, user_id: userId },
    );
  }

  private async triggerNotification(action: WorkflowAction, context: WorkflowContext): Promise<boolean> {
    const message = action.params.message;
    const channel = action.params.channel;
    const severity = typeof action.params.severity === 'string' ? action.params.severity : 'info';
    const userId = context.user_id ?? context.entity.assigned_to;

    if (!userId || typeof message !== 'string') return false;

    const payload = {
      type: 'workflow',
      severity,
      title: 'Workflow Action',
      message,
      user_id: userId,
      channel: typeof channel === 'string' ? channel : 'in-app',
    };

    if (channel === 'email') {
      await sendEmailNotification({ ...payload, channel: 'email' });
      return true;
    }

    if (channel === 'sms') {
      await sendSMSNotification({ ...payload, channel: 'sms' });
      return true;
    }

    await sendInAppNotification({ ...payload, channel: 'in-app' });
    return true;
  }

  private async logWorkflowEvent(action: WorkflowAction, context: WorkflowContext): Promise<boolean> {
    const message = typeof action.params.message === 'string' ? action.params.message : 'Acao de workflow executada';
    const log = await this.createWorkflowLog({
      entity_type: context.entity.entity_type ?? WORKFLOW_ENTITY_TYPES.workOrder,
      entity_id: context.entity.id,
      action: 'workflow_action',
      description: message,
      result: 'success',
      user_id: context.user_id,
    });

    return Boolean(log);
  }

  private async createTask(action: WorkflowAction, context: WorkflowContext): Promise<boolean> {
    const title = action.params.title;
    const description = action.params.description;

    if (typeof title !== 'string' || typeof description !== 'string') return false;

    const { error } = await supabase.from(INDUSTRIAL_TABLES.workOrderTasks).insert({
      title,
      description,
      priority: action.params.priority ?? 'medium',
      status: 'pending',
      work_order_id: context.entity.entity_type === WORKFLOW_ENTITY_TYPES.workOrder ? context.entity.id : null,
      assigned_to: action.params.assigned_to ?? null,
      due_date: typeof action.params.due_date === 'string' ? new Date(action.params.due_date).toISOString() : null,
      created_by: context.user_id,
    });

    if (error) {
      console.error('Erro ao criar tarefa:', error);
      return false;
    }

    return true;
  }

  private async autoCloseWorkOrder(context: WorkflowContext): Promise<boolean> {
    if (context.entity.entity_type !== WORKFLOW_ENTITY_TYPES.workOrder) return false;

    const { data: tasks, error: tasksError } = await supabase
      .from(INDUSTRIAL_TABLES.workOrderTasks)
      .select('status')
      .eq('work_order_id', context.entity.id);

    if (tasksError) {
      console.error('Erro ao consultar tarefas:', tasksError);
      return false;
    }

    const allCompleted = tasks?.every((task) => task.status === 'completed') ?? false;
    if (!allCompleted) return false;

    const { error } = await supabase
      .from(INDUSTRIAL_TABLES.workOrders)
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.entity.id);

    if (error) {
      console.error('Erro ao fechar ordem de trabalho:', error);
      return false;
    }

    await logEvent('work_order_completed', {
      work_order_id: context.entity.id,
      metadata: { reason: 'all_tasks_completed' },
    });

    return true;
  }

  private async updateField(action: WorkflowAction, context: WorkflowContext): Promise<boolean> {
    const table = this.getEntityTable(context.entity.entity_type ?? WORKFLOW_ENTITY_TYPES.workOrder);
    const field = action.params.field;

    if (!table || typeof field !== 'string' || action.params.value === undefined) return false;

    const { error } = await supabase
      .from(table)
      .update({ [field]: action.params.value, updated_at: new Date().toISOString() })
      .eq('id', context.entity.id);

    if (error) {
      console.error('Erro ao atualizar campo:', error);
      return false;
    }

    return true;
  }

  private async sendEmail(action: WorkflowAction, context: WorkflowContext): Promise<boolean> {
    console.log('Email would be sent:', action.params);
    return this.logWorkflowEvent(
      { type: WORKFLOW_ACTION_TYPES.logWorkflowEvent, params: { message: `Email enviado para: ${action.params.to}` } },
      context,
    );
  }

  private async sendSMS(action: WorkflowAction, context: WorkflowContext): Promise<boolean> {
    console.log('SMS would be sent:', action.params);
    return this.logWorkflowEvent(
      { type: WORKFLOW_ACTION_TYPES.logWorkflowEvent, params: { message: `SMS enviado para: ${action.params.to}` } },
      context,
    );
  }

  private async callWebhook(action: WorkflowAction, context: WorkflowContext): Promise<boolean> {
    console.log('Webhook would be called:', { url: action.params.url, payload: action.params.payload ?? context });
    return this.logWorkflowEvent(
      { type: WORKFLOW_ACTION_TYPES.logWorkflowEvent, params: { message: `Webhook chamado: ${action.params.url}` } },
      context,
    );
  }

  private async executeCustomAction(action: WorkflowAction, context: WorkflowContext): Promise<boolean> {
    console.log('Custom action would be executed:', { action, context });
    return this.logWorkflowEvent(
      {
        type: WORKFLOW_ACTION_TYPES.logWorkflowEvent,
        params: { message: `Acao personalizada executada: ${action.params.function_name}` },
      },
      context,
    );
  }

  private async findAvailableUser(_skillRequired?: string): Promise<string | undefined> {
    const { data, error } = await supabase.from(INDUSTRIAL_TABLES.profiles).select('id').limit(1);
    if (error) {
      console.error('Erro ao encontrar usuario disponivel:', error);
      return undefined;
    }

    return data?.[0]?.id;
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
}

export const workflowActions = new WorkflowActions();
export default workflowActions;
