/**
 * Configurações de Nesting V4 — alinhadas com settings globais + regras V4.
 */

import { getSettings } from "../core/settings/settingsService";
import { getMaterialByIdOrLabel } from "../core/materials/service";
import { isNestingRotationLocked } from "../core/materials/nestingGrainLock";
import type { V4Piece } from "./nestingV4Types";
import { resolveNestingV4Rules, type NestingV4EngineId } from "./rules/nestingV4Rules";

export type NestingV4RotationMode = "none" | "90" | "free";
export type NestingV4PriorityMode = "sheets" | "waste" | "balanced";
export type { NestingV4EngineId };

export interface NestingV4Settings {
  sheetWidthMm: number;
  sheetHeightMm: number;
  sheetThicknessMm: number;
  /** Margem interna da folha (mm). */
  marginMm: number;
  /** Espaçamento mínimo entre peças (kerf). */
  kerfMm: number;
  rotationMode: NestingV4RotationMode;
  priorityMode: NestingV4PriorityMode;
  /** Motor visual: PRO | Experimental | Deepnest. */
  nestingEngine: NestingV4EngineId;
  /** Mostrar hachura de veio. */
  showGrainHatch: boolean;
  /** Mostrar overlay de desperdício. */
  showWasteOverlay: boolean;
}

export const DEFAULT_NESTING_V4_SETTINGS: NestingV4Settings = {
  sheetWidthMm: 2800,
  sheetHeightMm: 2070,
  sheetThicknessMm: 19,
  marginMm: 10,
  kerfMm: 3,
  rotationMode: "90",
  priorityMode: "balanced",
  nestingEngine: "experimental",
  showGrainHatch: true,
  showWasteOverlay: true,
};

export function loadNestingV4SettingsFromGlobal(): NestingV4Settings {
  const s = getSettings();
  const rules = resolveNestingV4Rules();
  const priority = s.nesting.prioridadeAproveitamento;
  let priorityMode: NestingV4PriorityMode = rules.distribution.priorityMode;
  if (priority === "chapas") priorityMode = "sheets";
  else if (priority === "area") priorityMode = "waste";

  const engineFromSettings = s.cnc.nestingEngine === "experimental" ? "experimental" : "pro";
  const nestingEngine: NestingV4EngineId =
    rules.defaultEngine === "deepnest"
      ? "deepnest"
      : rules.defaultEngine === "pro"
        ? "pro"
        : engineFromSettings;

  return {
    sheetWidthMm: s.materiais.sheetWidthMm,
    sheetHeightMm: s.materiais.sheetHeightMm,
    sheetThicknessMm: s.materiais.sheetThicknessMm,
    marginMm: s.cnc.sheetMarginMm || rules.marginMm,
    kerfMm: s.nesting.kerfPadraoMm ?? s.cnc.minSpacingMm ?? rules.kerfMm,
    rotationMode: !s.nesting.permitirRotacaoGlobal || !rules.rotation.allow90 ? "none" : "90",
    priorityMode,
    nestingEngine,
    showGrainHatch: rules.grain.showHatch,
    showWasteOverlay: rules.compaction.showWasteOverlay,
  };
}

export function sheetDimsForMaterial(
  materialId: string | undefined,
  fallback: NestingV4Settings
): Pick<NestingV4Settings, "sheetWidthMm" | "sheetHeightMm" | "sheetThicknessMm"> {
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

export function allowRotationForPiece(piece: V4Piece, settings: NestingV4Settings): boolean {
  if (settings.rotationMode === "none") return false;
  const rules = resolveNestingV4Rules();
  if (rules.rotation.respectGrainLock) {
    if (
      isNestingRotationLocked({
        materialId: piece.materialId,
        industrialGrainCode: piece.industrialGrainCode,
        pieceTipo: piece.pieceTipo,
        allowPieceRotation: piece.allowPieceRotation,
        lockWoodGrain: piece.lockWoodGrain,
      })
    ) {
      return false;
    }
  }
  if (piece.pieceTipo === "rodape") return true;
  return true;
}
