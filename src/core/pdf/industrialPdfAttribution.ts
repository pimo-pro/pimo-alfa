/**
 * Atribuição Designer / Responsável nos PDFs industriais.
 * Não altera UI nem auth — apenas o texto impresso nos PDFs.
 */

import { getCurrentProjectUser } from "../projects/currentUser";

const AUTH_TOKEN_KEY = "pimo_auth_token";
const AUTH_USER_KEY = "pimo_auth_user";
const RESPONSIBLE_FIXED = "khaled";

function readAuthUser(): { username: string; role: string } | null {
  if (typeof localStorage === "undefined") return null;
  const token = (localStorage.getItem(AUTH_TOKEN_KEY) || "").trim();
  if (!token) return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { username?: unknown; role?: unknown };
    const username = typeof parsed.username === "string" ? parsed.username.trim() : "";
    const role = typeof parsed.role === "string" ? parsed.role.trim().toLowerCase() : "";
    return { username, role };
  } catch {
    return null;
  }
}

function normalizeName(value: string): string {
  return value.trim();
}

function isAdminNameOrRole(name: string, role: string): boolean {
  const n = name.toLowerCase();
  return role === "admin" || n === "admin";
}

function isVisitorName(name: string, hasAuth: boolean): boolean {
  if (!hasAuth) return true;
  return name.toLowerCase() === "visitante";
}

/**
 * Regras:
 * - Visitante ? manter nome original (ex.: "Visitante")
 * - Não-admin ? nome do designer
 * - Admin (role ou nome) ? "khaled"
 * - Sempre: "admin" ? "khaled"
 * - Responsável ? sempre "khaled"
 */
export function resolveIndustrialPdfAttribution(): {
  designer: string;
  responsible: string;
} {
  const auth = readAuthUser();
  const projectUser = getCurrentProjectUser();
  const rawName = normalizeName(
    auth?.username || projectUser.ownerName || "Visitante"
  );
  const role = auth?.role ?? "";
  const hasAuth = Boolean(auth);

  let designer = rawName || "Visitante";

  if (isAdminNameOrRole(designer, role)) {
    designer = "khaled";
  } else if (isVisitorName(designer, hasAuth)) {
    designer = rawName || "Visitante";
  } else {
    designer = rawName;
  }

  if (designer.toLowerCase() === "admin") {
    designer = "khaled";
  }

  return {
    designer,
    responsible: RESPONSIBLE_FIXED,
  };
}
