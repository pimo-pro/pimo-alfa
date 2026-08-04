import type { ProjectSnapshot, ProjectState } from "../../context/projectTypes";
import { reviveState } from "../../context/projectPersistence";
import { buildImportedProjectRouteSlug } from "./importedProjectRouteSlug";
import { assertViewerUtf8Text } from "@/viewer/encoding/viewerUtf8Guard";

export { buildImportedProjectRouteSlug };

/**
 * Prepara o ProjectState importado sem migrações de REMATE/RODA PÉ nem recálculo de design.
 * Valida encoding UTF-8 do payload textual (Viewer — sem fallback Latin-1).
 */
export function prepareImportedProjectState(projectState: unknown): ProjectState | null {
  try {
    const probe = typeof projectState === "string" ? projectState : JSON.stringify(projectState);
    assertViewerUtf8Text(probe, "Viewer import");
  } catch (err) {
    if (err instanceof Error && /Encoding portugues invalido|nao e UTF-8/i.test(err.message)) {
      throw err;
    }
    // JSON.stringify pode falhar em ciclos — nesse caso segue reviveState.
  }
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
