import type { ProjectState } from "../../context/projectTypes";
import { applyMaterialSync } from "../materials/materialSync";

export function applyMaterialToSelectedObjects(
  project: ProjectState,
  selectedObjectIds: string[],
  materialId: string
): Pick<ProjectState, "workspaceBoxes" | "remates" | "rodapes"> {
  const sync = applyMaterialSync(project, {
    kind: "selection",
    encodedIds: selectedObjectIds,
    materialId,
  });
  return {
    workspaceBoxes: sync.workspaceBoxes,
    remates: sync.remates,
    rodapes: sync.rodapes,
  };
}
