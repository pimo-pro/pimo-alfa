/**
 * Loader do registry oficial de Removidos (Fase 6).
 * SSOT: /updates/removed.json — sem alterar loadWhatsNewNews.
 */

export const REMOVED_REGISTRY_URL = "/updates/removed.json";

export type RemovedRegistryEntry = {
  id: string;
  title: string;
  /** Data ISO YYYY-MM-DD (ou prefixo de ISO). */
  removedIn: string;
  replacedBy: string | null;
  notes: string;
};

function isRemovedEntry(raw: unknown): raw is RemovedRegistryEntry {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    o.id.trim().length > 0 &&
    typeof o.title === "string" &&
    typeof o.removedIn === "string" &&
    (o.replacedBy === null || typeof o.replacedBy === "string") &&
    typeof o.notes === "string"
  );
}

export function parseRemovedRegistry(data: unknown): RemovedRegistryEntry[] {
  const list = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        Array.isArray((data as { removed?: unknown }).removed)
      ? ((data as { removed: unknown[] }).removed)
      : [];

  const entries = list.filter(isRemovedEntry).map((e) => ({
    id: e.id.trim(),
    title: e.title.trim(),
    removedIn: e.removedIn.trim(),
    replacedBy: e.replacedBy === null ? null : String(e.replacedBy).trim() || null,
    notes: e.notes,
  }));

  return [...entries].sort((a, b) => {
    const tb = Date.parse(b.removedIn) || 0;
    const ta = Date.parse(a.removedIn) || 0;
    return tb - ta;
  });
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} em ${url}`);
  }
  const text = await response.text();
  const trimmed = text.trim().toLowerCase();
  if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
    throw new Error(`Resposta HTML em vez de JSON (${url})`);
  }
  return JSON.parse(text) as unknown;
}

/** Carrega e normaliza o registry de removidos. */
export async function loadRemovedRegistry(): Promise<RemovedRegistryEntry[]> {
  const data = await fetchJson(REMOVED_REGISTRY_URL);
  return parseRemovedRegistry(data);
}

export function formatRemovedIn(dateStr: string): string {
  const t = Date.parse(dateStr);
  if (!Number.isFinite(t)) return dateStr;
  return new Date(t).toLocaleDateString("pt-PT", { dateStyle: "medium" });
}
