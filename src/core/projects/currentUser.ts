import { getGuestOwnerId } from "../auth/authGuest";

const CURRENT_USER_NAME_KEY = "pimo_current_user_name";

/** Deve coincidir com `AuthProvider` (`src/auth/AuthProvider.tsx`). */
const AUTH_TOKEN_KEY = "pimo_auth_token";
const AUTH_USER_KEY = "pimo_auth_user";

export type CurrentProjectUser = {
  ownerId: string;
  ownerName: string;
};

// ---------------------------------------------------------------------------
// Cache em memória — carregado uma única vez por sessão
// ---------------------------------------------------------------------------

/** Resultado memoizado de getCurrentProjectUser(). null = ainda não calculado. */
let _cachedUser: CurrentProjectUser | null = null;

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function tryOwnerFromAuthStorage(): CurrentProjectUser | null {
  if (typeof localStorage === "undefined") return null;
  const token = (localStorage.getItem(AUTH_TOKEN_KEY) || "").trim();
  if (!token) return null;
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { id?: unknown; username?: unknown };
    if (!parsed || typeof parsed !== "object") return null;
    const id = typeof parsed.id === "string" ? parsed.id.trim() : "";
    if (!id) return null;
    const username = typeof parsed.username === "string" ? parsed.username.trim() : "";
    return { ownerId: id, ownerName: username || id };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Retorna o utilizador do projeto atual.
 * Resultado memoizado em memória após a primeira chamada — sem releituras de
 * localStorage nem criações repetidas de ID de visitante.
 *
 * - Utilizadores autenticados: sempre lidos de auth storage (bypass cache).
 * - Visitantes: ownerId estável via getGuestOwnerId() (authGuest.ts).
 *
 * O cache é invalidado por `setCurrentProjectUser()` para suportar login/logout.
 */
export function getCurrentProjectUser(): CurrentProjectUser {
  // Utilizador autenticado: nunca usa cache (o token pode ter mudado)
  const fromAuth = tryOwnerFromAuthStorage();
  if (fromAuth) {
    // Não guardar em cache para garantir que logout limpa corretamente
    return fromAuth;
  }

  // Visitante: retornar do cache se já calculado
  if (_cachedUser) return _cachedUser;

  if (typeof localStorage === "undefined") {
    _cachedUser = { ownerId: "guest-offline", ownerName: "Visitante" };
    return _cachedUser;
  }

  const ownerName =
    (localStorage.getItem(CURRENT_USER_NAME_KEY) || "").trim() || "Visitante";

  // getGuestOwnerId() é idempotente: lê do localStorage na 1ª chamada,
  // devolve o mesmo valor em chamadas subsequentes desta sessão.
  const ownerId = getGuestOwnerId();
  _cachedUser = { ownerId, ownerName };
  return _cachedUser;
}

export function setCurrentProjectUser(user: CurrentProjectUser): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem("pimo_current_user_id", user.ownerId.trim() || "guest-offline");
    localStorage.setItem(CURRENT_USER_NAME_KEY, user.ownerName.trim() || "Visitante");
  } catch (err) {
    console.warn("[pimo] localStorage cheio ao guardar utilizador:", err);
  }
  // Invalidar cache para que a próxima chamada releia o novo valor
  _cachedUser = null;
}

/**
 * Invalidar manualmente o cache (ex.: após login/logout via AuthProvider).
 * Chamada automática por setCurrentProjectUser().
 */
export function invalidateCurrentProjectUserCache(): void {
  _cachedUser = null;
}
