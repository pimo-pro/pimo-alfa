import type { SavedProjectMeta, SavedProjectRecord } from "./types";
import { remoteLoadProjectRecord, type ProjectsApiDeps } from "./projectsApi";
import {
  buildOfflineFromRemote,
  isOnline,
  makeId,
  nowIso,
  toSavedRecordFromOffline,
} from "./projectsMappers";
import {
  compareByUpdatedDesc,
  projectMatchesId,
  readOfflineProjects,
  readSyncQueue,
  writeOfflineProjects,
  writeSyncQueue,
} from "./projectsOfflineStore";
import { buildSaveRequestFromOffline, enqueueSyncOperation } from "./projectsSyncEngine";

export async function mergeRemoteListIntoOffline(
  remote: SavedProjectMeta[],
  scope: "mine" | "all",
  ownerId: string | undefined,
  loadProjectsOffline: (_scope: "mine" | "all", _ownerId?: string) => SavedProjectMeta[]
): Promise<SavedProjectMeta[]> {
  const local = loadProjectsOffline(scope, ownerId);
  if (remote.length === 0) return local;
  const localProjects = readOfflineProjects();
  const queue = readSyncQueue();
  remote.forEach((remoteMeta) => {
    const idx = localProjects.findIndex((item) => item.id === remoteMeta.id || item.remoteId === remoteMeta.id);
    if (idx < 0) return;
    const current = localProjects[idx];
    const remoteTs = Date.parse(remoteMeta.updatedAt);
    const localTs = Date.parse(current.updatedAt);
    if (Number.isFinite(remoteTs) && Number.isFinite(localTs) && remoteTs > localTs) {
      const hasPending = queue.some((q) => q.projectId === current.id);
      if (!hasPending) {
        localProjects[idx] = {
          ...current,
          remoteId: remoteMeta.id,
          name: remoteMeta.name,
          ownerId: remoteMeta.ownerId,
          ownerName: remoteMeta.ownerName,
          updatedAt: remoteMeta.updatedAt,
          thumbnailDataUrl: remoteMeta.thumbnailDataUrl,
          lastSyncedAt: nowIso(),
        };
      }
    } else if (Number.isFinite(remoteTs) && Number.isFinite(localTs) && localTs > remoteTs) {
      const hasSavePending = queue.some((q) => q.projectId === current.id && (q.op === "save" || q.op === "snapshot"));
      if (!hasSavePending) {
        queue.push({
          id: makeId("sync"),
          projectId: current.id,
          op: "save",
          payload: { request: buildSaveRequestFromOffline(current) },
          createdAt: nowIso(),
          updatedAt: nowIso(),
          retries: 0,
          lastError: null,
        });
      }
    }
  });
  writeOfflineProjects(localProjects);
  writeSyncQueue(queue);
  const mergedById = new Map<string, SavedProjectMeta>();
  local.forEach((item) => mergedById.set(item.id, item));
  remote.forEach((item) => {
    const existing = mergedById.get(item.id);
    if (!existing || Date.parse(item.updatedAt) > Date.parse(existing.updatedAt)) {
      mergedById.set(item.id, item);
    }
  });
  return Array.from(mergedById.values()).sort(compareByUpdatedDesc).map((item, index) => ({
    ...item,
    sequence: index + 1,
  }));
}

export async function loadProjectFromServerAndMerge(
  id: string,
  projectsApiDeps: ProjectsApiDeps
): Promise<SavedProjectRecord | null> {
  const remote = await remoteLoadProjectRecord(id, projectsApiDeps);
  if (!remote) return null;
  const remoteOffline = buildOfflineFromRemote(remote);
  const projects = readOfflineProjects();
  const idx = projects.findIndex((item) => projectMatchesId(item, id));
  if (idx < 0) {
    projects.push(remoteOffline);
    writeOfflineProjects(projects);
    return remote;
  }
  const local = projects[idx];
  const remoteTs = Date.parse(remote.updatedAt);
  const localTs = Date.parse(local.updatedAt);
  if (Number.isFinite(localTs) && Number.isFinite(remoteTs) && localTs > remoteTs) {
    const hasPending = readSyncQueue().some((entry) => entry.projectId === local.id);
    if (!hasPending) {
      enqueueSyncOperation({
        projectId: local.id,
        op: "save",
        payload: { request: buildSaveRequestFromOffline(local) },
      });
    }
    return toSavedRecordFromOffline(local);
  }
  projects[idx] = {
    ...local,
    ...remoteOffline,
    id: local.id,
    remoteId: remote.id,
  };
  writeOfflineProjects(projects);
  return toSavedRecordFromOffline(projects[idx]);
}

export async function attemptBackgroundProjectRefresh(id: string, projectsApiDeps: ProjectsApiDeps): Promise<void> {
  if (!isOnline()) return;
  try {
    await loadProjectFromServerAndMerge(id, projectsApiDeps);
  } catch {
    /* ignore */
  }
}
