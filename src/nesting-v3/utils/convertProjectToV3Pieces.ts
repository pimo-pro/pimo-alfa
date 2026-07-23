import type { ProjectState } from "../../context/projectTypes";
import { getCncItems } from "../../core/industrial/IndustrialCenter";
import { cutlistToPieces } from "../../core/cutlayout/cutLayoutEngine";
import { cutPieceToV3 } from "../useNestingV3";
import type { V3Piece } from "../nestingV3Types";
import { resolveAllowPieceRotationFromProject } from "./resolveAllowPieceRotation";
import { resolveLockWoodGrainFromProject } from "./resolveLockWoodGrain";

/**
 * Pecas Nesting V3 a partir da cutlist industrial canonica (IndustrialCenter.getCncItems).
 * Inclui pieceEdits; NUNCA overrides documentais (geometria maquina).
 */
export function convertProjectToV3Pieces(project: ProjectState): V3Piece[] {
  if (!project.boxes || project.boxes.length === 0) return [];

  const allItems = getCncItems(project);

  const cutPieces = cutlistToPieces(allItems, {
    projectName: project.projectName ?? "Projeto",
    boxes: project.boxes,
  });

  return cutPieces.map((piece, index) =>
    cutPieceToV3(piece, index, {
      allowPieceRotation: resolveAllowPieceRotationFromProject(project, piece),
      lockWoodGrain: resolveLockWoodGrainFromProject(project, piece),
    })
  );
}
