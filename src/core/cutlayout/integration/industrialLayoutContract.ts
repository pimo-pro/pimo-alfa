/**
 * Contrato industrial de layout — pós-processamento e validação partilhados.
 *
 * Centraliza compactação, pocket filling, offset de margem e validação kerf/margem
 * para SPM, MPM e exportação Nesting V3 (via fixedPlacementsAdapter), sem alterar geradores TCN/TRO.
 */

import type { CutLayoutResult, CutPlacement, SheetDefinition, SheetResult } from "../cutLayoutTypes";
import { applyFixedMarginOffset, cloneSheets, isInsideSheet, overlaps } from "../utils/cutLayoutUtils";
import { applyRotationGeometryToSheets } from "../utils/cutLayoutGeomRotation";
import { aplicarCompactacaoTranslacional } from "../solver/layoutCompactionPass";
import { aplicarPocketFilling, type PocketFillingOptions } from "../solver/pocketFilling2";

const EPS = 0.001;

const DOOR_PATTERN = /\b(porta|door|fr|porte)\b/i;

export type IndustrialLayoutFinalizeMode = "full" | "preserve-positions";

/** Perfil de pocket filling alinhado aos fluxos SPM / MPM existentes. */
export type IndustrialLayoutPocketFillingProfile = "none" | "spm" | "mpm";

export type IndustrialLayoutCoordinateFrame = "solver-usable" | "physical";

export type IndustrialLayoutFinalizeOptions = {
  /** `full` aplica optimizações de posição; `preserve-positions` não move peças. */
  mode: IndustrialLayoutFinalizeMode;
  kerfMm: number;
  marginMm: number;
  /** Chapa física (dimensões totais antes do recorte de margem interna). */
  physicalSheet: SheetDefinition;
  /**
   * Área útil do solver (physicalSheet − 2×margin).
   * Obrigatória para offset de margem em mode=full.
   */
  usableSheet?: SheetDefinition;
  /** Espelha placements para TRO após offset (delegado via deps — não altera TCN aqui). */
  originTopRight?: boolean;
  /** Pocket filling antes da compactação (apenas mode=full). */
  pocketFilling?: IndustrialLayoutPocketFillingProfile;
  /** Reverte pocket fill SPM se misturar corpo/portas (comportamento layoutPipeline). */
  spmDoorBodyGuard?: boolean;
};

export type IndustrialLayoutFinalizeDeps = {
  /**
   * Normalização top-right injectada pelo pipeline (ex.: normalizeSheetToTopRightOrigin).
   * Mantém computeTcnReadyHoles fora deste módulo.
   */
  normalizeTopRightOrigin?: (sheetResult: SheetResult) => SheetResult;
};

export type IndustrialLayoutValidateOptions = {
  kerfMm: number;
  marginMm: number;
  physicalSheet: SheetDefinition;
  /** Referencial das coordenadas em result.sheets[].placements. */
  coordinateFrame: IndustrialLayoutCoordinateFrame;
  /** Área útil do solver; obrigatório quando coordinateFrame === 'solver-usable'. */
  usableSheet?: SheetDefinition;
};

export type IndustrialLayoutValidationIssueCode =
  | "sheet-out-of-range"
  | "placement-outside-sheet"
  | "placement-overlap"
  | "empty-sheet-with-placements";

export type IndustrialLayoutValidationIssue = {
  code: IndustrialLayoutValidationIssueCode;
  message: string;
  sheetIndex: number;
  partName?: string;
  boxId?: string;
};

export type IndustrialLayoutValidationResult = {
  valid: boolean;
  issues: IndustrialLayoutValidationIssue[];
};

function pocketFillingOptionsForProfile(profile: IndustrialLayoutPocketFillingProfile): PocketFillingOptions | null {
  if (profile === "none") return null;
  if (profile === "spm") {
    return {
      lateIndexThreshold: 0,
      wasteThreshold: 0.15,
      spmLock: {
        stableDestThreshold: 0.12,
        minTotalWasteImprovement: 0.05,
      },
    };
  }
  return {
    lateIndexThreshold: 0,
    wasteThreshold: 0.12,
  };
}

function sheetHasDoorBodyMix(placements: CutPlacement[]): boolean {
  const hasDoor = placements.some((p) => DOOR_PATTERN.test(p.partName ?? ""));
  const hasBody = placements.some((p) => !DOOR_PATTERN.test(p.partName ?? ""));
  return hasDoor && hasBody;
}

function applySpmDoorBodyGuard(before: SheetResult[], after: SheetResult[]): SheetResult[] {
  const preMixed = before.some((s) => sheetHasDoorBodyMix(s.placements));
  const postMixed = after.some((s) => sheetHasDoorBodyMix(s.placements));
  if (!preMixed && postMixed) return cloneSheets(before);
  return after;
}

function boundsForFrame(
  frame: IndustrialLayoutCoordinateFrame,
  physicalSheet: SheetDefinition,
  marginMm: number,
  usableSheet?: SheetDefinition
): SheetDefinition {
  if (frame === "physical") return physicalSheet;
  if (usableSheet) return usableSheet;
  return {
    ...physicalSheet,
    largura_mm: Math.max(1, physicalSheet.largura_mm - marginMm * 2),
    altura_mm: Math.max(1, physicalSheet.altura_mm - marginMm * 2),
  };
}

function validateSheetPlacements(
  sheetIndex: number,
  placements: CutPlacement[],
  sheetBounds: SheetDefinition,
  kerfMm: number,
  issues: IndustrialLayoutValidationIssue[]
): void {
  if (placements.length === 0) return;

  const rects: Array<{ x: number; y: number; w: number; h: number }> = [];

  for (const pl of placements) {
    const inside = isInsideSheet(pl.x_mm, pl.y_mm, pl.largura_mm, pl.altura_mm, sheetBounds);
    if (!inside) {
      issues.push({
        code: "placement-outside-sheet",
        message: `Peça fora dos limites da chapa (sheet ${sheetIndex}).`,
        sheetIndex,
        partName: pl.partName,
        boxId: pl.boxId,
      });
      continue;
    }

    if (overlaps(pl.x_mm, pl.y_mm, pl.largura_mm, pl.altura_mm, rects, kerfMm)) {
      issues.push({
        code: "placement-overlap",
        message: `Sobreposição detectada (kerf ${kerfMm} mm, sheet ${sheetIndex}).`,
        sheetIndex,
        partName: pl.partName,
        boxId: pl.boxId,
      });
    }

    rects.push({ x: pl.x_mm, y: pl.y_mm, w: pl.largura_mm, h: pl.altura_mm });
  }
}

/**
 * Valida um CutLayoutResult contra margem, limites de chapa e colisões (kerf).
 * Não altera posições, rotações nem furos.
 */
export function validateIndustrialLayout(
  result: CutLayoutResult,
  opts: IndustrialLayoutValidateOptions
): IndustrialLayoutValidationResult {
  const issues: IndustrialLayoutValidationIssue[] = [];
  const bounds = boundsForFrame(opts.coordinateFrame, opts.physicalSheet, opts.marginMm, opts.usableSheet);

  result.sheets.forEach((sr, sheetIndex) => {
    const placements = sr.placements ?? [];
    if (placements.length === 0) return;

    const sheetDef = sr.sheet ?? opts.physicalSheet;
    if (
      sheetDef.largura_mm + EPS < bounds.largura_mm - EPS ||
      sheetDef.altura_mm + EPS < bounds.altura_mm - EPS
    ) {
      // Apenas informativo quando sheet metadata diverge do frame esperado
    }

    validateSheetPlacements(sheetIndex, placements, bounds, opts.kerfMm, issues);
  });

  return { valid: issues.length === 0, issues };
}

/**
 * Finaliza um layout para consumo industrial (PDF, etiquetas, TCN downstream).
 *
 * - mode=full: pocket filling (opcional) → compactação → offset margem → TRO (opcional, via deps).
 * - mode=preserve-positions: devolve clone sem mover peças (validação separada via validateIndustrialLayout).
 */
export function finalizeIndustrialLayout(
  result: CutLayoutResult,
  opts: IndustrialLayoutFinalizeOptions,
  deps: IndustrialLayoutFinalizeDeps = {}
): CutLayoutResult {
  if (opts.mode === "preserve-positions") {
    const sheets = cloneSheets(result.sheets);
    applyRotationGeometryToSheets(sheets);
    return {
      ...result,
      sheets,
    };
  }

  let sheets = cloneSheets(result.sheets);
  const profile = opts.pocketFilling ?? "none";
  const pocketOpts = pocketFillingOptionsForProfile(profile);

  if (pocketOpts && sheets.length > 0) {
    const before = cloneSheets(sheets);
    sheets = aplicarPocketFilling(sheets, opts.kerfMm, pocketOpts);
    if (opts.spmDoorBodyGuard && profile === "spm") {
      sheets = applySpmDoorBodyGuard(before, sheets);
    }
  }

  sheets = aplicarCompactacaoTranslacional(sheets, opts.kerfMm);

  sheets = applyFixedMarginOffset(sheets, opts.physicalSheet, opts.marginMm);

  applyRotationGeometryToSheets(sheets);

  if (opts.originTopRight && deps.normalizeTopRightOrigin) {
    sheets = sheets.map((s) => deps.normalizeTopRightOrigin!(s));
  }

  return {
    ...result,
    sheets,
  };
}
