/** Chave alinhada ao showroom: `{ id: string }` em JSON. */
export const PIMO_PENDING_SINGLE_LOAD = "pimo_pending_single_load";

/** Lê e remove a chave; devolve o id ou null se inválida/ausente. */
export function tryConsumePendingSingleLoadId(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PIMO_PENDING_SINGLE_LOAD);
    if (!raw?.trim()) return null;
    sessionStorage.removeItem(PIMO_PENDING_SINGLE_LOAD);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("id" in parsed)) return null;
    const id = (parsed as { id: unknown }).id;
    if (typeof id !== "string") return null;
    const trimmed = id.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
