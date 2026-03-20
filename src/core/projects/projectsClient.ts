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
  remoteSaveProject,
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

const LEGACY_LOCAL_PROJECTS_KEY = "pimo_saved_projects";
const OFFLINE_PROJECTS_STORAGE_KEY = "pimo_offline_projects_v2";
const SYNC_QUEUE_STORAGE_KEY = "pimo_projects_sync_queue_v1";
const SYNC_INTERVAL_MS = 15000;

type OfflineProjectRecord = {
  id: string;
  remoteId: string | null;
  name: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  thumbnailDataUrl: string | null;
  snapshot: SaveProjectRequest["snapshot"];
  deleted: boolean;
  lastSyncedAt: string | null;
};

type SyncQueueOperationType = "save" | "snapshot" | "rename" | "delete";

type SyncQueueEntry = {
  id: string;
  projectId: string;
  op: SyncQueueOperationType;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  retries: number;
  lastError: string | null;
};

export type ProjectsSyncStatus = {
  online: boolean;
  pending: number;
  state: "idle" | "saved_local" | "syncing" | "awaiting_network" | "synced" | "error";
  message: string;
  lastSyncAt: string | null;
  hasActiveSyncError: boolean;
  retryInMs: number | null;
};

let legacyMigrationDone = false;
let syncLoopStarted = false;
let syncInProgress = false;
let syncRetryAttempt = 0;
let nextRetryAtMs = 0;
let retryTimerId: number | null = null;
const syncStatusListeners = new Set<(_status: ProjectsSyncStatus) => void>();
let syncStatus: ProjectsSyncStatus = {
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  pending: 0,
  state: "idle",
  message: "Pronto",
  lastSyncAt: null,
  hasActiveSyncError: false,
  retryInMs: null,
};

const projectsApiDeps: ProjectsApiDeps = {
  buildPimoProjectDataFromRequest,
  asObject,
  toMetaFromProjectData,
  toRecordFromProjectData,
  nowIso,
};

function readCurrentUser(): { ownerId: string; ownerName: string } {
  if (typeof localStorage === "undefined") {
    return { ownerId: "usuario-local", ownerName: "Utilizador Local" };
  }
  const ownerId = (localStorage.getItem("pimo_current_user_id") || "").trim() || "usuario-local";
  const ownerName = (localStorage.getItem("pimo_current_user_name") || "").trim() || "Utilizador Local";
  return { ownerId, ownerName };
}

function readJsonFromLocalStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return (parsed as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJsonToLocalStorage(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function readOfflineProjects(): OfflineProjectRecord[] {
  const rows = readJsonFromLocalStorage<unknown[]>(OFFLINE_PROJECTS_STORAGE_KEY, []);
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const obj = asObject(row);
      if (!obj) return null;
      const id = typeof obj.id === "string" && (obj.id?.trim()?.length ?? 0) > 0 ? obj.id : makeId("local");
      const createdAt = toIsoOrNow(obj.createdAt);
      const updatedAt = toIsoOrNow(obj.updatedAt);
      const snapshotObj = asObject(obj.snapshot);
      if (!snapshotObj) return null;
      return {
        id,
        remoteId: typeof obj.remoteId === "string" && (obj.remoteId?.trim()?.length ?? 0) > 0 ? obj.remoteId : null,
        name: typeof obj.name === "string" && (obj.name?.trim()?.length ?? 0) > 0 ? obj.name : "Projeto",
        ownerId: typeof obj.ownerId === "string" && (obj.ownerId?.trim()?.length ?? 0) > 0 ? obj.ownerId : "usuario-local",
        ownerName: typeof obj.ownerName === "string" && (obj.ownerName?.trim()?.length ?? 0) > 0 ? obj.ownerName : "Utilizador Local",
        createdAt,
        updatedAt,
        thumbnailDataUrl:
          typeof obj.thumbnailDataUrl === "string" || obj.thumbnailDataUrl === null
            ? (obj.thumbnailDataUrl as string | null)
            : null,
        snapshot: snapshotObj as SaveProjectRequest["snapshot"],
        deleted: obj.deleted === true,
        lastSyncedAt: typeof obj.lastSyncedAt === "string" ? obj.lastSyncedAt : null,
      } satisfies OfflineProjectRecord;
    })
    .filter((row): row is OfflineProjectRecord => Boolean(row));
}

function writeOfflineProjects(items: OfflineProjectRecord[]): void {
  writeJsonToLocalStorage(OFFLINE_PROJECTS_STORAGE_KEY, items);
}

function readSyncQueue(): SyncQueueEntry[] {
  const rows = readJsonFromLocalStorage<unknown[]>(SYNC_QUEUE_STORAGE_KEY, []);
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const obj = asObject(row);
      if (!obj) return null;
      const id = typeof obj.id === "string" ? obj.id : makeId("sync");
      const projectId = typeof obj.projectId === "string" ? obj.projectId : "";
      const op = obj.op;
      if (projectId.length === 0) return null;
      if (op !== "save" && op !== "snapshot" && op !== "rename" && op !== "delete") return null;
      return {
        id,
        projectId,
        op,
        payload: asObject(obj.payload) ?? {},
        createdAt: toIsoOrNow(obj.createdAt),
        updatedAt: toIsoOrNow(obj.updatedAt),
        retries: Number.isFinite(Number(obj.retries)) ? Number(obj.retries) : 0,
        lastError: typeof obj.lastError === "string" ? obj.lastError : null,
      } satisfies SyncQueueEntry;
    })
    .filter((row): row is SyncQueueEntry => Boolean(row));
}

function writeSyncQueue(items: SyncQueueEntry[]): void {
  writeJsonToLocalStorage(SYNC_QUEUE_STORAGE_KEY, items);
}

function compareByUpdatedDesc(a: { updatedAt: string }, b: { updatedAt: string }): number {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}

function projectMatchesId(project: OfflineProjectRecord, id: string): boolean {
  return project.id === id || project.remoteId === id;
}

function hasPendingOperation(projectId: string): boolean {
  return readSyncQueue().some((entry) => entry.projectId === projectId);
}

function setSyncStatus(patch: Partial<ProjectsSyncStatus>): void {
  syncStatus = {
    ...syncStatus,
    ...patch,
    online: isOnline(),
  };
  syncStatusListeners.forEach((listener) => {
    try {
      listener(syncStatus);
    } catch {
      /* ignore */
    }
  });
}

function refreshPendingStatus(): void {
  const pending = readSyncQueue().length;
  if (syncStatus.hasActiveSyncError && pending > 0) {
    const remaining = nextRetryAtMs > 0 ? Math.max(0, nextRetryAtMs - Date.now()) : null;
    setSyncStatus({
      pending,
      state: "error",
      message: "Erro ao sincronizar",
      hasActiveSyncError: true,
      retryInMs: remaining,
    });
    return;
  }
  if (!isOnline() && pending > 0) {
    setSyncStatus({
      pending,
      state: "awaiting_network",
      message: `${pending} operação(ões) pendente(s)`,
      hasActiveSyncError: false,
      retryInMs: null,
    });
    return;
  }
  if (pending === 0) {
    syncRetryAttempt = 0;
    nextRetryAtMs = 0;
    if (retryTimerId != null && typeof window !== "undefined") {
      window.clearTimeout(retryTimerId);
      retryTimerId = null;
    }
    setSyncStatus({
      pending,
      state: "synced",
      message: "Sincronizado",
      hasActiveSyncError: false,
      retryInMs: null,
    });
    return;
  }
  setSyncStatus({
    pending,
    state: "idle",
    message: `${pending} operação(ões) pendente(s)`,
    hasActiveSyncError: false,
    retryInMs: null,
  });
}

function getRetryDelayMs(attempt: number): number {
  if (attempt <= 1) return 60000;
  if (attempt === 2) return 120000;
  if (attempt === 3) return 300000;
  return 600000;
}

function scheduleRetry(delayMs: number): void {
  if (typeof window === "undefined") return;
  if (retryTimerId != null) {
    window.clearTimeout(retryTimerId);
    retryTimerId = null;
  }
  retryTimerId = window.setTimeout(() => {
    retryTimerId = null;
    void syncQueue();
  }, delayMs);
}

function enqueueSyncOperation(entry: Omit<SyncQueueEntry, "id" | "createdAt" | "updatedAt" | "retries" | "lastError">): void {
  const queue = readSyncQueue();
  queue.push({
    id: makeId("sync"),
    projectId: entry.projectId,
    op: entry.op,
    payload: entry.payload ?? {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
    retries: 0,
    lastError: null,
  });
  writeSyncQueue(queue);
  setSyncStatus({
    pending: queue.length,
    state: isOnline() ? "saved_local" : "awaiting_network",
    message: isOnline() ? "Guardado localmente. A sincronizar..." : "Guardado localmente. Sem internet.",
  });
}

function markDeletedIfNoPending(projectId: string): void {
  if (hasPendingOperation(projectId)) return;
  const projects = readOfflineProjects();
  const next = projects.filter((p) => p.id !== projectId);
  if (next.length !== projects.length) {
    writeOfflineProjects(next);
  }
}

function buildSaveRequestFromOffline(project: OfflineProjectRecord): SaveProjectRequest {
  return {
    name: project.name,
    ownerId: project.ownerId,
    ownerName: project.ownerName,
    snapshot: project.snapshot,
    thumbnailDataUrl: project.thumbnailDataUrl,
  };
}

function migrateLegacyLocalProjectsOnce(): void {
  if (legacyMigrationDone) return;
  legacyMigrationDone = true;
  if (typeof localStorage === "undefined") return;
  const raw = localStorage.getItem(LEGACY_LOCAL_PROJECTS_KEY);
  if (!raw) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return;
  const currentUser = readCurrentUser();
  const existing = readOfflineProjects();
  const byId = new Set(existing.map((item) => item.id));
  const migrated: OfflineProjectRecord[] = [...existing];
  parsed.forEach((item) => {
    const row = asObject(item);
    if (!row) return;
    const id = typeof row.id === "string" && (row.id?.trim()?.length ?? 0) > 0 ? row.id : makeId("legacy");
    if (byId.has(id)) return;
    const snapshotObj = asObject(row.snapshot);
    if (!snapshotObj) return;
    migrated.push({
      id,
      remoteId: null,
      name: typeof row.name === "string" ? row.name : "Projeto",
      ownerId: currentUser.ownerId,
      ownerName: currentUser.ownerName,
      createdAt: toIsoOrNow(row.createdAt),
      updatedAt: toIsoOrNow(row.updatedAt),
      thumbnailDataUrl: null,
      snapshot: snapshotObj as SaveProjectRequest["snapshot"],
      deleted: false,
      lastSyncedAt: null,
    });
    byId.add(id);
    enqueueSyncOperation({
      projectId: id,
      op: "save",
      payload: { request: buildSaveRequestFromOffline(migrated[migrated.length - 1]) },
    });
  });
  writeOfflineProjects(migrated);
}

function ensureSyncLoopStarted(): void {
  if (syncLoopStarted) return;
  syncLoopStarted = true;
  migrateLegacyLocalProjectsOnce();
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      setSyncStatus({ online: true });
      void syncQueue();
    });
    window.addEventListener("offline", () => {
      refreshPendingStatus();
    });
    setInterval(() => {
      void syncQueue();
    }, SYNC_INTERVAL_MS);
    void syncQueue();
  }
}

function resolveProjectIdForRemote(project: OfflineProjectRecord): string | null {
  if (project.remoteId && (project.remoteId?.trim()?.length ?? 0) > 0) return project.remoteId;
  if (!project.id.startsWith("local-") && !project.id.startsWith("legacy-")) return project.id;
  return null;
}

export function getProjectsSyncStatus(): ProjectsSyncStatus {
  ensureSyncLoopStarted();
  refreshPendingStatus();
  return syncStatus;
}

export function subscribeProjectsSyncStatus(
  listener: (_status: ProjectsSyncStatus) => void
): () => void {
  ensureSyncLoopStarted();
  syncStatusListeners.add(listener);
  try {
    listener(syncStatus);
  } catch {
    /* ignore */
  }
  return () => {
    syncStatusListeners.delete(listener);
  };
}

export function saveProjectOffline(
  request: SaveProjectRequest,
  source: "project" | "snapshot" = "project"
): SavedProjectRecord {
  ensureSyncLoopStarted();
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
  setSyncStatus({
    state: "saved_local",
    message: source === "snapshot" ? "Snapshot criado" : "Projeto guardado localmente",
  });
  return toSavedRecordFromOffline(record);
}

export function saveSnapshotOffline(request: SaveProjectRequest): SavedProjectRecord {
  return saveProjectOffline(request, "snapshot");
}

export function loadProjectsOffline(
  scope: "mine" | "all",
  ownerId?: string
): SavedProjectMeta[] {
  ensureSyncLoopStarted();
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

export async function syncQueue(): Promise<void> {
  ensureSyncLoopStarted();
  if (syncInProgress) return;
  if (syncStatus.hasActiveSyncError && nextRetryAtMs > Date.now()) return;
  const queue = readSyncQueue();
  if (queue.length === 0) {
    refreshPendingStatus();
    return;
  }
  if (!isOnline()) {
    refreshPendingStatus();
    return;
  }
  syncInProgress = true;
  setSyncStatus({
    state: "syncing",
    pending: queue.length,
    message: "A sincronizar...",
    retryInMs: null,
  });

  try {
    const projects = readOfflineProjects();
    const nextQueue = [...queue];
    let hadError = false;
    for (let index = 0; index < nextQueue.length; ) {
      const entry = nextQueue[index];
      const projectIdx = projects.findIndex((project) => project.id === entry.projectId);
      const project = projectIdx >= 0 ? projects[projectIdx] : null;
      try {
        if (entry.op === "save" || entry.op === "snapshot") {
          if (!project) {
            nextQueue.splice(index, 1);
            continue;
          }
          const requestObj = asObject(entry.payload.request);
          const request = requestObj
            ? (requestObj as SaveProjectRequest)
            : buildSaveRequestFromOffline(project);
          const saved = await remoteSaveProject(request, projectsApiDeps);
          if (!saved) {
            throw new Error("Falha ao guardar no servidor");
          }
          projects[projectIdx] = {
            ...project,
            remoteId: saved.id,
            name: saved.name,
            ownerId: saved.ownerId,
            ownerName: saved.ownerName,
            updatedAt: toIsoOrNow(saved.updatedAt),
            thumbnailDataUrl: saved.thumbnailDataUrl ?? project.thumbnailDataUrl,
            lastSyncedAt: nowIso(),
            deleted: false,
          };
          nextQueue.splice(index, 1);
          continue;
        }

        if (entry.op === "rename") {
          if (!project) {
            nextQueue.splice(index, 1);
            continue;
          }
          const remoteId = resolveProjectIdForRemote(project);
          if (!remoteId) {
            nextQueue.splice(index, 1);
            continue;
          }
          const body = asObject(entry.payload.body) as RenameProjectRequest | null;
          const name = body?.name ?? project.name;
          const ok = await remoteRenameProject(remoteId, { name });
          if (!ok) throw new Error("Falha ao renomear no servidor");
          projects[projectIdx] = { ...project, lastSyncedAt: nowIso(), updatedAt: nowIso() };
          nextQueue.splice(index, 1);
          continue;
        }

        if (entry.op === "delete") {
          if (!project) {
            nextQueue.splice(index, 1);
            continue;
          }
          const remoteId = resolveProjectIdForRemote(project);
          if (remoteId) {
            const ok = await remoteDeleteProject(remoteId);
            if (!ok) throw new Error("Falha ao apagar no servidor");
          }
          projects.splice(projectIdx, 1);
          nextQueue.splice(index, 1);
          continue;
        }

        nextQueue.splice(index, 1);
      } catch (error) {
        hadError = true;
        nextQueue[index] = {
          ...entry,
          retries: entry.retries + 1,
          updatedAt: nowIso(),
          lastError: error instanceof Error ? error.message : "Erro de sincronização",
        };
        if (!isOnline()) break;
        syncRetryAttempt += 1;
        const delayMs = getRetryDelayMs(syncRetryAttempt);
        nextRetryAtMs = Date.now() + delayMs;
        scheduleRetry(delayMs);
        setSyncStatus({
          pending: nextQueue.length,
          state: "error",
          message: "Erro ao sincronizar",
          hasActiveSyncError: true,
          retryInMs: delayMs,
        });
        break;
      }
    }

    writeOfflineProjects(projects);
    writeSyncQueue(nextQueue);
    const hasPending = nextQueue.length > 0;
    if (!hasPending) {
      syncRetryAttempt = 0;
      nextRetryAtMs = 0;
      if (retryTimerId != null && typeof window !== "undefined") {
        window.clearTimeout(retryTimerId);
        retryTimerId = null;
      }
    }
    const activeError = hasPending ? hadError : false;
    setSyncStatus({
      pending: nextQueue.length,
      state: hasPending ? (activeError ? "error" : "idle") : "synced",
      message: hasPending
        ? (activeError ? "Erro ao sincronizar" : `${nextQueue.length} operação(ões) pendente(s)`)
        : "Sincronizado",
      lastSyncAt: nowIso(),
      hasActiveSyncError: activeError,
      retryInMs: hasPending && activeError
        ? Math.max(0, nextRetryAtMs - Date.now())
        : null,
    });
  } finally {
    syncInProgress = false;
  }
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
  ensureSyncLoopStarted();
  const offline = loadProjectsOffline(scope, ownerId);
  if (!isOnline()) {
    refreshPendingStatus();
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
  ensureSyncLoopStarted();
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
  ensureSyncLoopStarted();
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
  ensureSyncLoopStarted();
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
  ensureSyncLoopStarted();
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
  ensureSyncLoopStarted();
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
