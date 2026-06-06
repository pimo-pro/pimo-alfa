export type IndustrialTaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
export type IndustrialTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IndustrialTask {
  id: string;
  work_order_id?: string | null;
  title: string;
  description?: string | null;
  status: IndustrialTaskStatus | string;
  priority?: IndustrialTaskPriority | string | null;
  department_id?: string | null;
  assigned_to?: string | null;
  created_by?: string | null;
  accepted_by?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateIndustrialTaskDto {
  work_order_id?: string;
  title: string;
  description?: string;
  priority?: IndustrialTaskPriority | string;
  department_id?: string;
  assigned_to?: string;
  due_date?: string;
  created_by?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateIndustrialTaskDto {
  title?: string;
  description?: string | null;
  status?: IndustrialTaskStatus | string;
  priority?: IndustrialTaskPriority | string | null;
  department_id?: string | null;
  assigned_to?: string | null;
  accepted_by?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface IndustrialTaskFilter {
  work_order_id?: string;
  status?: string;
  department_id?: string;
  assigned_to?: string;
  limit?: number;
  offset?: number;
}
