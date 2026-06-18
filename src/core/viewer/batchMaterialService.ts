import type { ProjectState } from "../../context/projectTypes";
import { decodeSelectionId } from "./selectionIds";

export function applyMaterialToSelectedObjects(
  project: ProjectState,
  selectedObjectIds: string[],
  materialId: string
): Pick<ProjectState, "workspaceBoxes" | "remates" | "rodapes"> {
  let workspaceBoxes = project.workspaceBoxes;
  let remates = [...(project.remates ?? [])];
  let rodapes = [...(project.rodapes ?? [])];

  for (const encoded of selectedObjectIds) {
    const decoded = decodeSelectionId(encoded);
    if (!decoded) continue;

    if (decoded.kind === "box") {
      workspaceBoxes = workspaceBoxes.map((box) =>
        box.id === decoded.id ? { ...box, material: materialId } : box
      );
      continue;
    }

    if (decoded.kind === "door") {
      const doorId = decoded.id;
      workspaceBoxes = workspaceBoxes.map((box) => ({
        ...box,
        doorsLayer: (box.doorsLayer ?? []).map((door) =>
          door.id === doorId
            ? { ...door, materialId, material: materialId }
            : door
        ),
      }));
      continue;
    }

    if (decoded.kind === "drawer") {
      const drawerId = decoded.id;
      workspaceBoxes = workspaceBoxes.map((box) => ({
        ...box,
        drawersLayer: (box.drawersLayer ?? []).map((drawer) =>
          drawer.id === drawerId
            ? { ...drawer, materialId, material: materialId }
            : drawer
        ),
      }));
      continue;
    }

    if (decoded.kind === "remate") {
      remates = remates.map((remate) =>
        remate.id === decoded.id ? { ...remate, materialPresetId: materialId } : remate
      );
      continue;
    }

    if (decoded.kind === "rodape") {
      rodapes = rodapes.map((rodape) =>
        rodape.id === decoded.id ? { ...rodape, materialId } : rodape
      );
    }
  }

  return { workspaceBoxes, remates, rodapes };
}
