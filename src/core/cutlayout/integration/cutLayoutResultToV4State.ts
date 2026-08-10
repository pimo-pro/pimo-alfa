/**
 * CutLayoutResult → NestingV4State (placements TL + rotações).
 */

import type { CutLayoutResult, CutPlacement } from "../cutLayoutTypes";
import type { NestingV4State, V4Piece, V4Placement, V4Sheet } from "../../../nesting-v4/nestingV4Types";
import { cutPlacementToV3Placement } from "./layoutCoordinateAdapter";

function normalizeV4Rotation(rotacao: number): 0 | 90 | 180 | 270 {
  const r = ((Math.round(rotacao) % 360) + 360) % 360;
  if (r === 90) return 90;
  if (r === 180) return 180;
  if (r === 270) return 270;
  return 0;
}

function resolveV4PieceId(pl: CutPlacement, pieces: V4Piece[]): string | null {
  const fromMeta = pl.metadata?.v4PieceId ?? pl.metadata?.v3PieceId;
  if (typeof fromMeta === "string" && fromMeta.length > 0) return fromMeta;
  const match = pieces.find(
    (p) => p.name === pl.partName && (p.sourceBoxId ?? p.id) === pl.boxId
  );
  return match?.id ?? null;
}

export function cutLayoutResultToV4State(result: CutLayoutResult, baseState: NestingV4State): NestingV4State {
  const piecesById = new Map(baseState.pieces.map((p) => [p.id, { ...p }]));
  const placedIds = new Set<string>();
  const placements: V4Placement[] = [];

  const sheets: V4Sheet[] = result.sheets.map((sr, index) => ({
    index,
    widthMm: sr.sheet.largura_mm,
    heightMm: sr.sheet.altura_mm,
    thicknessMm: sr.sheet.espessura_mm,
    materialId: sr.sheet.materialId,
    materialName: sr.sheet.materialName,
  }));

  result.sheets.forEach((sr, sheetIndex) => {
    const sheetHeight = sr.sheet.altura_mm;
    for (const pl of sr.placements) {
      const pieceId = resolveV4PieceId(pl, baseState.pieces);
      if (!pieceId) continue;

      const v3Pl = cutPlacementToV3Placement(
        { ...pl, sheetIndex, metadata: { ...pl.metadata, v3PieceId: pieceId, v4PieceId: pieceId } },
        sheetHeight
      );
      placements.push({ ...v3Pl, pieceId, sheetIndex });

      const piece = piecesById.get(pieceId);
      if (piece) {
        piece.rotation = normalizeV4Rotation(pl.rotacao);
        placedIds.add(pieceId);
      }
    }
  });

  const unplacedPieceIds = baseState.pieces
    .filter((p) => !placedIds.has(p.id))
    .map((p) => p.id);

  return {
    ...baseState,
    sheets: sheets.length > 0 ? sheets : baseState.sheets,
    pieces: Array.from(piecesById.values()),
    placements,
    unplacedPieceIds,
    activeSheetIndex: Math.min(baseState.activeSheetIndex, Math.max(0, sheets.length - 1)),
  };
}

/** @deprecated alias */
export const cutLayoutResultToV3State = cutLayoutResultToV4State;
