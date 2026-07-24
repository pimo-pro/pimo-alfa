/**
 * Carrega Novidades do Sistema a partir de /updates/news.json.
 * Fallback: /industrial/release/publications.json (legado).
 */

export type WhatsNewType = "fix" | "update" | "feature";

export type WhatsNewEntry = {
  version: string;
  title: string;
  description: string;
  publishedAt: string;
  type: WhatsNewType;
  author?: string;
};

export const WHATS_NEW_NEWS_URL = "/updates/news.json";
export const WHATS_NEW_LEGACY_URL = "/industrial/release/publications.json";

function inferType(message: string): WhatsNewType {
  const m = String(message || "").trim().toLowerCase();
  if (m.startsWith("fix")) return "fix";
  if (m.startsWith("feat") || m.startsWith("feature")) return "feature";
  return "update";
}

function shortTitle(message: string, version: string): string {
  const line = String(message || "")
    .trim()
    .split(/\r?\n/)[0]
    .trim();
  if (!line) return `Publicação ${version}`;
  return line.length > 90 ? `${line.slice(0, 87)}...` : line;
}

function normalizeEntry(raw: unknown): WhatsNewEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  const version = typeof src.version === "string" ? src.version.trim() : "";
  if (!version) return null;
  const description =
    typeof src.description === "string"
      ? src.description
      : typeof src.commitMessage === "string"
        ? src.commitMessage
        : "";
  const publishedAt =
    typeof src.publishedAt === "string" && src.publishedAt
      ? src.publishedAt
      : new Date().toISOString();
  const type: WhatsNewType =
    src.type === "fix" || src.type === "feature" || src.type === "update"
      ? src.type
      : inferType(description);
  const title =
    typeof src.title === "string" && src.title.trim()
      ? src.title.trim()
      : shortTitle(description, version);
  const author = typeof src.author === "string" ? src.author : undefined;
  return { version, title, description, publishedAt, type, author };
}

export function parseWhatsNewFile(data: unknown): WhatsNewEntry[] {
  if (!data || typeof data !== "object") return [];
  const src = data as Record<string, unknown>;
  const list = Array.isArray(src.news)
    ? src.news
    : Array.isArray(src.publications)
      ? src.publications
      : [];
  return list.map(normalizeEntry).filter((e): e is WhatsNewEntry => Boolean(e));
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

/**
 * Preferência: /updates/news.json. Se falhar (404/HTML), tenta o legado.
 */
export async function loadWhatsNewNews(): Promise<WhatsNewEntry[]> {
  try {
    const data = await fetchJson(WHATS_NEW_NEWS_URL);
    const entries = parseWhatsNewFile(data);
    if (entries.length > 0) return entries;
  } catch {
    /* fallback legado */
  }
  const legacy = await fetchJson(WHATS_NEW_LEGACY_URL);
  return parseWhatsNewFile(legacy);
}
