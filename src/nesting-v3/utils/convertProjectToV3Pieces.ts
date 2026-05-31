import type { ProjectState } from "../../context/projectTypes";
import { buildCutlistItemsForIndustrialExport } from "../../core/fabrication/buildCutlistItemsForIndustrialExport";
import { buildRemateCutlistItems } from "../../core/remate/remateCutlist";
import { cutlistToPieces } from "../../core/cutlayout/cutLayoutEngine";
import { cutPieceToV3 } from "../useNestingV3";
import type { V3Piece } from "../nestingV3Types";

export function convertProjectToV3Pieces(project: ProjectState): V3Piece[] {
  if (!project.boxes || project.boxes.length === 0) return [];

  const manufacturingItems = buildCutlistItemsForIndustrialExport({
    boxes: project.boxes,
    rules: project.rules,
    materialId: project.materialId,
    projectName: project.projectName ?? "Projeto",
    extractedPartsByBoxId: project.extractedPartsByBoxId,
  });

  const remateItems = buildRemateCutlistItems(project.remates ?? [], project.boxes);
  const allItems = [...manufacturingItems, ...remateItems];
  const cutPieces = cutlistToPieces(allItems, {
    projectName: project.projectName ?? "Projeto",
    boxes: project.boxes,
  });

  return cutPieces.map((piece, index) => cutPieceToV3(piece, index));
}
