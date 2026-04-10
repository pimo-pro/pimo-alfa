import type { CutlistItemForPieces } from "../cutlayout/cutLayoutEngine";
import type { CutLayoutEngineOptions } from "../cutlayout/cutLayoutTypes";
import { buildCncFromCutlistItems } from "../cnc/cncPipeline";
import {
  buildCutlistItemsForIndustrialExport,
  type IndustrialExportProjectSnapshot,
} from "./buildCutlistItemsForIndustrialExport";

export type { IndustrialExportProjectSnapshot } from "./buildCutlistItemsForIndustrialExport";

/**
 * Pipeline industrial “puro” para um projeto: mesma sequência (cutlist cacheada → CNC/nesting/TCN)
 * para exportação única, Worker ou orquestração em lote.
 */
export function buildIndustrialDataForProject(
  snap: IndustrialExportProjectSnapshot,
  projectStubForCnc: unknown,
  layoutOptions: CutLayoutEngineOptions
) {
  const items = buildCutlistItemsForIndustrialExport(snap);
  return buildCncFromCutlistItems(projectStubForCnc, items as CutlistItemForPieces[], undefined, layoutOptions);
}
