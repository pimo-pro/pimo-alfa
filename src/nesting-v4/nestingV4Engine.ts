/**
 * Nesting V4 — Motor de auto-distribuição visual/análise.
 *
 * Consome `runCutLayout` (SSOT geométrico) com perfis PRO ou Experimental.
 * Não altera o writer TCN «mo» nem o pipeline CNC de produção.
 * Removido: hybridNesting legado.
 */

import type { V4Piece, V4Sheet, V4Placement, V4AutoLayoutResult, NestingV4State } from "./nestingV4Types";
import type { NestingV4Settings, NestingV4EngineId } from "./nestingV4Settings";
import { runCutLayout } from "../core/cutlayout/cutLayoutEngine";
import type { CutLayoutEngineOptions, SheetDefinition } from "../core/cutlayout/cutLayoutTypes";
import {
  getDefaultCncLayoutOptions,
  getExperimentalCncLayoutOptions,
} from "../core/cnc/cncPipeline";
import { v4PiecesToCutPieces } from "../core/cutlayout/integration/v4ToCutPieces";
import { cutLayoutResultToV4State } from "../core/cutlayout/integration/cutLayoutResultToV4State";
import { defaultSheetFromSettings } from "./nestingSheetsFactory";
import { validateAndRecordInvariants } from "../core/invariants/integration/invariantContract";
import { defaultState } from "../context/projectState";
import { resolveNestingV4Rules } from "./rules/nestingV4Rules";
import { runDeepnestAutoLayout } from "./deepnestEngine/deepnestEngine";

function sheetDefinitionFromV4Sheet(sheet: V4Sheet): SheetDefinition {
  return {
    largura_mm: sheet.widthMm,
    altura_mm: sheet.heightMm,
    espessura_mm: sheet.thicknessMm,
    materialId: sheet.materialId,
    materialName: sheet.materialName,
  };
}

function baseOptionsForEngine(
  engine: NestingV4EngineId,
  sheetDef: SheetDefinition
): CutLayoutEngineOptions {
  // deepnest não usa cutLayout — ramo só para PRO / Experimental
  return engine === "experimental"
    ? getExperimentalCncLayoutOptions(sheetDef)
    : getDefaultCncLayoutOptions(sheetDef);
}

function buildVisualLayoutOptions(
  sheetDef: SheetDefinition,
  settings: NestingV4Settings
): CutLayoutEngineOptions {
  const rules = resolveNestingV4Rules();
  const engineId = settings.nestingEngine ?? rules.defaultEngine;
  const engine: NestingV4EngineId = engineId === "deepnest" ? "pro" : engineId;
  const base = baseOptionsForEngine(engine, sheetDef);
  const kerf = settings.kerfMm > 0 ? settings.kerfMm : rules.kerfMm;
  const rotationPreferenceMode =
    settings.rotationMode === "none" ? "disabled" : settings.rotationMode === "free" ? "aggressive" : "auto";

  return {
    ...base,
    kerf_mm: kerf,
    sheetLargura_mm: sheetDef.largura_mm,
    sheetAltura_mm: sheetDef.altura_mm,
    originTopRight: false,
    collectDiagnostics: true,
    rotationPreferenceMode:
      settings.rotationMode === "none"
        ? "disabled"
        : (base.rotationPreferenceMode ?? rotationPreferenceMode),
    minUtilizationPercent:
      settings.priorityMode === "waste"
        ? Math.max(base.minUtilizationPercent ?? 0.85, rules.compaction.minUtilizationPercent)
        : base.minUtilizationPercent,
  };
}

/**
 * Pipeline visual V4:
 * v4ToCutPieces → runCutLayout (PRO|Experimental) → cutLayoutResultToV4State
 */
export function runV4IndustrialAutoLayoutPipeline(baseState: NestingV4State): V4AutoLayoutResult {
  const { pieces, sheets, settings } = baseState;
  const activeSheets = sheets.length > 0 ? sheets : [defaultSheetFromSettings(settings)];
  const cutPieces = v4PiecesToCutPieces(pieces, settings);
  const primarySheet = activeSheets[0]!;
  const sheetDef = sheetDefinitionFromV4Sheet(primarySheet);
  const layoutOptions = buildVisualLayoutOptions(sheetDef, settings);

  const layoutResult = runCutLayout(cutPieces, sheetDef, layoutOptions);
  validateAndRecordInvariants({
    project: defaultState,
    layoutResult,
    phase: "cutlayout",
  });
  const newState = cutLayoutResultToV4State(layoutResult, {
    ...baseState,
    sheets: activeSheets,
  });

  return {
    placements: newState.placements,
    unplacedPieceIds: newState.unplacedPieceIds,
    sheetsUsed: newState.sheets.length,
    sheets: newState.sheets,
    pieces: newState.pieces,
    selectedStrategy: layoutResult.diagnostics?.flow.selectedStrategy,
    selectedBinHeuristic: layoutResult.diagnostics?.flow.selectedBinHeuristic,
  };
}

/** Auto-layout canónico V4 — PRO / Experimental (cutLayout) ou Deepnest (GA+NFP). */
export function runNestingV4AutoLayout(
  pieces: V4Piece[],
  sheets: V4Sheet[],
  settings: NestingV4Settings
): V4AutoLayoutResult {
  if (pieces.length === 0) return { placements: [], unplacedPieceIds: [], sheetsUsed: 0 };

  const activeSheets = sheets.length > 0 ? sheets : [defaultSheetFromSettings(settings)];

  if (settings.nestingEngine === "deepnest") {
    return runDeepnestAutoLayout(pieces, activeSheets, settings);
  }

  const baseState: NestingV4State = {
    sheets: activeSheets,
    pieces,
    placements: [],
    unplacedPieceIds: pieces.map((p) => p.id),
    settings,
    kerfMm: settings.kerfMm,
    activeSheetIndex: 0,
  };

  return runV4IndustrialAutoLayoutPipeline(baseState);
}

export function hasOverlap(
  p: V4Placement,
  pw: number,
  ph: number,
  others: Array<{ pl: V4Placement; w: number; h: number }>,
  kerfMm: number
): boolean {
  const margin = kerfMm * 0.5;
  for (const { pl, w, h } of others) {
    if (pl.sheetIndex !== p.sheetIndex) continue;
    const overlapX = p.xMm + pw > pl.xMm + margin && pl.xMm + w > p.xMm + margin;
    const overlapY = p.yMm + ph > pl.yMm + margin && pl.yMm + h > p.yMm + margin;
    if (overlapX && overlapY) return true;
  }
  return false;
}

export function calcSheetUtilization(
  sheetIndex: number,
  sheet: V4Sheet,
  placements: V4Placement[],
  pieces: V4Piece[]
): number {
  const sheetArea = sheet.widthMm * sheet.heightMm;
  if (sheetArea === 0) return 0;
  const usedArea = placements
    .filter((p) => p.sheetIndex === sheetIndex)
    .reduce((sum, p) => {
      const piece = pieces.find((pc) => pc.id === p.pieceId);
      if (!piece) return sum;
      const rotated = piece.rotation === 90 || piece.rotation === 270;
      const w = rotated ? piece.heightMm : piece.widthMm;
      const h = rotated ? piece.widthMm : piece.heightMm;
      return sum + w * h;
    }, 0);
  return Math.min(100, (usedArea / sheetArea) * 100);
}

export function calcWastePercent(
  sheetIndex: number,
  sheet: V4Sheet,
  placements: V4Placement[],
  pieces: V4Piece[]
): number {
  return Math.max(0, 100 - calcSheetUtilization(sheetIndex, sheet, placements, pieces));
}

/** Rotação de furos 0/90/180/270 — referencial local da peça (visualização). */
export function rotateHoles(
  holes: Array<{ x: number; y: number; diameter: number; depth: number; holeType?: string }>,
  rotation: 0 | 90 | 180 | 270,
  pieceWidthOriginal: number,
  pieceHeightOriginal: number
) {
  return holes.map((h) => {
    let nx = h.x;
    let ny = h.y;
    if (rotation === 90) {
      nx = h.y;
      ny = pieceWidthOriginal - h.x;
    } else if (rotation === 180) {
      nx = pieceWidthOriginal - h.x;
      ny = pieceHeightOriginal - h.y;
    } else if (rotation === 270) {
      nx = pieceHeightOriginal - h.y;
      ny = h.x;
    }
    return { ...h, x: nx, y: ny };
  });
}

const MATERIAL_COLORS: Record<string, string> = {
  mdf_branco: "#e8e4df",
  carvalho: "#c4934a",
  nogueira: "#7a4f2e",
  melamina: "#d4cec9",
};

const FALLBACK_COLORS = ["#c4934a", "#8fb4c8", "#a8c48a", "#c4a4a4", "#b8a8c4", "#9ab8a4"];

export function getPieceColor(materialId?: string, pieceIndex = 0): string {
  if (materialId) {
    const key = Object.keys(MATERIAL_COLORS).find((k) => materialId.toLowerCase().includes(k));
    if (key) return MATERIAL_COLORS[key]!;
  }
  return FALLBACK_COLORS[pieceIndex % FALLBACK_COLORS.length]!;
}
