/**
 * Versao publicada (version.json) — Footer + Deploy Info.
 * Fonte unica: ficheiro gerado/estampado no deploy (tag GitHub).
 */

export type PublishedVersionInfo = {
  version: string;
  updatedAt?: string;
  tag?: string;
  commit?: string;
  deployedAt?: string;
};

export const PUBLISHED_VERSION_FALLBACK = "v6.0724.1513";

export function parsePublishedVersion(data: unknown): PublishedVersionInfo | null {
  if (!data || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  if (typeof rec.version !== "string" || !rec.version.trim()) return null;
  return {
    version: rec.version.trim(),
    updatedAt: typeof rec.updatedAt === "string" ? rec.updatedAt : undefined,
    tag: typeof rec.tag === "string" ? rec.tag : undefined,
    commit: typeof rec.commit === "string" ? rec.commit : undefined,
    deployedAt: typeof rec.deployedAt === "string" ? rec.deployedAt : undefined,
  };
}

export async function fetchPublishedVersion(url: string): Promise<PublishedVersionInfo | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return parsePublishedVersion(await res.json());
  } catch {
    return null;
  }
}
