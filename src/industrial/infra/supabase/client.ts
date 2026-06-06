import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
let browserClient: SupabaseClient | null = null;

/**
 * Cliente browser do Supabase para o pacote industrial.
 * Mantem a configuracao isolada em `industrial/infra` e usa variaveis Vite.
 */
export function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase industrial requer VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseClient(): SupabaseClient {
  browserClient ??= createSupabaseClient();
  return browserClient;
}

/**
 * Proxy lazy: permite importar o pacote industrial antes de configurar Supabase.
 * A validacao das variaveis acontece apenas quando alguma operacao e executada.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property, receiver) {
    return Reflect.get(getSupabaseClient(), property, receiver);
  },
});
