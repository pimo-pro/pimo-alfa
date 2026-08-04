import { supabase } from '@/industrial/infra/db';

import { isValidIndustrialUserId } from './industrialUserIds';

export { isValidIndustrialUserId } from './industrialUserIds';

export const DEFAULT_INDUSTRIAL_USER = {
  email: 'pimo-trak-industrial@pimo.pro',
  name: 'PIMO-TRAK Industrial',
  role: 'operator',
} as const;

export const USERS_TABLE = 'users';

export type IndustrialUserRecord = {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

let cachedDefaultUserId: string | null = null;

/** Cache de sucesso por candidateId (ou '__default__') — evita SELECT repetido no bulk. */
const resolvedUserByCandidate = new Map<string, IndustrialUserRecord>();

const USER_SELECT = 'id, email, name, role';

async function fetchUserById(id: string): Promise<IndustrialUserRecord | null> {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select(USER_SELECT)
    .eq('id', id.trim())
    .maybeSingle();

  if (error || !data) return null;
  return data as IndustrialUserRecord;
}

async function fetchUserByEmail(email: string): Promise<IndustrialUserRecord | null> {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select(USER_SELECT)
    .ilike('email', email)
    .maybeSingle();

  if (error || !data) return null;
  return data as IndustrialUserRecord;
}

async function createDefaultIndustrialUser(): Promise<IndustrialUserRecord> {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .insert({
      email: DEFAULT_INDUSTRIAL_USER.email,
      name: DEFAULT_INDUSTRIAL_USER.name,
      role: DEFAULT_INDUSTRIAL_USER.role,
    })
    .select(USER_SELECT)
    .single();

  if (error) {
    const existing = await fetchUserByEmail(DEFAULT_INDUSTRIAL_USER.email);
    if (existing) {
      cachedDefaultUserId = existing.id;
      return existing;
    }
    throw new Error(error.message ?? 'Falha ao criar utilizador industrial.');
  }

  cachedDefaultUserId = data.id;
  return data as IndustrialUserRecord;
}

/**
 * Garante um utilizador válido na tabela `users` para eventos PIMO-TRAK.
 */
export async function getOrCreateIndustrialUser(
  candidateId?: string | null,
): Promise<IndustrialUserRecord> {
  const trimmed = typeof candidateId === 'string' ? candidateId.trim() : '';
  const cacheKey = trimmed || '__default__';
  const cached = resolvedUserByCandidate.get(cacheKey);
  if (cached) return cached;

  if (isValidIndustrialUserId(trimmed)) {
    const existing = await fetchUserById(trimmed);
    if (existing) {
      resolvedUserByCandidate.set(cacheKey, existing);
      return existing;
    }
  }

  if (cachedDefaultUserId) {
    const fromDefault = await fetchUserById(cachedDefaultUserId);
    if (fromDefault) {
      resolvedUserByCandidate.set(cacheKey, fromDefault);
      return fromDefault;
    }
  }

  const byEmail = await fetchUserByEmail(DEFAULT_INDUSTRIAL_USER.email);
  if (byEmail) {
    cachedDefaultUserId = byEmail.id;
    resolvedUserByCandidate.set(cacheKey, byEmail);
    return byEmail;
  }

  const created = await createDefaultIndustrialUser();
  resolvedUserByCandidate.set(cacheKey, created);
  return created;
}

export async function resolveIndustrialUserId(candidateId?: string | null): Promise<string> {
  const user = await getOrCreateIndustrialUser(candidateId);
  return user.id;
}
