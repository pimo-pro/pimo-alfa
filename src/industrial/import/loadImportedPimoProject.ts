import type { ProjectSnapshot, ProjectState } from "../../context/projectTypes";
import { reviveState } from "../../context/projectPersistence";
import { buildImportedProjectRouteSlug } from "./importedProjectRouteSlug";

export { buildImportedProjectRouteSlug };

/**
 * Prepara o ProjectState importado sem migrações de REMATE/RODA PÉ nem recálculo de design.
 */
export function prepareImportedProjectState(projectState: unknown): ProjectState | null {
  return reviveState(projectState, { skipLoadUpgrades: true });
}

export type ImportedPimoProjectPayload = {
  projectNameSlug: string;
  snapshot: ProjectSnapshot;
  projectName: string;
};

export function buildImportedPimoProjectPayload(
  snapshot: ProjectSnapshot,
  projectName: string
): ImportedPimoProjectPayload | null {
  const restored = prepareImportedProjectState(snapshot.projectState);
  if (!restored) return null;

  const resolvedName = projectName.trim() || restored.projectName?.trim() || "Projeto";

  return {
    projectNameSlug: buildImportedProjectRouteSlug(resolvedName),
    snapshot: {
      projectState: snapshot.projectState,
      viewerSnapshot: snapshot.viewerSnapshot ?? null,
      roomSnapshot: snapshot.roomSnapshot ?? null,
    },
    projectName: resolvedName,
  };
}
