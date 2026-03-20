import type { CutPiece, CutPlacement, SheetDefinition, SheetResult } from "../cutLayoutTypes";

const EPS = 0.001;

export function getPieceArea(piece: CutPiece): number {
  return Math.max(1, piece.largura_mm * piece.altura_mm);
}

export function getPieceAspectRatio(piece: CutPiece): number {
  const a = Math.max(piece.largura_mm, piece.altura_mm);
  const b = Math.max(1, Math.min(piece.largura_mm, piece.altura_mm));
  return a / b;
}

export const isRotatablePiece = (piece: CutPiece): boolean => !piece.grainDirection && piece.largura_mm !== piece.altura_mm;

export function reorderPieces(pieces: CutPiece[], mode: "production" | "gapFill" = "production"): CutPiece[] {
  return [...pieces].sort((a, b) => {
    if (mode === "production") {
      const matA = a.materialId ?? "";
      const matB = b.materialId ?? "";
      if (matA !== matB) return matA.localeCompare(matB);
      const areaDiff = getPieceArea(b) - getPieceArea(a);
      if (areaDiff !== 0) return areaDiff;
      const bMax = Math.max(b.largura_mm, b.altura_mm);
      const aMax = Math.max(a.largura_mm, a.altura_mm);
      if (bMax !== aMax) return bMax - aMax;
      const bMin = Math.min(b.largura_mm, b.altura_mm);
      const aMin = Math.min(a.largura_mm, a.altura_mm);
      if (bMin !== aMin) return bMin - aMin;
      return getPieceAspectRatio(b) - getPieceAspectRatio(a);
    }
    const areaDiff = getPieceArea(a) - getPieceArea(b);
    if (areaDiff !== 0) return areaDiff;
    return getPieceAspectRatio(b) - getPieceAspectRatio(a);
  });
}

export function isInsideSheet(x: number, y: number, w: number, h: number, sheet: SheetDefinition): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) return false;
  if (w <= 0 || h <= 0) return false;
  if (x < -EPS || y < -EPS) return false;
  if (x + w > sheet.largura_mm + EPS) return false;
  if (y + h > sheet.altura_mm + EPS) return false;
  return true;
}

export function createUsableSheetArea(sheet: SheetDefinition, marginMm: number): SheetDefinition {
  return {
    ...sheet,
    largura_mm: Math.max(1, sheet.largura_mm - marginMm * 2),
    altura_mm: Math.max(1, sheet.altura_mm - marginMm * 2),
  };
}

export function applyFixedMarginOffset(
  sheets: SheetResult[],
  physicalSheet: SheetDefinition,
  marginMm: number
): SheetResult[] {
  return sheets.map((s, idx) => ({
    sheet: { ...physicalSheet },
    placements: s.placements.map((p) => ({
      ...p,
      x_mm: p.x_mm + marginMm,
      y_mm: p.y_mm + marginMm,
      sheetIndex: idx,
    })),
  }));
}

export function overlaps(x: number, y: number, w: number, h: number, placed: Array<{ x: number; y: number; w: number; h: number }>, kerf: number): boolean {
  const margin = kerf / 2;
  for (const r of placed) {
    if (x + w + margin > r.x - margin && r.x + r.w + margin > x - margin && y + h + margin > r.y - margin && r.y + r.h + margin > y - margin) return true;
  }
  return false;
}

export function expandPieces(pieces: CutPiece[]): CutPiece[] {
  const out: CutPiece[] = [];
  for (const p of pieces) {
    for (let i = 0; i < (p.quantidade ?? 1); i++) out.push({ ...p, quantidade: 1 });
  }
  return out;
}

export function groupByMaterialAndThickness(pieces: CutPiece[]): Map<string, CutPiece[]> {
  const map = new Map<string, CutPiece[]>();
  for (const p of pieces) {
    const key = `${p.materialId ?? "material"}|${p.espessura_mm}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return map;
}

export function groupByThicknessOnly(pieces: CutPiece[]): Map<string, CutPiece[]> {
  const map = new Map<string, CutPiece[]>();
  for (const p of pieces) {
    const key = String(p.espessura_mm);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return map;
}

export function estimateUsefulLeftover(sheet: SheetDefinition, placed: Array<{ x: number; y: number; w: number; h: number }>): number {
  if (placed.length === 0) return sheet.largura_mm * sheet.altura_mm;
  const maxX = Math.max(...placed.map((r) => r.x + r.w));
  const maxY = Math.max(...placed.map((r) => r.y + r.h));
  const rightStrip = Math.max(0, sheet.largura_mm - maxX) * sheet.altura_mm;
  const topStrip = Math.max(0, sheet.altura_mm - maxY) * sheet.largura_mm;
  return Math.max(rightStrip, topStrip);
}

export function cloneSheets(sheets: SheetResult[]): SheetResult[] {
  return sheets.map((s) => ({ sheet: { ...s.sheet }, placements: s.placements.map((p) => ({ ...p })) }));
}

export function flattenPlacements(sheets: SheetResult[]): CutPlacement[] {
  return sheets.flatMap((s, sheetIndex) => s.placements.map((p) => ({ ...p, sheetIndex })));
}

export function partitionPlacementsIntoSheets(placements: CutPlacement[], sheet: SheetDefinition): SheetResult[] {
  const groups = new Map<number, CutPlacement[]>();
  for (const p of placements) {
    if (!groups.has(p.sheetIndex)) groups.set(p.sheetIndex, []);
    groups.get(p.sheetIndex)!.push(p);
  }
  const sorted = Array.from(groups.keys()).sort((a, b) => a - b);
  return sorted.map((idx, normalizedIndex) => ({
    sheet: { ...sheet },
    placements: (groups.get(idx) ?? []).map((p) => ({ ...p, sheetIndex: normalizedIndex })),
  }));
}

export function layoutFromPlacements(
  placements: CutPlacement[],
  sheet: SheetDefinition
): { sheets: SheetResult[]; rejectedByLimit: Array<{ partName: string; boxId: string; largura_mm: number; altura_mm: number; reason: string }> } {
  const rejectedByLimit: Array<{ partName: string; boxId: string; largura_mm: number; altura_mm: number; reason: string }> = [];
  const grouped = partitionPlacementsIntoSheets(placements, sheet);
  const validSheets: SheetResult[] = [];
  for (const s of grouped) {
    const valid: CutPlacement[] = [];
    const rects: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (const p of s.placements) {
      const inside = isInsideSheet(p.x_mm, p.y_mm, p.largura_mm, p.altura_mm, sheet);
      const collides = overlaps(p.x_mm, p.y_mm, p.largura_mm, p.altura_mm, rects, 0);
      if (!inside || collides) {
        rejectedByLimit.push({
          partName: p.partName,
          boxId: p.boxId,
          largura_mm: p.largura_mm,
          altura_mm: p.altura_mm,
          reason: !inside ? "meta-outside-sheet" : "meta-overlap",
        });
        continue;
      }
      valid.push(p);
      rects.push({ x: p.x_mm, y: p.y_mm, w: p.largura_mm, h: p.altura_mm });
    }
    if (valid.length > 0) {
      validSheets.push({ sheet: { ...sheet }, placements: valid.map((p) => ({ ...p, sheetIndex: validSheets.length })) });
    }
  }
  return { sheets: validSheets, rejectedByLimit };
}
