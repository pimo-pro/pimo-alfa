import { supabase } from '@/industrial/infra/db';
import type { IndustrialUserProfile } from '@/industrial/core/users/types';
import { getUserProfile } from '@/industrial/core/users/actions';

export interface IndustrialSessionUser {
  id: string;
  email?: string;
  profile?: IndustrialUserProfile | null;
}

export async function getCurrentIndustrialUser(): Promise<IndustrialSessionUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const profile = await getUserProfile(data.user.id);
  return {
    id: data.user.id,
    email: data.user.email,
    profile,
  };
}

export async function signInIndustrialUser(email: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('Erro ao autenticar utilizador industrial:', error);
    return false;
  }
  return true;
}

export async function signOutIndustrialUser(): Promise<boolean> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Erro ao terminar sessao industrial:', error);
    return false;
  }
  return true;
}
