import type { SavedProjectRecord } from "@/core/projects/types";

/**
 * Slug publico da pagina PROJETOS.
 * Espacos (e whitespace) -> "_" para URLs limpas (sem %20).
 */
export function toProjetosPageSlug(projectName: string): string {
  const trimmed = String(projectName ?? "")
    .trim()
    .replace(/\s+/g, "_");
  return trimmed || "Projeto";
}

/** Decode URI do segmento (box/peca/projeto). Nao converte "_" <-> espaco. */
export function decodeProjetosPageSlug(pageSlug: string): string {
  try {
    return decodeURIComponent(String(pageSlug ?? "").trim());
  } catch {
    return String(pageSlug ?? "").trim();
  }
}

/**
 * Canonicaliza slug de URL para comparacao:
 * "Antunes%20Novo%20Cozinha" e "Antunes_Novo_Cozinha" -> mesmo valor.
 */
export function normalizeProjetosPageSlug(pageSlug: string): string {
  return toProjetosPageSlug(decodeProjetosPageSlug(pageSlug));
}

/**
 * Nome legivel a partir do slug (para loadProjectRecord / display).
 * "Antunes_Novo_Cozinha" -> "Antunes Novo Cozinha"
 */
export function projectNameFromPageSlug(pageSlug: string): string {
  const decoded = decodeProjetosPageSlug(pageSlug);
  return decoded.replace(/_/g, " ").trim() || "Projeto";
}

export function projetosPageSlugFromRecord(record: Pick<SavedProjectRecord, "name">): string {
  return toProjetosPageSlug(record.name);
}

export function buildProjetosPagePath(record: Pick<SavedProjectRecord, "name">): string {
  return `/PROJETOS/${encodeURIComponent(projetosPageSlugFromRecord(record))}`;
}

export function snapshotMatchesProjetosPageSlug(
  snapshot: SavedProjectRecord | null,
  pageSlug: string | undefined
): boolean {
  if (!snapshot || !pageSlug) return false;
  return toProjetosPageSlug(snapshot.name) === normalizeProjetosPageSlug(pageSlug);
}
