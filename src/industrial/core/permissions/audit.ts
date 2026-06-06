import { supabase } from '@/industrial/infra/db';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';

export type PermissionChangeContext = {
  context?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export interface PermissionChangeLogInput {
  targetUserId: string;
  changedByUserId: string;
  oldRole?: string | null;
  newRole?: string | null;
  oldDefaultDepartment?: string | null;
  newDefaultDepartment?: string | null;
  extra?: PermissionChangeContext;
}

/**
 * Auditoria de alteracoes RBAC. Mantem o contrato da migration original
 * `permission_change_logs` e centraliza a escrita no pacote industrial.
 */
export async function logPermissionChange(params: PermissionChangeLogInput): Promise<void> {
  const { error } = await supabase.from(INDUSTRIAL_TABLES.permissionChangeLogs).insert({
    target_user_id: params.targetUserId,
    changed_by_user_id: params.changedByUserId,
    old_role: params.oldRole ?? null,
    new_role: params.newRole ?? null,
    old_default_department: params.oldDefaultDepartment ?? null,
    new_default_department: params.newDefaultDepartment ?? null,
    context: params.extra?.context ?? 'settings/roles',
    ip_address: params.extra?.ipAddress ?? null,
    user_agent: params.extra?.userAgent ?? null,
  });

  if (error) {
    console.error('Erro ao auditar alteracao de permissao:', error);
  }
}
