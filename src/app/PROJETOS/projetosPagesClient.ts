import {
  asObject,
  buildPimoProjectDataFromRequest,
  nowIso,
  toMetaFromProjectData,
  toRecordFromProjectData,
} from "@/core/projects/projectsMappers";
import {
  remoteListProjetosPageProjects,
  type ProjectsApiDeps,
} from "@/core/projects/projectsApi";
import type { SavedProjectMeta } from "@/core/projects/types";

const deps: ProjectsApiDeps = {
  buildPimoProjectDataFromRequest,
  asObject,
  toMetaFromProjectData,
  toRecordFromProjectData,
  nowIso,
};

/** Projectos com página PROJETOS ({nome}.json no servidor). */
export async function listProjetosPageProjects(
  scope: "mine" | "all" = "all",
  ownerId?: string
): Promise<SavedProjectMeta[]> {
  return remoteListProjetosPageProjects(scope, ownerId, deps);
}
