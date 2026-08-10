/**
 * Autenticação local permanente (K / K).
 * Sem flags, sem API remota, sem fallback genérico.
 * Industrial Supabase não é afectado.
 */

import { ALL_KNOWN_PERMISSIONS } from "./permissionsMap";
import type { AuthUser } from "./AuthContext";

/** Prefixo estável do token local — sessão restaurada sem /me. */
export const LOCAL_AUTH_TOKEN_PREFIX = "local-auth-k";

export const LOCAL_AUTH_USER_ID = "local-k";
export const LOCAL_AUTH_USERNAME = "K";
export const LOCAL_AUTH_PASSWORD = "K";
export const LOCAL_AUTH_ROLE = "admin";

/** Permissões admin completas (espelho Master Plan / PHP admin). */
export const LOCAL_AUTH_PERMISSIONS: readonly string[] = [...ALL_KNOWN_PERMISSIONS];

export type LocalAuthSession = {
  token: string;
  user: AuthUser;
  permissions: string[];
};

function normalizeCredential(value: string): string {
  return value.trim();
}

/**
 * Aceita utilizador `K` ou `K@local` (case-insensitive) e senha exactamente `K`.
 */
export function isLocalAuthCredentials(usernameOrEmail: string, password: string): boolean {
  const user = normalizeCredential(usernameOrEmail).toLowerCase();
  const pass = normalizeCredential(password);
  const userOk = user === "k" || user === "k@local";
  const passOk = pass === LOCAL_AUTH_PASSWORD;
  return userOk && passOk;
}

export function isLocalAuthToken(token: string | null | undefined): boolean {
  if (!token) return false;
  return token === LOCAL_AUTH_TOKEN_PREFIX || token.startsWith(`${LOCAL_AUTH_TOKEN_PREFIX}-`);
}

/** Cria sessão local admin (sem rede). */
export function createLocalAuthSession(): LocalAuthSession {
  return {
    token: LOCAL_AUTH_TOKEN_PREFIX,
    user: {
      id: LOCAL_AUTH_USER_ID,
      username: LOCAL_AUTH_USERNAME,
      role: LOCAL_AUTH_ROLE,
    },
    permissions: [...LOCAL_AUTH_PERMISSIONS],
  };
}
