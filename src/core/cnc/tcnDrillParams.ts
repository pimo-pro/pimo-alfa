import type { CutPlacement, SheetDefinition } from "../cutlayout/cutLayoutTypes";
import { getMaterialByIdOrLabel } from "../materials/service";

/** Diâmetro de passagem obrigatório para parafuso 4×50 (DR no TCN / #1002). */
export const TCN_PARAFUSO_DRILL_DIAMETER_MM = 5;

export type TcnDrillHoleLike = {
  diameter?: number;
  depth?: number;
  holeType?: string;
};

function readMaterialSheetThicknessMm(materialId?: string): number {
  if (!materialId) return 0;
  const material = getMaterialByIdOrLabel(String(materialId));
  const t = Number(material?.sheetThicknessMm);
  return Number.isFinite(t) && t > 0 ? t : 0;
}

/**
 * DR — diâmetro emitido no W#81 (#1002).
 * Parafuso 4×50: sempre 5 mm; proíbe qualquer valor inferior (ex.: 4 mm legado).
 */
export function resolveTcnDrillDiameterMm(hole: TcnDrillHoleLike): number {
  const holeType = String(hole.holeType ?? "").trim().toLowerCase();

  if (
    holeType === "parafuso" ||
    holeType === "fixacao_estrutural" ||
    holeType === "fixacao_metalica" ||
    holeType === "dobradica_parafuso_uniao"
  ) {
    return TCN_PARAFUSO_DRILL_DIAMETER_MM;
  }

  const raw = Number(hole.diameter);
  if (!Number.isFinite(raw) || raw <= 0) {
    return TCN_PARAFUSO_DRILL_DIAMETER_MM;
  }

  if (raw < TCN_PARAFUSO_DRILL_DIAMETER_MM) {
    return TCN_PARAFUSO_DRILL_DIAMETER_MM;
  }

  return raw;
}

/**
 * DP — profundidade emitida no W#81 (|#3|).
 * Sempre a espessura real da chapa do material (`sheetThicknessMm`), nunca `hole.depth` legado.
 */
export function resolveTcnDrillDepthMm(pl: CutPlacement, sheet: SheetDefinition): number {
  const fromMaterial = readMaterialSheetThicknessMm(pl.materialId);
  if (fromMaterial > 0) return fromMaterial;

  const fromSheet = Number(sheet.espessura_mm);
  if (Number.isFinite(fromSheet) && fromSheet > 0) return fromSheet;

  const fromPanel = Number(pl.espessura_mm);
  if (Number.isFinite(fromPanel) && fromPanel > 0) return fromPanel;

  return 0.1;
}
