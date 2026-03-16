import type {
  PimoProjectData,
  RenameProjectRequest,
  SaveProjectRequest,
  SavedProjectMeta,
  SavedProjectRecord,
} from "./types";

const PROJECTS_API_BASE =
  (typeof import.meta !== "undefined" && (import.meta.env?.VITE_PROJECTS_API_BASE as string | undefined))
    ?.trim()
    .replace(/\/$/, "") || "https://pimo.pro/api/projects";
const LEGACY_LOCAL_PROJECTS_KEY = "pimo_saved_projects";
const LEGACY_SYNC_DONE_KEY = "pimo_projects_remote_sync_done_v1";
let legacySyncPromise: Promise<void> | null = null;

function toJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function projectStateFromSnapshot(snapshot: SaveProjectRequest["snapshot"]): Record<string, unknown> {
  return asObject(snapshot.projectState) ?? {};
}

function buildPimoProjectDataFromRequest(request: SaveProjectRequest): PimoProjectData {
  const now = new Date().toISOString();
  const state = projectStateFromSnapshot(request.snapshot);
  const stateViewer = asObject(state.viewerSettings);
  const stateMaterials = asObject(state.material);
  const room = request.snapshot.roomSnapshot ?? state["room"] ?? null;
  const viewerSnapshot = request.snapshot.viewerSnapshot ?? null;
  const boxes = state["workspaceBoxes"] ?? state["boxes"] ?? [];
  const cutlist = safeArray(state["cutList"]);
  const holes = cutlist.flatMap((item) => {
    const row = asObject(item);
    const drill = row ? row["drillHoles"] : null;
    return Array.isArray(drill) ? drill : [];
  });

  return {
    id: "",
    name: (request.name ?? "").trim() || (String(state["projectName"] ?? "").trim() || "Projeto"),
    ownerId: request.ownerId,
    ownerName: request.ownerName ?? request.ownerId,
    createdAt: now,
    updatedAt: now,
    room,
    boxes,
    shelves: state["shelves"] ?? [],
    dividers: state["dividers"] ?? [],
    centerDisplay: {
      thumbnailDataUrl: request.thumbnailDataUrl ?? null,
      projectName: state["projectName"] ?? request.name ?? "Projeto",
    },
    holes,
    drillMarkers: state["drillMarkers"] ?? [],
    materials: {
      materialId: state["materialId"] ?? null,
      material: stateMaterials ?? null,
    },
    viewerSnapshot,
    settings: {
      projectState: request.snapshot.projectState,
      viewerSettings: stateViewer ?? null,
      ownerName: request.ownerName ?? request.ownerId,
      thumbnailDataUrl: request.thumbnailDataUrl ?? null,
    },
    thumbnailDataUrl: request.thumbnailDataUrl ?? null,
  };
}

function toMetaFromProjectData(project: PimoProjectData, index: number): SavedProjectMeta {
  return {
    id: project.id,
    name: project.name,
    sequence: index + 1,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    ownerId: project.ownerId,
    ownerName: project.ownerName ?? project.ownerId,
    thumbnailDataUrl:
      (asObject(project.centerDisplay)?.thumbnailDataUrl as string | null | undefined) ??
      project.thumbnailDataUrl ??
      null,
  };
}

function toRecordFromProjectData(project: PimoProjectData): SavedProjectRecord {
  const settingsObj = asObject(project.settings);
  const projectState = settingsObj?.projectState ?? {};
  const roomSnapshot = project.room ?? null;
  const snapshot = {
    projectState,
    viewerSnapshot: project.viewerSnapshot ?? null,
    roomSnapshot,
  };
  const meta = toMetaFromProjectData(project, 0);
  return {
    ...meta,
    snapshot,
    projectData: project,
  };
}

function buildProjectsUrl(path = "", query?: URLSearchParams): string {
  const normalizedPath = path ? `/${path}` : "";
  const queryString = query && query.toString() ? `?${query.toString()}` : "";
  return `${PROJECTS_API_BASE}${normalizedPath}${queryString}`;
}

function readCurrentUserForSync(): { ownerId: string; ownerName: string } {
  if (typeof localStorage === "undefined") {
    return { ownerId: "usuario-local", ownerName: "Utilizador Local" };
  }
  const ownerId = (localStorage.getItem("pimo_current_user_id") || "").trim() || "usuario-local";
  const ownerName = (localStorage.getItem("pimo_current_user_name") || "").trim() || "Utilizador Local";
  return { ownerId, ownerName };
}

async function postProjectRaw(request: SaveProjectRequest): Promise<void> {
  const projectData = buildPimoProjectDataFromRequest(request);
  await fetch(buildProjectsUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(projectData),
  });
}

async function syncLegacyLocalProjectsIfNeeded(): Promise<void> {
  if (typeof localStorage === "undefined") return;
  const syncDone = localStorage.getItem(LEGACY_SYNC_DONE_KEY) === "1";
  if (syncDone) return;
  const raw = localStorage.getItem(LEGACY_LOCAL_PROJECTS_KEY);
  if (!raw) {
    localStorage.setItem(LEGACY_SYNC_DONE_KEY, "1");
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    localStorage.setItem(LEGACY_SYNC_DONE_KEY, "1");
    return;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    localStorage.setItem(LEGACY_SYNC_DONE_KEY, "1");
    return;
  }
  const currentUser = readCurrentUserForSync();
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const snapshot = row.snapshot;
    if (!snapshot || typeof snapshot !== "object") continue;
    const name = typeof row.name === "string" ? row.name : "Projeto";
    await postProjectRaw({
      name,
      ownerId: currentUser.ownerId,
      ownerName: currentUser.ownerName,
      snapshot: snapshot as SaveProjectRequest["snapshot"],
      thumbnailDataUrl: null,
    });
  }
  localStorage.setItem(LEGACY_SYNC_DONE_KEY, "1");
}

async function ensureLegacySync(): Promise<void> {
  if (!legacySyncPromise) {
    legacySyncPromise = syncLegacyLocalProjectsIfNeeded().catch(() => {
      // Se a sincronização falhar, não bloqueia o uso da API remota.
    });
  }
  await legacySyncPromise;
}

export async function listProjects(
  scope: "mine" | "all",
  ownerId?: string
): Promise<SavedProjectMeta[]> {
  await ensureLegacySync();
  const params = new URLSearchParams({ scope });
  if (ownerId) params.set("ownerId", ownerId);
  const response = await fetch(buildProjectsUrl("", params));
  if (!response.ok) return [];
  const payload = (await toJson(response)) as { projects?: unknown[] } | null;
  const rows = Array.isArray(payload?.projects) ? payload.projects : [];
  return rows
    .map((item, index) => {
      const row = asObject(item);
      if (!row) return null;
      if ("snapshot" in row || "ownerName" in row || "sequence" in row) {
        const id = typeof row.id === "string" ? row.id : "";
        const name = typeof row.name === "string" ? row.name : "Projeto";
        if (!id) return null;
        return {
          id,
          name,
          sequence: Number.isFinite(Number(row.sequence)) ? Number(row.sequence) : index + 1,
          createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
          updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
          ownerId: typeof row.ownerId === "string" ? row.ownerId : "usuario-local",
          ownerName:
            typeof row.ownerName === "string"
              ? row.ownerName
              : (typeof row.ownerId === "string" ? row.ownerId : "Utilizador"),
          thumbnailDataUrl:
            typeof row.thumbnailDataUrl === "string" || row.thumbnailDataUrl === null
              ? (row.thumbnailDataUrl as string | null)
              : null,
        } satisfies SavedProjectMeta;
      }
      if ("ownerId" in row && "viewerSnapshot" in row && "settings" in row) {
        return toMetaFromProjectData(row as unknown as PimoProjectData, index);
      }
      return null;
    })
    .filter((v): v is SavedProjectMeta => Boolean(v));
}

export async function loadProjectRecord(id: string): Promise<SavedProjectRecord | null> {
  await ensureLegacySync();
  const response = await fetch(buildProjectsUrl(encodeURIComponent(id)));
  if (!response.ok) return null;
  const payload = (await toJson(response)) as { project?: unknown } | null;
  const row = asObject(payload?.project);
  if (!row) return null;
  if ("snapshot" in row) {
    return row as unknown as SavedProjectRecord;
  }
  if ("ownerId" in row && "viewerSnapshot" in row && "settings" in row) {
    return toRecordFromProjectData(row as unknown as PimoProjectData);
  }
  return null;
}

export async function saveProject(request: SaveProjectRequest): Promise<SavedProjectMeta | null> {
  await ensureLegacySync();
  const projectData = buildPimoProjectDataFromRequest(request);
  const response = await fetch(buildProjectsUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(projectData),
  });
  if (!response.ok) return null;
  const payload = (await toJson(response)) as { project?: unknown } | null;
  const row = asObject(payload?.project);
  if (!row) return null;
  if ("sequence" in row || "ownerName" in row || "thumbnailDataUrl" in row) {
    return row as unknown as SavedProjectMeta;
  }
  if ("ownerId" in row && "viewerSnapshot" in row && "settings" in row) {
    return toMetaFromProjectData(row as unknown as PimoProjectData, 0);
  }
  return null;
}

export async function renameProjectById(id: string, body: RenameProjectRequest): Promise<boolean> {
  await ensureLegacySync();
  const response = await fetch(buildProjectsUrl(encodeURIComponent(id)), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.ok;
}

export async function deleteProjectById(id: string): Promise<boolean> {
  await ensureLegacySync();
  const response = await fetch(buildProjectsUrl(encodeURIComponent(id)), { method: "DELETE" });
  return response.ok;
}
