import type { PersistedProjectSnapshot, SavedProjectRecord } from "@/core/projects/types";

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
  projectId: string,
  persistedSnapshot: PersistedProjectSnapshot,
  meta: SaveProjectRecordMeta = {}
): Promise<void> {
  const timestamp = meta.updatedAt ?? new Date().toISOString();
  const record: SavedProjectRecord = {
    id: projectId,
    name: meta.name ?? "Projeto",
    sequence: meta.sequence ?? 1,
    createdAt: meta.createdAt ?? timestamp,
    updatedAt: timestamp,
    ownerId: meta.ownerId ?? "",
    ownerName: meta.ownerName ?? "",
    thumbnailDataUrl: meta.thumbnailDataUrl ?? null,
    snapshot: persistedSnapshot,
  };
  setProjetosSnapshot(record);
}
