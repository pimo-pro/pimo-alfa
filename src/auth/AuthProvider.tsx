import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { getMe, login as loginApi } from "../api/authApi";
import { setApiToken } from "../api/apiClient";
import { AuthContext, type AuthUser } from "./AuthContext";
import {
  createLocalAuthSession,
  isLocalAuthCredentials,
  isLocalAuthToken,
} from "./localAuth";

const STORAGE_TOKEN = "pimo_auth_token";
const STORAGE_USER = "pimo_auth_user";
const STORAGE_PERMISSIONS = "pimo_auth_permissions";

/**
 * Sessão / RBAC — extensões futuras (não implementadas aqui):
 * - Settings online por utilizador: após login, `user.id` (igual ao `sub` do JWT no backend) é o
 *   identificador estável para GET/PATCH de preferências no servidor.
 * - Merge global → utilizador → local: ver `src/core/settings/settingsStorage.ts` (leitura única
 *   hoje em localStorage); a composição por camadas entrará nesse módulo + SettingsContext.
 *
 * Login local permanente: credenciais K/K → sessão admin sem API (ver `localAuth.ts`).
 */

type Props = {
  children: ReactNode;
};

function persistSession(token: string, user: AuthUser, permissions: string[]) {
  localStorage.setItem(STORAGE_TOKEN, token);
  localStorage.setItem(STORAGE_USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_PERMISSIONS, JSON.stringify(permissions));
}

export function AuthProvider({ children }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setPermissions([]);
    setApiToken(null);
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_PERMISSIONS);
  }, []);

  const applySession = useCallback((nextToken: string, nextUser: AuthUser, nextPermissions: string[]) => {
    setToken(nextToken);
    setUser(nextUser);
    setPermissions(nextPermissions);
    // Token local não é JWT remoto — evita Authorization inválido em APIs PHP.
    setApiToken(isLocalAuthToken(nextToken) ? null : nextToken);
    persistSession(nextToken, nextUser, nextPermissions);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_TOKEN);
    const storedUser = localStorage.getItem(STORAGE_USER);
    const storedPermissions = localStorage.getItem(STORAGE_PERMISSIONS);

    if (!storedToken || !storedUser || !storedPermissions) {
      setLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as AuthUser;
      const parsedPermissions = JSON.parse(storedPermissions) as string[];
      setToken(storedToken);
      setUser(parsedUser);
      setPermissions(Array.isArray(parsedPermissions) ? parsedPermissions : []);
      setApiToken(isLocalAuthToken(storedToken) ? null : storedToken);
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      // Modo local permanente: apenas K/K — sem rede, sem fallback genérico.
      if (isLocalAuthCredentials(email, password)) {
        const local = createLocalAuthSession();
        applySession(local.token, local.user, local.permissions);
        return;
      }

      const loginResult = await loginApi(email, password);
      setApiToken(loginResult.token);
      const me = await getMe();
      if (!me?.user?.id) throw new Error("Resposta inválida do servidor");

      const nextUser: AuthUser = {
        id: me.user.id,
        username: me.user.username,
        role: me.user.role,
      };
      const nextPermissions = Array.isArray(me.user.permissions) ? me.user.permissions : [];
      applySession(loginResult.token, nextUser, nextPermissions);
    },
    [applySession]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const isAuthenticated = useCallback(() => {
    return Boolean(token);
  }, [token]);

  /** RBAC: lista espelha `pimo_auth_permissions` e o array normalizado de `/me` (após fix do contrato). */
  const hasPermission = useCallback(
    (permission: string) => {
      return permissions.includes("admin.full_access") || permissions.includes(permission);
    },
    [permissions]
  );

  const value = useMemo(
    () => ({
      token,
      user,
      permissions,
      login,
      logout,
      isAuthenticated,
      hasPermission,
      loading,
    }),
    [token, user, permissions, login, logout, isAuthenticated, hasPermission, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
