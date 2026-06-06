import type { IndustrialRole } from '@/industrial/core/permissions/roles';

export interface IndustrialUserProfile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: IndustrialRole | string | null;
  department_id?: string | null;
  default_department_id?: string | null;
  is_active?: boolean | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UpdateIndustrialUserDto {
  full_name?: string | null;
  role?: IndustrialRole | string | null;
  department_id?: string | null;
  default_department_id?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}
