export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Modelo legado PIMO-TRAK (tabela `work_orders`, workflow departamental).
 *
 * @deprecated Para produção por estação usar `IndustrialWorkOrder` em
 * `@/industrial/work-orders/WorkOrder`. Ponte read-only: `legacyWorkflowWorkOrderAdapter`.
 */
export interface WorkOrder {
  id: string;
  order_number?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority?: WorkOrderPriority | string | null;
  department_id?: string | null;
  assigned_to?: string | null;
  created_by?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkOrderDto {
  title: string;
  description?: string;
  priority?: WorkOrderPriority | string;
  department_id?: string;
  assigned_to?: string;
  due_date?: string;
  created_by?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateWorkOrderDto {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: WorkOrderPriority | string | null;
  department_id?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  metadata?: Record<string, unknown>;
}

export interface WorkOrderFilter {
  status?: string;
  department_id?: string;
  assigned_to?: string;
  created_by?: string;
  limit?: number;
  offset?: number;
}
