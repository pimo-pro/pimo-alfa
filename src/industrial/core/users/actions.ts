import { logPermissionChange } from '@/industrial/core/permissions/audit';
import { dbCache } from '@/industrial/infra/cache';
import { supabase } from '@/industrial/infra/db';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';
import type { IndustrialUserProfile, UpdateIndustrialUserDto } from './types';

export async function listUsers(): Promise<IndustrialUserProfile[]> {
  const cached = dbCache.get<IndustrialUserProfile[]>('users:all');
  if (cached) return cached;

  const { data, error } = await supabase.from(INDUSTRIAL_TABLES.profiles).select('*').order('created_at');
  if (error) {
    console.error('Erro ao listar utilizadores industriais:', error);
    return [];
  }

  const users = (data ?? []) as IndustrialUserProfile[];
  dbCache.set('users:all', users);
  return users;
}

export async function getUserProfile(id: string): Promise<IndustrialUserProfile | null> {
  const { data, error } = await supabase.from(INDUSTRIAL_TABLES.profiles).select('*').eq('id', id).single();
  if (error) {
    console.error('Erro ao obter perfil industrial:', error);
    return null;
  }

  return data as IndustrialUserProfile;
}

export async function updateUserProfile(
  id: string,
  input: UpdateIndustrialUserDto,
  changedByUserId?: string,
): Promise<IndustrialUserProfile | null> {
  const previous = await getUserProfile(id);
  const { data, error } = await supabase
    .from(INDUSTRIAL_TABLES.profiles)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar perfil industrial:', error);
    return null;
  }

  dbCache.invalidate('users');
  if (changedByUserId && (input.role !== undefined || input.default_department_id !== undefined)) {
    await logPermissionChange({
      targetUserId: id,
      changedByUserId,
      oldRole: previous?.role,
      newRole: input.role,
      oldDefaultDepartment: previous?.default_department_id,
      newDefaultDepartment: input.default_department_id,
    });
  }

  return data as IndustrialUserProfile;
}
