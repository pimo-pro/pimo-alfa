import type { ProjectState } from "../../context/projectTypes";
import { getCncItems } from "../../core/industrial/IndustrialCenter";
import { cutlistToPieces } from "../../core/cutlayout/cutLayoutEngine";
import { cutPieceToV4 } from "../useNestingV4";
import type { V4Piece } from "../nestingV4Types";
import { resolveAllowPieceRotationFromProject } from "./resolveAllowPieceRotation";
import { resolveLockWoodGrainFromProject } from "./resolveLockWoodGrain";

/**
 * Pecas Nesting V4 a partir da cutlist industrial canonica (IndustrialCenter.getCncItems).
 * Inclui pieceEdits; NUNCA overrides documentais (geometria maquina).
 */
export function convertProjectToV4Pieces(project: ProjectState): V4Piece[] {
  if (!project.boxes || project.boxes.length === 0) return [];

  const allItems = getCncItems(project);

  const cutPieces = cutlistToPieces(allItems, {
    projectName: project.projectName ?? "Projeto",
    boxes: project.boxes,
  });

  return cutPieces.map((piece, index) =>
    cutPieceToV4(piece, index, {
      allowPieceRotation: resolveAllowPieceRotationFromProject(project, piece),
      lockWoodGrain: resolveLockWoodGrainFromProject(project, piece),
    })
  );
}
