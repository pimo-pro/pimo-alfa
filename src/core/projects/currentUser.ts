const CURRENT_USER_ID_KEY = "pimo_current_user_id";
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

/**
 * Gera ou lê um ID anónimo estável para este dispositivo.
 * - Cria apenas se não existir ou se o valor for o genérico "usuario-local".
 * - Nunca reescreve um ID já válido.
 * - Protegido contra QuotaExceededError.
 */
function getOrCreateAnonymousId(): string {
  if (typeof localStorage === "undefined") {
    return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  const existing = (localStorage.getItem(CURRENT_USER_ID_KEY) || "").trim();
  if (existing && existing !== "usuario-local") return existing;

  const newId = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    localStorage.setItem(CURRENT_USER_ID_KEY, newId);
  } catch (err) {
    // QuotaExceededError — devolver o ID sem persistir; não crasha
    console.warn("[pimo] localStorage cheio ao guardar userId anónimo:", err);
  }
  return newId;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Retorna o utilizador do projeto atual.
 * Resultado memoizado em memória após a primeira chamada — sem releituras de
 * localStorage nem criações repetidas de ID anónimo.
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

  // Utilizador anónimo: retornar do cache se já calculado
  if (_cachedUser) return _cachedUser;

  if (typeof localStorage === "undefined") {
    _cachedUser = { ownerId: "usuario-local", ownerName: "Utilizador Local" };
    return _cachedUser;
  }

  const explicit = (localStorage.getItem(CURRENT_USER_ID_KEY) || "").trim();
  const ownerName =
    (localStorage.getItem(CURRENT_USER_NAME_KEY) || "").trim() || "Utilizador Local";

  if (explicit && explicit !== "usuario-local") {
    _cachedUser = { ownerId: explicit, ownerName };
    return _cachedUser;
  }

  const ownerId = getOrCreateAnonymousId();
  _cachedUser = { ownerId, ownerName };
  return _cachedUser;
}

export function setCurrentProjectUser(user: CurrentProjectUser): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CURRENT_USER_ID_KEY, user.ownerId.trim() || "usuario-local");
    localStorage.setItem(CURRENT_USER_NAME_KEY, user.ownerName.trim() || "Utilizador Local");
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
