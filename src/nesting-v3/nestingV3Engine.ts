/**
 * Nesting V3 — Motor de auto-distribuição simples.
 *
 * Algoritmo: Shelf-Packing greedy (peças maiores primeiro).
 * Modular e preparado para substituição futura por IA.
 * Completamente independente do motor industrial existente.
 */

import type { V3Piece, V3Sheet, V3Placement, V3AutoLayoutResult } from "./nestingV3Types";
import type { NestingV3Settings } from "./nestingV3Settings";
import { allowRotationForPiece } from "./nestingV3Settings";
import { runHybridNesting } from "../core/nesting3/hybridNesting";
import type { Nesting3Piece, Nesting3Sheet } from "../core/nesting3/nesting3Types";

// ── Dimensões efectivas de uma peça com rotação ───────────────────────────────

function effectiveDims(piece: V3Piece): { w: number; h: number } {
  const rotated = piece.rotation === 90 || piece.rotation === 270;
  return rotated
    ? { w: piece.heightMm, h: piece.widthMm }
    : { w: piece.widthMm, h: piece.heightMm };
}

// ── Shelf row ─────────────────────────────────────────────────────────────────

// ── Auto-layout principal ─────────────────────────────────────────────────────

/**
 * Distribui as peças nos sheets disponíveis usando shelf-packing.
 * - Peças ordenadas por área (maior primeiro).
 * - Nova shelf quando não cabe na actual.
 * - Novo sheet quando o actual está cheio.
 * - Cria novos sheets automaticamente se necessário.
 */
export function runNestingV3AutoLayout(
  pieces: V3Piece[],
  sheets: V3Sheet[],
  settings: NestingV3Settings
): V3AutoLayoutResult {
  if (pieces.length === 0) return { placements: [], unplacedPieceIds: [], sheetsUsed: 0 };
  const margin = settings.marginMm;
  const kerfMm = settings.kerfMm;
  const nestingPieces: Nesting3Piece[] = pieces.map((piece, index) => ({
    id: piece.id,
    widthMm: piece.widthMm,
    heightMm: piece.heightMm,
    materialId: piece.materialId,
    materialName: piece.materialName,
    thicknessMm: piece.thicknessMm,
    allowRotation: allowRotationForPiece(piece, settings),
    grainDirection: "none",
    originalIndex: index,
  }));
  const fallbackSheet: V3Sheet = {
    index: 0,
    widthMm: settings.sheetWidthMm,
    heightMm: settings.sheetHeightMm,
    thicknessMm: settings.sheetThicknessMm,
  };
  const nestingSheets: Nesting3Sheet[] = (sheets.length ? sheets : [fallbackSheet]).map((sheet) => ({
    index: sheet.index,
    widthMm: Math.max(1, sheet.widthMm - margin * 2),
    heightMm: Math.max(1, sheet.heightMm - margin * 2),
    materialId: sheet.materialId,
    materialName: sheet.materialName,
    thicknessMm: sheet.thicknessMm,
  }));
  const result = runHybridNesting(nestingPieces, nestingSheets, { kerfMm });
  const placements: V3Placement[] = result.placements.map((placement) => ({
    pieceId: placement.pieceId,
    sheetIndex: placement.sheetIndex,
    xMm: placement.xMm + margin,
    yMm: placement.yMm + margin,
    rotated: placement.rotated === true,
  }));
  return {
    placements,
    unplacedPieceIds: result.unplacedPieceIds,
    sheetsUsed: result.sheetsUsed,
  };
}

// ── Verificar sobreposição ────────────────────────────────────────────────────

export function hasOverlap(
  p: V3Placement,
  pw: number,
  ph: number,
  others: Array<{ pl: V3Placement; w: number; h: number }>,
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

// ── Calcular utilização de um sheet ──────────────────────────────────────────

export function calcSheetUtilization(
  sheetIndex: number,
  sheet: V3Sheet,
  placements: V3Placement[],
  pieces: V3Piece[]
): number {
  const sheetArea = sheet.widthMm * sheet.heightMm;
  if (sheetArea === 0) return 0;
  const usedArea = placements
    .filter((p) => p.sheetIndex === sheetIndex)
    .reduce((sum, p) => {
      const piece = pieces.find((pc) => pc.id === p.pieceId);
      if (!piece) return sum;
      const { w, h } = effectiveDims(piece);
      return sum + w * h;
    }, 0);
  return Math.min(100, (usedArea / sheetArea) * 100);
}

// ── Rodar furos com a peça ────────────────────────────────────────────────────

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

// ── Cor determinística por material ──────────────────────────────────────────

const MATERIAL_COLORS: Record<string, string> = {
  mdf_branco: "#e8e4df",
  carvalho:   "#c4934a",
  nogueira:   "#7a4f2e",
  melamina:   "#d4cec9",
};

const FALLBACK_COLORS = ["#c4934a", "#8fb4c8", "#a8c48a", "#c4a4a4", "#b8a8c4", "#9ab8a4"];

export function getPieceColor(materialId?: string, pieceIndex = 0): string {
  if (materialId) {
    const key = Object.keys(MATERIAL_COLORS).find((k) =>
      materialId.toLowerCase().includes(k)
    );
    if (key) return MATERIAL_COLORS[key];
  }
  return FALLBACK_COLORS[pieceIndex % FALLBACK_COLORS.length];
}
