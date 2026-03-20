import type {
  RenameProjectRequest,
  SaveProjectRequest,
  SavedProjectMeta,
  SavedProjectRecord,
} from "./types";
import {
  remoteDeleteProject,
  remoteListProjects,
  remoteLoadProjectRecord,
  remoteRenameProject,
  type ProjectsApiDeps,
} from "./projectsApi";
import {
  asObject,
  buildOfflineFromRemote,
  buildPimoProjectDataFromRequest,
  isOnline,
  makeId,
  nowIso,
  toIsoOrNow,
  toMetaFromProjectData,
  toRecordFromProjectData,
  toSavedMetaFromOffline,
  toSavedRecordFromOffline,
} from "./projectsMappers";
import {
  compareByUpdatedDesc,
  projectMatchesId,
  readOfflineProjects,
  readSyncQueue,
  writeOfflineProjects,
  writeSyncQueue,
  type OfflineProjectRecord,
} from "./projectsOfflineStore";
import {
  buildSaveRequestFromOffline,
  enqueueSyncOperation,
  ensureProjectsSyncStarted,
  getProjectsSyncStatus,
  markDeletedIfNoPending,
  notifyLocalSaveStatus,
  subscribeProjectsSyncStatus,
  syncQueue,
} from "./projectsSyncEngine";
export type { ProjectsSyncStatus } from "./projectsSyncEngine";
export { getProjectsSyncStatus, subscribeProjectsSyncStatus, syncQueue } from "./projectsSyncEngine";

const projectsApiDeps: ProjectsApiDeps = {
  buildPimoProjectDataFromRequest,
  asObject,
  toMetaFromProjectData,
  toRecordFromProjectData,
  nowIso,
};

export function saveProjectOffline(
  request: SaveProjectRequest,
  source: "project" | "snapshot" = "project"
): SavedProjectRecord {
  ensureProjectsSyncStarted();
  const timestamp = nowIso();
  const id = makeId("local");
  const record: OfflineProjectRecord = {
    id,
    remoteId: null,
    name: request.name?.trim() || "Projeto",
    ownerId: request.ownerId,
    ownerName: request.ownerName ?? request.ownerId,
    createdAt: timestamp,
    updatedAt: timestamp,
    thumbnailDataUrl: request.thumbnailDataUrl ?? null,
    snapshot: request.snapshot,
    deleted: false,
    lastSyncedAt: null,
  };
  const projects = readOfflineProjects();
  projects.push(record);
  writeOfflineProjects(projects);
  void source;
  notifyLocalSaveStatus(record.id);
  return toSavedRecordFromOffline(record);
}

export function saveSnapshotOffline(request: SaveProjectRequest): SavedProjectRecord {
  return saveProjectOffline(request, "snapshot");
}

export function loadProjectsOffline(
  scope: "mine" | "all",
  ownerId?: string
): SavedProjectMeta[] {
  ensureProjectsSyncStarted();
  const projects = readOfflineProjects()
    .filter((project) => !project.deleted)
    .filter((project) => {
      if (scope !== "mine") return true;
      if (!ownerId) return true;
      return project.ownerId === ownerId;
    })
    .sort(compareByUpdatedDesc);
  return projects.map((project, index) => toSavedMetaFromOffline(project, index));
}

async function mergeRemoteListIntoOffline(
  remote: SavedProjectMeta[],
  scope: "mine" | "all",
  ownerId?: string
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

async function loadProjectFromServerAndMerge(id: string): Promise<SavedProjectRecord | null> {
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

async function attemptBackgroundProjectRefresh(id: string): Promise<void> {
  if (!isOnline()) return;
  try {
    await loadProjectFromServerAndMerge(id);
  } catch {
    /* ignore */
  }
}

export async function listProjects(
  scope: "mine" | "all",
  ownerId?: string
): Promise<SavedProjectMeta[]> {
  ensureProjectsSyncStarted();
  const offline = loadProjectsOffline(scope, ownerId);
  if (!isOnline()) {
    getProjectsSyncStatus();
    return offline;
  }
  try {
    const remote = await remoteListProjects(scope, ownerId, projectsApiDeps);
    const merged = await mergeRemoteListIntoOffline(remote, scope, ownerId);
    void syncQueue();
    return merged;
  } catch {
    return offline;
  }
}

export async function loadProjectRecord(id: string): Promise<SavedProjectRecord | null> {
  ensureProjectsSyncStarted();
  const projects = readOfflineProjects();
  const local = projects.find((project) => !project.deleted && projectMatchesId(project, id)) ?? null;
  if (local) {
    void attemptBackgroundProjectRefresh(local.remoteId ?? id);
    return toSavedRecordFromOffline(local);
  }
  if (!isOnline()) return null;
  try {
    return await loadProjectFromServerAndMerge(id);
  } catch {
    return null;
  }
}

export async function saveProject(request: SaveProjectRequest): Promise<SavedProjectMeta | null> {
  ensureProjectsSyncStarted();
  const savedLocal = saveProjectOffline(request);
  enqueueSyncOperation({
    projectId: readOfflineProjects().find((item) => projectMatchesId(item, savedLocal.id))?.id ?? savedLocal.id,
    op: "save",
    payload: { request },
  });
  if (isOnline()) {
    await syncQueue();
  }
  const localMeta = loadProjectsOffline("all").find((item) => item.id === savedLocal.id);
  return localMeta ?? {
    id: savedLocal.id,
    name: savedLocal.name,
    sequence: 1,
    createdAt: savedLocal.createdAt,
    updatedAt: savedLocal.updatedAt,
    ownerId: savedLocal.ownerId,
    ownerName: savedLocal.ownerName,
    thumbnailDataUrl: savedLocal.thumbnailDataUrl,
  };
}

export async function renameProjectById(id: string, body: RenameProjectRequest): Promise<boolean> {
  ensureProjectsSyncStarted();
  const projects = readOfflineProjects();
  const idx = projects.findIndex((project) => projectMatchesId(project, id));
  if (idx >= 0) {
    projects[idx] = {
      ...projects[idx],
      name: body.name.trim() || projects[idx].name,
      updatedAt: nowIso(),
    };
    writeOfflineProjects(projects);
    enqueueSyncOperation({
      projectId: projects[idx].id,
      op: "rename",
      payload: { body },
    });
    if (isOnline()) {
      await syncQueue();
    }
    return true;
  }
  if (!isOnline()) return false;
  const ok = await remoteRenameProject(id, body);
  if (ok) {
    void syncQueue();
  }
  return ok;
}

export async function deleteProjectById(id: string): Promise<boolean> {
  ensureProjectsSyncStarted();
  const projects = readOfflineProjects();
  const idx = projects.findIndex((project) => projectMatchesId(project, id));
  if (idx >= 0) {
    const project = projects[idx];
    projects[idx] = {
      ...project,
      deleted: true,
      updatedAt: nowIso(),
    };
    writeOfflineProjects(projects);
    enqueueSyncOperation({
      projectId: project.id,
      op: "delete",
      payload: {},
    });
    if (isOnline()) {
      await syncQueue();
    }
    markDeletedIfNoPending(project.id);
    return true;
  }
  if (!isOnline()) return false;
  const ok = await remoteDeleteProject(id);
  if (ok) {
    void syncQueue();
  }
  return ok;
}

export async function saveSnapshot(request: SaveProjectRequest): Promise<SavedProjectMeta | null> {
  ensureProjectsSyncStarted();
  const savedLocal = saveSnapshotOffline(request);
  enqueueSyncOperation({
    projectId: readOfflineProjects().find((item) => projectMatchesId(item, savedLocal.id))?.id ?? savedLocal.id,
    op: "snapshot",
    payload: { request },
  });
  if (isOnline()) {
    await syncQueue();
  }
  return loadProjectsOffline("all").find((item) => item.id === savedLocal.id) ?? null;
}

// Aliases explícitos para serviços/hooks que usam nomes semânticos.
export const fetchProjects = listProjects;
export const createProject = saveProject;
export const updateProject = renameProjectById;
export const deleteProject = deleteProjectById;
export const saveDesign = saveProject;
export const loadDesign = loadProjectRecord;
