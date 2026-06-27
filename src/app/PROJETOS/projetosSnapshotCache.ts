import type { PersistedProjectSnapshot, SavedProjectRecord } from "@/core/projects/types";
import { projetosPageSlugFromRecord } from "./projetosPageSlug";

let snapshot: SavedProjectRecord | null = null;

export function setProjetosSnapshot(data: SavedProjectRecord) {
  snapshot = data;
}

export function getProjetosSnapshot() {
  return snapshot;
}

export function hasProjetosSnapshot() {
  return snapshot !== null;
}

type SaveProjectRecordMeta = Partial<
  Pick<
    SavedProjectRecord,
    "name" | "sequence" | "createdAt" | "updatedAt" | "ownerId" | "ownerName" | "thumbnailDataUrl"
  >
>;

export async function saveProjectRecord(
  internalProjectId: string,
  persistedSnapshot: PersistedProjectSnapshot,
  meta: SaveProjectRecordMeta = {}
): Promise<string> {
  const timestamp = meta.updatedAt ?? new Date().toISOString();
  const name = meta.name ?? "Projeto";
  const record: SavedProjectRecord = {
    id: internalProjectId,
    name,
    sequence: meta.sequence ?? 1,
    createdAt: meta.createdAt ?? timestamp,
    updatedAt: timestamp,
    ownerId: meta.ownerId ?? "",
    ownerName: meta.ownerName ?? "",
    thumbnailDataUrl: meta.thumbnailDataUrl ?? null,
    snapshot: persistedSnapshot,
  };
  setProjetosSnapshot(record);
  return projetosPageSlugFromRecord(record);
}
