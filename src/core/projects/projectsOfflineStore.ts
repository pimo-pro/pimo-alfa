import type { SaveProjectRequest } from "./types";
import { asObject, makeId, toIsoOrNow } from "./projectsMappers";
import {
  idbGetAll,
  idbSaveAll,
  IDB_STORE_PROJECTS,
  IDB_STORE_QUEUE,
} from "./projectsIndexedDbStore";

const LEGACY_LOCAL_PROJECTS_KEY = "pimo_saved_projects";
const OFFLINE_PROJECTS_STORAGE_KEY = "pimo_offline_projects_v2";
const SYNC_QUEUE_STORAGE_KEY = "pimo_projects_sync_queue_v1";

export type OfflineProjectRecord = {
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
  /** Verdadeiro quando o snapshot original estava inválido; registo mantido para auditoria. */
  corrupted?: boolean;
};

export type SyncQueueOperationType = "save" | "snapshot" | "rename" | "delete";

export type SyncQueueEntry = {
  id: string;
  projectId: string;
  op: SyncQueueOperationType;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  retries: number;
  lastError: string | null;
};

// ---------------------------------------------------------------------------
// IDB — cache em memória + estado de inicialização
// ---------------------------------------------------------------------------

/** Verdadeiro após IDB estar carregado e pronto a usar. */
let _idbReady = false;
/** Guard: init só corre uma vez. */
let _idbInitStarted = false;
/** Cache dos projetos em memória (fonte de verdade quando IDB pronto). */
let _idbProjectsCache: OfflineProjectRecord[] | null = null;
/** Cache da sync queue em memória (fonte de verdade quando IDB pronto). */
let _idbQueueCache: SyncQueueEntry[] | null = null;
/**
 * Buffer de escritas de projetos que ocorreram durante o init assíncrono.
 * Flushed para IDB quando init conclui — nenhum dado é perdido.
 */
let _pendingProjectsWrite: OfflineProjectRecord[] | null = null;
/** Análogo para a sync queue. */
let _pendingQueueWrite: SyncQueueEntry[] | null = null;

let legacyMigrationDone = false;

/** Leitura directa para migração legacy — não cria ID novo, não usa cache. */
function readCurrentUser(): { ownerId: string; ownerName: string } {
  if (typeof localStorage === "undefined") {
    return { ownerId: "usuario-local", ownerName: "Utilizador Local" };
  }
  const ownerId =
    (localStorage.getItem("pimo_current_user_id") || "").trim() || "usuario-local";
  const ownerName =
    (localStorage.getItem("pimo_current_user_name") || "").trim() || "Utilizador Local";
  return { ownerId, ownerName };
}

export function readJsonFromLocalStorage<T>(key: string, fallback: T): T {
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

export function writeJsonToLocalStorage(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Proteção global: QuotaExceededError ou outro erro de storage — log + continua sem crash
    console.warn(`[pimo] Falha ao escrever "${key}" no localStorage (storage cheio?):`, err);
  }
}

// ---------------------------------------------------------------------------
// Normalização de registos (extraída das funções de leitura para reutilização)
// ---------------------------------------------------------------------------

function _normalizeProjectRow(row: unknown): OfflineProjectRecord | null {
  const obj = asObject(row);
  if (!obj) return null;
  const id =
    typeof obj.id === "string" && (obj.id?.trim()?.length ?? 0) > 0
      ? obj.id
      : makeId("local");
  const createdAt = toIsoOrNow(obj.createdAt);
  const updatedAt = toIsoOrNow(obj.updatedAt);
  const snapshotObj = asObject(obj.snapshot);
  if (!snapshotObj) {
    console.warn(`[pimo] Projeto com snapshot inválido mantido como corrompido (id: ${id})`);
  }
  return {
    id,
    remoteId:
      typeof obj.remoteId === "string" && (obj.remoteId?.trim()?.length ?? 0) > 0
        ? obj.remoteId
        : null,
    name:
      typeof obj.name === "string" && (obj.name?.trim()?.length ?? 0) > 0
        ? obj.name
        : "Projeto",
    ownerId:
      typeof obj.ownerId === "string" && (obj.ownerId?.trim()?.length ?? 0) > 0
        ? obj.ownerId
        : "usuario-local",
    ownerName:
      typeof obj.ownerName === "string" && (obj.ownerName?.trim()?.length ?? 0) > 0
        ? obj.ownerName
        : "Utilizador Local",
    createdAt,
    updatedAt,
    thumbnailDataUrl:
      typeof obj.thumbnailDataUrl === "string" || obj.thumbnailDataUrl === null
        ? (obj.thumbnailDataUrl as string | null)
        : null,
    snapshot: (snapshotObj ?? {
      projectState: {},
      viewerSnapshot: null,
    }) as SaveProjectRequest["snapshot"],
    corrupted: !snapshotObj,
    deleted: obj.deleted === true,
    lastSyncedAt: typeof obj.lastSyncedAt === "string" ? obj.lastSyncedAt : null,
  } satisfies OfflineProjectRecord;
}

function _normalizeQueueRow(row: unknown): SyncQueueEntry | null {
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
}

// ---------------------------------------------------------------------------
// IDB — inicialização assíncrona e migração de localStorage
// ---------------------------------------------------------------------------

async function _doIdbInit(): Promise<void> {
  try {
    const [rawProjects, rawQueue] = await Promise.all([
      idbGetAll(IDB_STORE_PROJECTS),
      idbGetAll(IDB_STORE_QUEUE),
    ]);

    const idbProjects = rawProjects
      .map(_normalizeProjectRow)
      .filter(Boolean) as OfflineProjectRecord[];
    const idbQueue = rawQueue
      .map(_normalizeQueueRow)
      .filter((r): r is SyncQueueEntry => Boolean(r));

    if (idbProjects.length > 0 || idbQueue.length > 0) {
      // IDB já tem dados — usar directamente (migração já feita anteriormente)
      if (_idbProjectsCache === null) _idbProjectsCache = idbProjects;
      if (_idbQueueCache === null) _idbQueueCache = idbQueue;
    } else {
      // IDB vazio — 1ª execução após atualização: migrar dados de localStorage
      const lsProjectsRaw = readJsonFromLocalStorage<unknown[]>(
        OFFLINE_PROJECTS_STORAGE_KEY,
        []
      );
      const lsQueueRaw = readJsonFromLocalStorage<unknown[]>(SYNC_QUEUE_STORAGE_KEY, []);

      const lsProjects = Array.isArray(lsProjectsRaw)
        ? lsProjectsRaw.map(_normalizeProjectRow).filter(Boolean) as OfflineProjectRecord[]
        : [];
      const lsQueue = Array.isArray(lsQueueRaw)
        ? lsQueueRaw.map(_normalizeQueueRow).filter((r): r is SyncQueueEntry => Boolean(r))
        : [];

      // Se houve escritas durante o init assíncrono, preferir esses dados
      if (_idbProjectsCache === null) _idbProjectsCache = lsProjects;
      if (_idbQueueCache === null) _idbQueueCache = lsQueue;

      // Persistir em IDB
      if (_idbProjectsCache.length > 0) {
        await idbSaveAll(IDB_STORE_PROJECTS, _idbProjectsCache);
      }
      if (_idbQueueCache.length > 0) {
        await idbSaveAll(IDB_STORE_QUEUE, _idbQueueCache);
      }

      // Limpar localStorage após migração bem-sucedida
      if (typeof localStorage !== "undefined") {
        try { localStorage.removeItem(OFFLINE_PROJECTS_STORAGE_KEY); } catch { /* ignore */ }
        try { localStorage.removeItem(SYNC_QUEUE_STORAGE_KEY); } catch { /* ignore */ }
      }
    }

    // Flush de escritas pendentes que ocorreram durante o init assíncrono.
    // Garante que nenhum dado é perdido por race condition.
    if (_pendingProjectsWrite !== null) {
      _idbProjectsCache = _pendingProjectsWrite;
      _pendingProjectsWrite = null;
      await idbSaveAll(IDB_STORE_PROJECTS, _idbProjectsCache).catch(() => {});
      if (typeof localStorage !== "undefined") {
        try { localStorage.removeItem(OFFLINE_PROJECTS_STORAGE_KEY); } catch { /* ignore */ }
      }
    }
    if (_pendingQueueWrite !== null) {
      _idbQueueCache = _pendingQueueWrite;
      _pendingQueueWrite = null;
      await idbSaveAll(IDB_STORE_QUEUE, _idbQueueCache).catch(() => {});
      if (typeof localStorage !== "undefined") {
        try { localStorage.removeItem(SYNC_QUEUE_STORAGE_KEY); } catch { /* ignore */ }
      }
    }

    _idbReady = true;
  } catch (err) {
    // IDB indisponível (ambiente sem suporte, storage bloqueado, etc.)
    // Fallback transparente para localStorage — sem crash, sem perda de dados.
    console.warn("[pimo] IndexedDB indisponível; usando localStorage como fallback:", err);
    _idbReady = false;
  }
}

/**
 * Inicia a carga assíncrona do IDB (idempotente — corre no máximo uma vez).
 * Chamado automaticamente ao carregar o módulo em browser e explicitamente
 * pelo motor de sync para garantir arranque antecipado.
 */
export function startIdbInit(): void {
  if (_idbInitStarted) return;
  _idbInitStarted = true;
  void _doIdbInit();
}

// Auto-arranque em browser (skip em SSR / Node / testes sem DOM)
if (typeof window !== "undefined") {
  startIdbInit();
}

// ---------------------------------------------------------------------------
// Leitura / Escrita (API síncrona — usa cache IDB quando disponível)
// ---------------------------------------------------------------------------

export function readOfflineProjects(): OfflineProjectRecord[] {
  if (_idbReady && _idbProjectsCache !== null) {
    return [..._idbProjectsCache];
  }
  // IDB ainda não pronto — fallback para localStorage
  const rows = readJsonFromLocalStorage<unknown[]>(OFFLINE_PROJECTS_STORAGE_KEY, []);
  if (!Array.isArray(rows)) return [];
  return rows.map(_normalizeProjectRow).filter(Boolean) as OfflineProjectRecord[];
}

export function writeOfflineProjects(items: OfflineProjectRecord[]): void {
  _idbProjectsCache = [...items];
  if (_idbReady) {
    void idbSaveAll(IDB_STORE_PROJECTS, items).catch((err) => {
      console.warn("[pimo] Falha ao gravar projetos no IDB; fallback para localStorage:", err);
      writeJsonToLocalStorage(OFFLINE_PROJECTS_STORAGE_KEY, items);
    });
  } else {
    // IDB não pronto — buffer para flush posterior + localStorage temporário
    _pendingProjectsWrite = [...items];
    writeJsonToLocalStorage(OFFLINE_PROJECTS_STORAGE_KEY, items);
  }
}

export function readSyncQueue(): SyncQueueEntry[] {
  if (_idbReady && _idbQueueCache !== null) {
    return [..._idbQueueCache];
  }
  // IDB ainda não pronto — fallback para localStorage
  const rows = readJsonFromLocalStorage<unknown[]>(SYNC_QUEUE_STORAGE_KEY, []);
  if (!Array.isArray(rows)) return [];
  return rows
    .map(_normalizeQueueRow)
    .filter((r): r is SyncQueueEntry => Boolean(r));
}

export function writeSyncQueue(items: SyncQueueEntry[]): void {
  _idbQueueCache = [...items];
  if (_idbReady) {
    void idbSaveAll(IDB_STORE_QUEUE, items).catch((err) => {
      console.warn("[pimo] Falha ao gravar fila no IDB; fallback para localStorage:", err);
      writeJsonToLocalStorage(SYNC_QUEUE_STORAGE_KEY, items);
    });
  } else {
    // IDB não pronto — buffer para flush posterior + localStorage temporário
    _pendingQueueWrite = [...items];
    writeJsonToLocalStorage(SYNC_QUEUE_STORAGE_KEY, items);
  }
}

export function compareByUpdatedDesc(
  a: { updatedAt: string },
  b: { updatedAt: string }
): number {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}

export function projectMatchesId(project: OfflineProjectRecord, id: string): boolean {
  const key = id.trim();
  return project.id === key || project.remoteId === key || project.name.trim() === key;
}

let genericOwnerMigrationDone = false;

/**
 * Migra registos com ownerId genérico ("usuario-local" ou prefixo "anon-" legacy)
 * para o ID de visitante estável do dispositivo (prefixo "guest-").
 * Corre uma única vez por sessão.
 */
export function migrateGenericOwnerIdOnce(
  getCurrentUser: () => { ownerId: string; ownerName: string }
): void {
  if (genericOwnerMigrationDone) return;
  genericOwnerMigrationDone = true;
  if (typeof localStorage === "undefined") return;
  const currentUser = getCurrentUser();
  if (currentUser.ownerId === "usuario-local") return;
  const projects = readOfflineProjects();
  let changed = false;
  const updated = projects.map((p) => {
    const isGeneric = p.ownerId === "usuario-local" || p.ownerId.startsWith("anon-");
    if (isGeneric) {
      changed = true;
      return { ...p, ownerId: currentUser.ownerId, ownerName: currentUser.ownerName };
    }
    return p;
  });
  if (changed) {
    writeOfflineProjects(updated);
  }
}

export function migrateLegacyLocalProjectsOnce(deps: {
  enqueueSyncOperation: (
    _entry: Omit<SyncQueueEntry, "id" | "createdAt" | "updatedAt" | "retries" | "lastError">
  ) => void;
  buildSaveRequestFromOffline: (_project: OfflineProjectRecord) => SaveProjectRequest;
}): void {
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
    const id =
      typeof row.id === "string" && (row.id?.trim()?.length ?? 0) > 0
        ? row.id
        : makeId("legacy");
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
    deps.enqueueSyncOperation({
      projectId: id,
      op: "save",
      payload: { request: deps.buildSaveRequestFromOffline(migrated[migrated.length - 1]) },
    });
  });
  writeOfflineProjects(migrated);
}
