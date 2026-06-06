export interface IndustrialDepartment {
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
  is_active?: boolean | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentDto {
  name: string;
  description?: string;
  code?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateDepartmentDto {
  name?: string;
  description?: string | null;
  code?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}
