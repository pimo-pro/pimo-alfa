/**
 * Configurações de Nesting V3 — alinhadas com settings globais do PIMO.
 */

import { getSettings } from "../core/settings/settingsService";
import { getMaterialByIdOrLabel } from "../core/materials/service";
import { isNestingRotationLocked } from "../core/materials/nestingGrainLock";
import type { V3Piece } from "./nestingV3Types";

export type NestingV3RotationMode = "none" | "90" | "free";
export type NestingV3PriorityMode = "sheets" | "waste" | "balanced";

export interface NestingV3Settings {
  sheetWidthMm: number;
  sheetHeightMm: number;
  sheetThicknessMm: number;
  /** Margem interna da folha (mm). */
  marginMm: number;
  /** Espaçamento mínimo entre peças (kerf). */
  kerfMm: number;
  rotationMode: NestingV3RotationMode;
  priorityMode: NestingV3PriorityMode;
  /** Auto-layout V3 via runCutLayout industrial (Etapa 2). */
  enableV3IndustrialAutoLayout: boolean;
}

export const DEFAULT_NESTING_V3_SETTINGS: NestingV3Settings = {
  sheetWidthMm: 2800,
  sheetHeightMm: 2070,
  sheetThicknessMm: 19,
  marginMm: 10,
  kerfMm: 4,
  rotationMode: "90",
  priorityMode: "balanced",
  enableV3IndustrialAutoLayout: true,
};

export function loadNestingV3SettingsFromGlobal(): NestingV3Settings {
  const s = getSettings();
  const priority = s.nesting.prioridadeAproveitamento;
  let priorityMode: NestingV3PriorityMode = "balanced";
  if (priority === "chapas") priorityMode = "sheets";
  else if (priority === "area") priorityMode = "waste";

  return {
    sheetWidthMm: s.materiais.sheetWidthMm,
    sheetHeightMm: s.materiais.sheetHeightMm,
    sheetThicknessMm: s.materiais.sheetThicknessMm,
    marginMm: s.cnc.sheetMarginMm,
    kerfMm: s.nesting.kerfPadraoMm ?? s.cnc.minSpacingMm ?? DEFAULT_NESTING_V3_SETTINGS.kerfMm,
    rotationMode: s.nesting.permitirRotacaoGlobal ? "90" : "none",
    priorityMode,
    enableV3IndustrialAutoLayout: s.nesting.enableV3IndustrialAutoLayout !== false,
  };
}

export function sheetDimsForMaterial(
  materialId: string | undefined,
  fallback: NestingV3Settings
): Pick<NestingV3Settings, "sheetWidthMm" | "sheetHeightMm" | "sheetThicknessMm"> {
  if (!materialId) {
    return {
      sheetWidthMm: fallback.sheetWidthMm,
      sheetHeightMm: fallback.sheetHeightMm,
      sheetThicknessMm: fallback.sheetThicknessMm,
    };
  }
  const mat = getMaterialByIdOrLabel(materialId);
  if (!mat) {
    return {
      sheetWidthMm: fallback.sheetWidthMm,
      sheetHeightMm: fallback.sheetHeightMm,
      sheetThicknessMm: fallback.sheetThicknessMm,
    };
  }
  return {
    sheetWidthMm: Number(mat.sheetWidthMm) > 0 ? Number(mat.sheetWidthMm) : fallback.sheetWidthMm,
    sheetHeightMm: Number(mat.sheetHeightMm) > 0 ? Number(mat.sheetHeightMm) : fallback.sheetHeightMm,
    sheetThicknessMm: Number(mat.sheetThicknessMm) > 0 ? Number(mat.sheetThicknessMm) : fallback.sheetThicknessMm,
  };
}

export function allowRotationForPiece(
  piece: V3Piece,
  settings: NestingV3Settings
): boolean {
  if (settings.rotationMode === "none") return false;
  if (
    isNestingRotationLocked({
      materialId: piece.materialId,
      industrialGrainCode: piece.industrialGrainCode,
      pieceTipo: piece.pieceTipo,
      allowPieceRotation: piece.allowPieceRotation,
    })
  ) {
    return false;
  }
  if (piece.pieceTipo === "rodape") return true;
  return true;
}
