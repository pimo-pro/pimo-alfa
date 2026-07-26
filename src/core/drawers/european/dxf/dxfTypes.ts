/**
 * Tipos base de entidades DXF internas (em memória).
 */

import type { EuropeanDxfLayerName } from "./dxfLayers";

export type DxfPoint2 = { x: number; y: number };

export type DxfLineEntity = {
  type: "LINE";
  layer: EuropeanDxfLayerName;
  start: DxfPoint2;
  end: DxfPoint2;
  pieceCode?: string;
};

export type DxfCircleEntity = {
  type: "CIRCLE";
  layer: EuropeanDxfLayerName;
  center: DxfPoint2;
  radius: number;
  /** Profundidade do furo (mm) — metadata, não gráfica. */
  depthMm?: number;
  diameterMm?: number;
  pieceCode?: string;
  holeType?: string;
};

export type DxfTextEntity = {
  type: "TEXT";
  layer: EuropeanDxfLayerName;
  position: DxfPoint2;
  height: number;
  value: string;
  pieceCode?: string;
};

export type DxfEntity = DxfLineEntity | DxfCircleEntity | DxfTextEntity;

export function rectContour(
  x: number,
  y: number,
  w: number,
  h: number,
  layer: EuropeanDxfLayerName,
  pieceCode?: string
): DxfLineEntity[] {
  const x2 = x + w;
  const y2 = y + h;
  const mk = (start: DxfPoint2, end: DxfPoint2): DxfLineEntity => ({
    type: "LINE",
    layer,
    start,
    end,
    pieceCode,
  });
  return [
    mk({ x, y }, { x: x2, y }),
    mk({ x: x2, y }, { x: x2, y: y2 }),
    mk({ x: x2, y: y2 }, { x, y: y2 }),
    mk({ x, y: y2 }, { x, y }),
  ];
}

export function dimensionPair(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  label: string,
  layer: EuropeanDxfLayerName = "DIMENSIONS"
): DxfEntity[] {
  return [
    { type: "LINE", layer, start: { x: x0, y: y0 }, end: { x: x1, y: y1 } },
    {
      type: "TEXT",
      layer,
      position: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 },
      height: 8,
      value: label,
    },
  ];
}
