/**
 * Carrega Novidades do Sistema a partir de /updates/news.json.
 * Fallback: /industrial/release/publications.json (legado).
 */

import type { IconName } from "@/components/icons";

export type WhatsNewType = "fix" | "update" | "feature" | "docs";

export type WhatsNewEntry = {
  version: string;
  title: string;
  description: string;
  publishedAt: string;
  type: WhatsNewType;
  author?: string;
  /** Nome lógico do ícone SVG (IconName) conforme tipo. */
  icon?: IconName;
  /** Hash curto do commit. */
  commit?: string;
};

export const WHATS_NEW_NEWS_URL = "/updates/news.json";
export const WHATS_NEW_LEGACY_URL = "/industrial/release/publications.json";

/** Mapa tipo → SVG do sistema de ícones (sem emoji). */
export const WHATS_NEW_TYPE_ICONS: Record<WhatsNewType, IconName> = {
  fix: "check",
  feature: "highlight",
  update: "settings",
  docs: "info",
};

const PUBLICATION_MSG_RE = /^publica[cç][aã]o\b/i;
const RELEASE_CHORE_RE = /^chore\s*\(\s*release\s*\)\s*:/i;
const LEGACY_EMOJI_ICONS = new Set(["🛠️", "✨", "⚙️", "📄", "🔧", "🆕"]);

function isIgnoredCommitMessage(message: string): boolean {
  const m = String(message || "").trim();
  if (!m) return true;
  return PUBLICATION_MSG_RE.test(m) || RELEASE_CHORE_RE.test(m);
}

/** Deteção automática do tipo a partir do prefixo do commit (CI + publish). */
export function inferWhatsNewType(message: string): WhatsNewType {
  const m = String(message || "").trim().toLowerCase();
  const match = m.match(/^(fix|feat|feature|update|chore|docs)(\(|:|\b)/);
  if (!match) return "update";
  const prefix = match[1];
  if (prefix === "fix") return "fix";
  if (prefix === "feat" || prefix === "feature") return "feature";
  if (prefix === "docs") return "docs";
  return "update";
}

export function iconForWhatsNewType(type: WhatsNewType): IconName {
  return WHATS_NEW_TYPE_ICONS[type] ?? WHATS_NEW_TYPE_ICONS.update;
}

function inferType(message: string): WhatsNewType {
  return inferWhatsNewType(message);
}

function isNewsType(value: unknown): value is WhatsNewType {
  return value === "fix" || value === "feature" || value === "update" || value === "docs";
}

function isIconName(value: string): value is IconName {
  return (
    value === "check" ||
    value === "highlight" ||
    value === "settings" ||
    value === "info" ||
    value === "fix" ||
    value === "feature" ||
    value === "update" ||
    value === "docs"
  );
}

function resolveIcon(raw: unknown, type: WhatsNewType): IconName {
  if (typeof raw === "string" && raw.trim()) {
    const v = raw.trim();
    if (LEGACY_EMOJI_ICONS.has(v)) return iconForWhatsNewType(type);
    if (v === "fix") return "check";
    if (v === "feature") return "highlight";
    if (v === "update") return "settings";
    if (v === "docs") return "info";
    if (isIconName(v)) return v;
  }
  return iconForWhatsNewType(type);
}

function shortTitle(message: string, version: string): string {
  const line = String(message || "")
    .trim()
    .split(/\r?\n/)[0]
    .trim();
  if (!line) return `Release ${version}`;
  return line.length > 90 ? `${line.slice(0, 87)}...` : line;
}

function sortByPublishedAtDesc(entries: WhatsNewEntry[]): WhatsNewEntry[] {
  return [...entries].sort((a, b) => {
    const tb = Date.parse(b.publishedAt) || 0;
    const ta = Date.parse(a.publishedAt) || 0;
    return tb - ta;
  });
}

function normalizeEntry(raw: unknown): WhatsNewEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  const version = typeof src.version === "string" ? src.version.trim() : "";
  if (!version) return null;

  let description =
    typeof src.description === "string"
      ? src.description
      : typeof src.commitMessage === "string"
        ? src.commitMessage
        : "";
  let title =
    typeof src.title === "string" && src.title.trim() ? src.title.trim() : "";

  // Nunca mostrar texto estático de publicação
  if (isIgnoredCommitMessage(description)) description = "";
  if (isIgnoredCommitMessage(title)) title = "";

  if (!description && title) description = title;
  if (!title) title = shortTitle(description, version);
  if (!description) description = title;

  const publishedAt =
    typeof src.publishedAt === "string" && src.publishedAt
      ? src.publishedAt
      : new Date().toISOString();
  const type: WhatsNewType = isNewsType(src.type)
    ? src.type
    : inferType(description || title);
  const author = typeof src.author === "string" ? src.author : undefined;
  const commit =
    typeof src.commit === "string" && src.commit.trim() ? src.commit.trim() : undefined;
  const icon = resolveIcon(src.icon, type);

  return {
    version,
    title,
    description,
    publishedAt,
    type,
    author,
    icon,
    ...(commit ? { commit } : {}),
  };
}

export function parseWhatsNewFile(data: unknown): WhatsNewEntry[] {
  if (!data || typeof data !== "object") return [];
  const src = data as Record<string, unknown>;
  const list = Array.isArray(src.news)
    ? src.news
    : Array.isArray(src.publications)
      ? src.publications
      : [];
  return sortByPublishedAtDesc(
    list.map(normalizeEntry).filter((e): e is WhatsNewEntry => Boolean(e))
  );
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
