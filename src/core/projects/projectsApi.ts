import type {
  PimoProjectData,
  RenameProjectRequest,
  SaveProjectRequest,
  SavedProjectMeta,
  SavedProjectRecord,
} from "./types";

/** Caminho da API no mesmo host da app (evita mistura de subdomínios e facilita staging). */
const PROJECTS_API_PATH = "/api/projects/index.php";

/**
 * Base da API de projetos: sempre o origin atual em browser (produção em pimo.pro, preview, etc.).
 * Não usar `process.env.NODE_ENV` aqui — polyfills no cliente podem marcar "development" por engano e
 * desativar POST/PUT/DELETE enquanto GET (outros módulos) continua a aparecer no Network.
 */
export function resolveProjectsApiBase(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(PROJECTS_API_PATH, window.location.origin).href;
  }
  return `https://pimo.pro${PROJECTS_API_PATH}`;
}

function isDevelopmentRuntime(): boolean {
  return Boolean(import.meta.env?.DEV);
}

export function toJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export function buildProjectsUrl(query?: URLSearchParams): string {
  const queryString = query && query.toString() ? `?${query.toString()}` : "";
  return `${resolveProjectsApiBase()}${queryString}`;
}

export type ProjectsApiDeps = {
  buildPimoProjectDataFromRequest: (_request: SaveProjectRequest) => PimoProjectData;
  asObject: (_value: unknown) => Record<string, unknown> | null;
  toMetaFromProjectData: (_project: PimoProjectData, _index: number) => SavedProjectMeta;
  toRecordFromProjectData: (_project: PimoProjectData) => SavedProjectRecord;
  nowIso: () => string;
};

export async function remoteSaveProject(
  request: SaveProjectRequest,
  deps: ProjectsApiDeps
): Promise<SavedProjectMeta | null> {
  if (isDevelopmentRuntime()) return null;
  const projectData = deps.buildPimoProjectDataFromRequest(request);
  const response = await fetch(buildProjectsUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(projectData),
  });
  if (!response.ok) return null;
  const payload = (await toJson(response)) as { project?: unknown } | null;
  const row = deps.asObject(payload?.project);
  if (!row) return null;
  if ("sequence" in row || "ownerName" in row || "thumbnailDataUrl" in row) {
    return row as unknown as SavedProjectMeta;
  }
  if ("ownerId" in row && "viewerSnapshot" in row && "settings" in row) {
    return deps.toMetaFromProjectData(row as unknown as PimoProjectData, 0);
  }
  return null;
}

export async function remoteListProjects(
  scope: "mine" | "all",
  ownerId: string | undefined,
  deps: ProjectsApiDeps
): Promise<SavedProjectMeta[]> {
  if (isDevelopmentRuntime()) return [];
  const params = new URLSearchParams({ scope });
  if (ownerId) params.set("ownerId", ownerId);
  const response = await fetch(buildProjectsUrl(params));
  if (!response.ok) return [];
  const payload = (await toJson(response)) as { projects?: unknown[] } | null;
  const rows = Array.isArray(payload?.projects) ? payload.projects : [];
  return rows
    .map((item, index) => {
      const row = deps.asObject(item);
      if (!row) return null;
      if ("snapshot" in row || "ownerName" in row || "sequence" in row) {
        const id = typeof row.id === "string" ? row.id : "";
        const name = typeof row.name === "string" ? row.name : "Projeto";
        if (!id) return null;
        return {
          id,
          name,
          sequence: Number.isFinite(Number(row.sequence)) ? Number(row.sequence) : index + 1,
          createdAt: typeof row.createdAt === "string" ? row.createdAt : deps.nowIso(),
          updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : deps.nowIso(),
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
        return deps.toMetaFromProjectData(row as unknown as PimoProjectData, index);
      }
      return null;
    })
    .filter((v): v is SavedProjectMeta => Boolean(v));
}

export async function remoteLoadProjectRecord(
  id: string,
  deps: ProjectsApiDeps
): Promise<SavedProjectRecord | null> {
  if (isDevelopmentRuntime()) return null;
  const params = new URLSearchParams({ action: "load", id });
  const response = await fetch(buildProjectsUrl(params));
  if (!response.ok) return null;
  const payload = (await toJson(response)) as { project?: unknown } | null;
  const row = deps.asObject(payload?.project);
  if (!row) return null;
  if ("snapshot" in row) {
    return row as unknown as SavedProjectRecord;
  }
  if ("ownerId" in row && "viewerSnapshot" in row && "settings" in row) {
    return deps.toRecordFromProjectData(row as unknown as PimoProjectData);
  }
  return null;
}

export async function remoteRenameProject(
  id: string,
  body: RenameProjectRequest
): Promise<boolean> {
  if (isDevelopmentRuntime()) return false;
  const params = new URLSearchParams({ action: "update", id });
  const response = await fetch(buildProjectsUrl(params), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.ok;
}

export async function remoteDeleteProject(id: string): Promise<boolean> {
  if (isDevelopmentRuntime()) return false;
  const params = new URLSearchParams({ action: "delete", id });
  const response = await fetch(buildProjectsUrl(params), { method: "DELETE" });
  return response.ok;
}
