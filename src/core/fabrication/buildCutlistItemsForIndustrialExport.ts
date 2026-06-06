import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import { buildGlobalQrCutlistMerged } from "../manufacturing/cutlistFromBoxes";
import { buildRemateCutlistItems } from "../remate/remateCutlist";
import type { RematePiece } from "../remate/rematePieceTypes";

/**
 * Snapshot mínimo para gerar a mesma lista de itens que o fluxo CNC/PDF (cutlist + peças CAD extraídas + remates).
 * Usado em projeto único, multi‑projeto e no Worker — uma única função, com cache em `cutlistComPrecoFromBoxes`.
 */
export type IndustrialExportProjectSnapshot = {
  rules: RulesConfig;
  materialId?: string;
  projectName?: string;
  boxes: BoxModule[];
  remates?: readonly RematePiece[];
  extractedPartsByBoxId?: Record<string, Record<string, unknown[]>>;
};

export function buildCutlistItemsForIndustrialExport(
  snap: IndustrialExportProjectSnapshot
): CutListItemComPreco[] {
  const {
    boxes,
    rules,
    materialId,
    projectName = "Projeto",
    remates = [],
    extractedPartsByBoxId = {},
  } = snap;
  const merged = buildGlobalQrCutlistMerged(
    boxes,
    rules,
    materialId,
    projectName,
    extractedPartsByBoxId as Record<string, Record<string, CutListItemComPreco[]>> | undefined
  );
  const boxItems = merged.map((p) => ({
    ...p,
    boxId: p.boxId ?? "",
  }));
  const remateItems = buildRemateCutlistItems(remates, boxes);
  return [...boxItems, ...remateItems];
}
