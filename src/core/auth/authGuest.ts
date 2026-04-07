/**
 * authGuest — identidade persistente para visitantes (sem conta registada).
 *
 * - Chave localStorage: `pimo_guest_id`
 * - Formato: `guest-<uuid>` (crypto.randomUUID se disponível, fallback manual)
 * - Retrocompatível: migra IDs `anon-` gerados pelo sistema anterior
 * - Uma única criação por dispositivo — nunca reescreve um ID já válido
 * - Protegido contra QuotaExceededError
 */

const GUEST_ID_KEY = "pimo_guest_id";
const LEGACY_ANON_ID_KEY = "pimo_current_user_id";

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
}

/**
 * Devolve o ownerId estável deste visitante.
 *
 * Ordem de resolução:
 *   1. Lê `pimo_guest_id` — se existir e começar por "guest-", usa-o directamente.
 *   2. Lê `pimo_current_user_id` (chave legacy) — se começar por "anon-",
 *      converte para "guest-" e persiste em `pimo_guest_id`.
 *   3. Gera novo `guest-<uuid>` e persiste em `pimo_guest_id`.
 *
 * Nunca reescreve um ID já válido.
 * Nunca lança excepção — falha silenciosa com aviso no console.
 */
export function getGuestOwnerId(): string {
  if (typeof localStorage === "undefined") {
    return `guest-${generateUuid()}`;
  }

  // 1. Nova chave — já migrado ou criado numa visita anterior
  const current = (localStorage.getItem(GUEST_ID_KEY) || "").trim();
  if (current && current.startsWith("guest-")) return current;

  // 2. Chave legacy (sistema anterior usava "anon-") — migrar sem perder identidade
  const legacy = (localStorage.getItem(LEGACY_ANON_ID_KEY) || "").trim();
  if (legacy && legacy.startsWith("anon-")) {
    const migrated = `guest-${legacy.slice(5)}`;
    try {
      localStorage.setItem(GUEST_ID_KEY, migrated);
    } catch {
      // QuotaExceededError — devolver o ID migrado sem persistir
    }
    return migrated;
  }

  // 3. Primeira visita — gerar novo ID estável
  const newId = `guest-${generateUuid()}`;
  try {
    localStorage.setItem(GUEST_ID_KEY, newId);
  } catch (err) {
    console.warn("[pimo] localStorage cheio ao guardar guestId:", err);
  }
  return newId;
}
