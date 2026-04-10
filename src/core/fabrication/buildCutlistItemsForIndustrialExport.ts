import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import { cutlistComPrecoFromBoxes } from "../manufacturing/cutlistFromBoxes";

/**
 * Snapshot mínimo para gerar a mesma lista de itens que o fluxo CNC/PDF (cutlist + peças CAD extraídas).
 * Usado em projeto único, multi‑projeto e no Worker — uma única função, com cache em `cutlistComPrecoFromBoxes`.
 */
export type IndustrialExportProjectSnapshot = {
  rules: RulesConfig;
  materialId?: string;
  projectName?: string;
  boxes: BoxModule[];
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
    extractedPartsByBoxId = {},
  } = snap;
  const cutlist = cutlistComPrecoFromBoxes(boxes, rules, materialId, projectName);
  const extracted = boxes.flatMap((b) => Object.values(extractedPartsByBoxId[b.id] ?? {}).flat()) as CutListItemComPreco[];
  return [...cutlist, ...extracted].map((p) => ({
    ...p,
    boxId: p.boxId ?? "",
  }));
}
