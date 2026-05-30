/**
 * Nesting V3 — Motor de auto-distribuição simples.
 *
 * Algoritmo: Shelf-Packing greedy (peças maiores primeiro).
 * Modular e preparado para substituição futura por IA.
 * Completamente independente do motor industrial existente.
 */

import type { V3Piece, V3Sheet, V3Placement, V3AutoLayoutResult } from "./nestingV3Types";

// ── Dimensões efectivas de uma peça com rotação ───────────────────────────────

function effectiveDims(piece: V3Piece): { w: number; h: number } {
  const rotated = piece.rotation === 90 || piece.rotation === 270;
  return rotated
    ? { w: piece.heightMm, h: piece.widthMm }
    : { w: piece.widthMm, h: piece.heightMm };
}

// ── Shelf row ─────────────────────────────────────────────────────────────────

interface Shelf {
  x: number;
  y: number;
  height: number;
  usedWidth: number;
}

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
  kerfMm: number
): V3AutoLayoutResult {
  if (pieces.length === 0) return { placements: [], unplacedPieceIds: [], sheetsUsed: 0 };

  // Ordenar por área descendente
  const sorted = [...pieces].sort((a, b) => {
    const aA = effectiveDims(a);
    const bA = effectiveDims(b);
    return bA.w * bA.h - aA.w * aA.h;
  });

  const placements: V3Placement[] = [];
  const unplaced: string[] = [];
  const sheetCount = sheets.length > 0 ? sheets.length : 1;
  const templateSheet = sheets[0] ?? { widthMm: 2800, heightMm: 2070, thicknessMm: 19 };

  // Ensure at least enough sheets (will add more if needed)
  const activeSheets = [...sheets];
  while (activeSheets.length < sheetCount) {
    activeSheets.push({ ...templateSheet, index: activeSheets.length });
  }

  // Per-sheet shelf state
  const shelves: Shelf[][] = activeSheets.map(() => []);
  let currentSheetIdx = 0;

  for (const piece of sorted) {
    const { w: pw, h: ph } = effectiveDims(piece);
    let placed = false;

    // Try to place in current and subsequent sheets
    for (let si = currentSheetIdx; si < activeSheets.length + 10; si++) {
      // Extend sheets if needed
      if (si >= activeSheets.length) {
        activeSheets.push({ ...templateSheet, index: activeSheets.length });
        shelves.push([]);
      }

      const sheet = activeSheets[si];
      const sheetW = sheet.widthMm;
      const sheetH = sheet.heightMm;
      const sf = shelves[si];

      // Try existing shelves
      let bestShelf: Shelf | null = null;
      for (const shelf of sf) {
        const remainWidth = sheetW - shelf.usedWidth - (shelf.usedWidth > 0 ? kerfMm : 0);
        if (
          pw + kerfMm <= remainWidth + kerfMm &&
          ph <= shelf.height &&
          pw <= sheetW &&
          shelf.y + ph <= sheetH
        ) {
          if (!bestShelf || shelf.height < bestShelf.height) {
            bestShelf = shelf;
          }
        }
      }

      if (bestShelf) {
        const xOff = bestShelf.usedWidth > 0 ? kerfMm : 0;
        placements.push({
          pieceId: piece.id,
          sheetIndex: si,
          xMm: bestShelf.x + bestShelf.usedWidth + xOff,
          yMm: bestShelf.y,
        });
        bestShelf.usedWidth += pw + xOff;
        placed = true;
        break;
      }

      // Start new shelf on this sheet
      const lastShelf = sf.length > 0 ? sf[sf.length - 1] : null;
      const newY = lastShelf ? lastShelf.y + lastShelf.height + kerfMm : 0;

      if (pw <= sheetW && newY + ph <= sheetH) {
        const newShelf: Shelf = { x: 0, y: newY, height: ph, usedWidth: pw };
        sf.push(newShelf);
        placements.push({ pieceId: piece.id, sheetIndex: si, xMm: 0, yMm: newY });
        placed = true;
        break;
      }
    }

    if (!placed) {
      unplaced.push(piece.id);
    }
  }

  const sheetsUsed = placements.reduce((max, p) => Math.max(max, p.sheetIndex + 1), 0);
  return { placements, unplacedPieceIds: unplaced, sheetsUsed };
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
