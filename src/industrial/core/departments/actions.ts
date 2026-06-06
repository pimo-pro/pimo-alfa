import { logEvent } from '@/industrial/core/events/actions';
import { dbCache } from '@/industrial/infra/cache';
import { supabase } from '@/industrial/infra/db';
import { INDUSTRIAL_TABLES } from '@/industrial/infra/supabase/tables';
import type { CreateDepartmentDto, IndustrialDepartment, UpdateDepartmentDto } from './types';

export async function listDepartments(): Promise<IndustrialDepartment[]> {
  const cached = dbCache.get<IndustrialDepartment[]>('departments:all');
  if (cached) return cached;

  const { data, error } = await supabase.from(INDUSTRIAL_TABLES.departments).select('*').order('name');
  if (error) {
    console.error('Erro ao listar departamentos:', error);
    return [];
  }

  const departments = (data ?? []) as IndustrialDepartment[];
  dbCache.set('departments:all', departments);
  return departments;
}

export async function createDepartment(input: CreateDepartmentDto): Promise<IndustrialDepartment | null> {
  const { data, error } = await supabase
    .from(INDUSTRIAL_TABLES.departments)
    .insert({ ...input, is_active: true, metadata: input.metadata ?? {} })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar departamento:', error);
    return null;
  }

  const department = data as IndustrialDepartment;
  dbCache.invalidate('departments');
  await logEvent('department_created', { department_id: department.id });
  return department;
}

export async function updateDepartment(id: string, input: UpdateDepartmentDto): Promise<IndustrialDepartment | null> {
  const { data, error } = await supabase
    .from(INDUSTRIAL_TABLES.departments)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar departamento:', error);
    return null;
  }

  dbCache.invalidate('departments');
  await logEvent('department_updated', { department_id: id });
  return data as IndustrialDepartment;
}

export async function deleteDepartment(id: string): Promise<boolean> {
  const { error } = await supabase.from(INDUSTRIAL_TABLES.departments).delete().eq('id', id);
  if (error) {
    console.error('Erro ao apagar departamento:', error);
    return false;
  }

  dbCache.invalidate('departments');
  await logEvent('department_deleted', { department_id: id });
  return true;
}
