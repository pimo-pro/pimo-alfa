/**
 * dxfGeometry.ts — Contornos DXF a partir da geometry existente (somente leitura).
 */

import type { DrawerGeometry, DrawerPieceBox, EuropeanDrawerResult } from "../types";
import type { DxfEntity } from "./dxfTypes";
import { dimensionPair, rectContour } from "./dxfTypes";
import type { EuropeanDxfLayerName } from "./dxfLayers";

export type DxfPieceContour = {
  pieceCode: string;
  layer: EuropeanDxfLayerName;
  origin: { x: number; y: number };
  widthMm: number;
  heightMm: number;
  depthMm: number;
  thicknessMm: number;
  orientation: "XY" | "XZ" | "YZ";
  entities: DxfEntity[];
};

function pieceFaceSize(piece: DrawerPieceBox, orientation: "XY" | "XZ" | "YZ") {
  if (orientation === "XY") return { w: piece.widthMm, h: piece.heightMm };
  if (orientation === "XZ") return { w: piece.widthMm, h: piece.depthMm };
  return { w: piece.depthMm, h: piece.heightMm };
}

function buildPieceContour(
  piece: DrawerPieceBox,
  pieceCode: string,
  layer: EuropeanDxfLayerName,
  orientation: "XY" | "XZ" | "YZ",
  offsetX: number,
  offsetY: number
): DxfPieceContour {
  const { w, h } = pieceFaceSize(piece, orientation);
  const entities: DxfEntity[] = [
    ...rectContour(offsetX, offsetY, w, h, "CUT", pieceCode),
    ...rectContour(offsetX, offsetY, w, h, layer, pieceCode),
    ...dimensionPair(offsetX, offsetY - 12, offsetX + w, offsetY - 12, `${Math.round(w)}`, "DIMENSIONS"),
    ...dimensionPair(offsetX - 12, offsetY, offsetX - 12, offsetY + h, `${Math.round(h)}`, "DIMENSIONS"),
    {
      type: "TEXT",
      layer: "DIMENSIONS",
      position: { x: offsetX + 4, y: offsetY + h + 6 },
      height: 10,
      value: pieceCode,
      pieceCode,
    },
  ];
  return {
    pieceCode,
    layer,
    origin: { x: offsetX, y: offsetY },
    widthMm: w,
    heightMm: h,
    depthMm: piece.depthMm,
    thicknessMm: piece.thicknessMm,
    orientation,
    entities,
  };
}

/**
 * Gera contornos DXF das peças principais (layout em grelha 2D, sem alterar geometry).
 */
export function buildDxfGeometryContours(result: EuropeanDrawerResult): {
  contours: DxfPieceContour[];
  entities: DxfEntity[];
} {
  const geo: DrawerGeometry = result.geometry;
  const gap = 40;
  let cursorX = 0;
  const contours: DxfPieceContour[] = [];

  const push = (
    piece: DrawerPieceBox,
    code: string,
    layer: EuropeanDxfLayerName,
    orientation: "XY" | "XZ" | "YZ"
  ) => {
    const c = buildPieceContour(piece, code, layer, orientation, cursorX, 0);
    contours.push(c);
    cursorX += c.widthMm + gap;
  };

  push(geo.front, "gav_fren", "FRONT", "XY");
  if (geo.frontInt) push(geo.frontInt, "gav_fre_int", "FRONT", "XY");
  push(geo.leftSide, "gav_lat_esq", "SIDES", "YZ");
  push(geo.rightSide, "gav_lat_dir", "SIDES", "YZ");
  push(geo.back, "gav_costa", "BACK", "XY");
  push(geo.bottom, "gav_fun", "BOTTOM", "XZ");

  const entities = contours.flatMap((c) => c.entities);
  return { contours, entities };
}
