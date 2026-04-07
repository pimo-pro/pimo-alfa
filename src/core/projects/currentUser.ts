const CURRENT_USER_ID_KEY = "pimo_current_user_id";
const CURRENT_USER_NAME_KEY = "pimo_current_user_name";

/** Deve coincidir com `AuthProvider` (`src/auth/AuthProvider.tsx`). */
const AUTH_TOKEN_KEY = "pimo_auth_token";
const AUTH_USER_KEY = "pimo_auth_user";

export type CurrentProjectUser = {
  ownerId: string;
  ownerName: string;
};

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

/** Gera ou lê um ID anónimo estável para este dispositivo (persiste em localStorage). */
function getOrCreateAnonymousId(): string {
  const existing = (localStorage.getItem(CURRENT_USER_ID_KEY) || "").trim();
  if (existing && existing !== "usuario-local") return existing;
  const newId = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(CURRENT_USER_ID_KEY, newId);
  return newId;
}

export function getCurrentProjectUser(): CurrentProjectUser {
  if (typeof localStorage === "undefined") {
    return { ownerId: "usuario-local", ownerName: "Utilizador Local" };
  }

  const fromAuth = tryOwnerFromAuthStorage();
  if (fromAuth) return fromAuth;

  const explicit = (localStorage.getItem(CURRENT_USER_ID_KEY) || "").trim();
  if (explicit && explicit !== "usuario-local") {
    const ownerName = (localStorage.getItem(CURRENT_USER_NAME_KEY) || "").trim() || "Utilizador Local";
    return { ownerId: explicit, ownerName };
  }
  const ownerId = getOrCreateAnonymousId();
  const ownerName = (localStorage.getItem(CURRENT_USER_NAME_KEY) || "").trim() || "Utilizador Local";
  return { ownerId, ownerName };
}

export function setCurrentProjectUser(user: CurrentProjectUser): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(CURRENT_USER_ID_KEY, user.ownerId.trim() || "usuario-local");
  localStorage.setItem(CURRENT_USER_NAME_KEY, user.ownerName.trim() || "Utilizador Local");
}
