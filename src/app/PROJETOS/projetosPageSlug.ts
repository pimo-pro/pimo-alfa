import type { SavedProjectRecord } from "@/core/projects/types";

/** Slug público da página PROJETOS — igual ao nome do projecto (trim). */
export function toProjetosPageSlug(projectName: string): string {
  const trimmed = String(projectName ?? "").trim();
  return trimmed || "Projeto";
}

export function decodeProjetosPageSlug(pageSlug: string): string {
  try {
    return decodeURIComponent(String(pageSlug ?? "").trim());
  } catch {
    return String(pageSlug ?? "").trim();
  }
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
  return toProjetosPageSlug(snapshot.name) === decodeProjetosPageSlug(pageSlug);
}
