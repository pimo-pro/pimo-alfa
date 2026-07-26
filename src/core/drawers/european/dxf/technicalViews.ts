/**
 * technicalViews.ts — Vistas industriais 2D (estrutura JSON).
 */

import type { EuropeanDrawerResult } from "../types";
import { buildDxfGeometryContours } from "./dxfGeometry";
import { buildDxfDrillingEntities } from "./dxfDrilling";
import type { DxfEntity } from "./dxfTypes";
import { dimensionPair, rectContour } from "./dxfTypes";

export type EuropeanTechnicalViewId =
  | "front"
  | "side_right"
  | "side_left"
  | "top"
  | "exploded";

export type EuropeanTechnicalView = {
  id: EuropeanTechnicalViewId;
  title: string;
  widthMm: number;
  heightMm: number;
  industrialCodes: string[];
  measures: Array<{ label: string; valueMm: number }>;
  entities: DxfEntity[];
};

function codesFromResult(result: EuropeanDrawerResult): string[] {
  return [
    ...new Set(
      result.cutlist
        .filter((i) => i.kind === "wood" || i.tipo === "gaveta_corpo")
        .map((i) => i.codigo)
        .filter((c): c is string => Boolean(c))
    ),
  ];
}

export function buildFrontView(result: EuropeanDrawerResult): EuropeanTechnicalView {
  const g = result.geometry;
  const w = g.front.widthMm;
  const h = g.front.heightMm;
  const entities: DxfEntity[] = [
    ...rectContour(0, 0, w, h, "FRONT", "gav_fren"),
    ...rectContour(0, 0, w, h, "CUT", "gav_fren"),
    ...dimensionPair(0, -15, w, -15, `${Math.round(w)} mm`),
    ...dimensionPair(-15, 0, -15, h, `${Math.round(h)} mm`),
    {
      type: "TEXT",
      layer: "DIMENSIONS",
      position: { x: 4, y: h + 8 },
      height: 10,
      value: "gav_fren — vista frontal",
      pieceCode: "gav_fren",
    },
  ];
  for (const hole of result.holes.filter(
    (hh) => hh.pieceRef.includes("fren") || hh.pieceRef === "front"
  )) {
    entities.push({
      type: "CIRCLE",
      layer: "DRILLING",
      center: { x: hole.x, y: hole.y },
      radius: Math.max(0, hole.diameter / 2),
      depthMm: hole.depth,
      diameterMm: hole.diameter,
      pieceCode: "gav_fren",
      holeType: hole.holeType,
    });
  }
  return {
    id: "front",
    title: "Vista frontal",
    widthMm: w,
    heightMm: h,
    industrialCodes: ["gav_fren"],
    measures: [
      { label: "largura", valueMm: w },
      { label: "altura", valueMm: h },
      { label: "espessura", valueMm: g.front.thicknessMm },
    ],
    entities,
  };
}

export function buildSideView(
  result: EuropeanDrawerResult,
  side: "right" | "left" = "right"
): EuropeanTechnicalView {
  const g = result.geometry;
  const piece = side === "right" ? g.rightSide : g.leftSide;
  const code = side === "right" ? "gav_lat_dir" : "gav_lat_esq";
  const w = piece.depthMm;
  const h = piece.heightMm;
  const entities: DxfEntity[] = [
    ...rectContour(0, 0, w, h, "SIDES", code),
    ...rectContour(0, 0, w, h, "CUT", code),
    ...dimensionPair(0, -15, w, -15, `${Math.round(w)} mm`),
    ...dimensionPair(-15, 0, -15, h, `${Math.round(h)} mm`),
    {
      type: "TEXT",
      layer: "DIMENSIONS",
      position: { x: 4, y: h + 8 },
      height: 10,
      value: `${code} — vista lateral ${side === "right" ? "direita" : "esquerda"}`,
      pieceCode: code,
    },
  ];
  for (const hole of result.holes.filter((hh) => hh.pieceRef.includes(code) || hh.pieceRef.includes(side === "right" ? "lat_dir" : "lat_esq"))) {
    entities.push({
      type: "CIRCLE",
      layer: "DRILLING",
      center: { x: hole.x, y: hole.y },
      radius: Math.max(0, hole.diameter / 2),
      depthMm: hole.depth,
      diameterMm: hole.diameter,
      pieceCode: code,
      holeType: hole.holeType,
    });
  }
  return {
    id: side === "right" ? "side_right" : "side_left",
    title: side === "right" ? "Vista lateral direita" : "Vista lateral esquerda",
    widthMm: w,
    heightMm: h,
    industrialCodes: [code],
    measures: [
      { label: "profundidade", valueMm: w },
      { label: "altura", valueMm: h },
      { label: "espessura", valueMm: piece.thicknessMm },
    ],
    entities,
  };
}

export function buildTopView(result: EuropeanDrawerResult): EuropeanTechnicalView {
  const g = result.geometry;
  const w = g.externalWidthMm;
  const d = g.bodyDepthMm;
  const entities: DxfEntity[] = [
    ...rectContour(0, 0, w, d, "BOTTOM", "gav_fun"),
    ...rectContour(0, 0, w, d, "CUT", "corpo"),
    ...dimensionPair(0, -15, w, -15, `${Math.round(w)} mm`),
    ...dimensionPair(-15, 0, -15, d, `${Math.round(d)} mm`),
    {
      type: "TEXT",
      layer: "DIMENSIONS",
      position: { x: 4, y: d + 8 },
      height: 10,
      value: "vista superior (corpo)",
    },
  ];
  for (const hole of result.holes.filter(
    (hh) => hh.pieceRef.includes("fun") || hh.pieceRef === "bottom"
  )) {
    entities.push({
      type: "CIRCLE",
      layer: "DRILLING",
      center: { x: hole.x, y: hole.y },
      radius: Math.max(0, hole.diameter / 2),
      depthMm: hole.depth,
      diameterMm: hole.diameter,
      pieceCode: "gav_fun",
      holeType: hole.holeType,
    });
  }
  return {
    id: "top",
    title: "Vista superior",
    widthMm: w,
    heightMm: d,
    industrialCodes: ["gav_fun", "gav_lat_esq", "gav_lat_dir", "gav_costa"],
    measures: [
      { label: "largura_externa", valueMm: w },
      { label: "profundidade_corpo", valueMm: d },
      { label: "runner", valueMm: g.runnerDepthMm },
    ],
    entities,
  };
}

export function buildExplodedView(result: EuropeanDrawerResult): EuropeanTechnicalView {
  const { contours, entities: geoEntities } = buildDxfGeometryContours(result);
  const { entities: drillEntities } = buildDxfDrillingEntities(result, contours);
  const g = result.geometry;
  return {
    id: "exploded",
    title: "Vista explode (layout peças)",
    widthMm: contours.reduce((acc, c) => Math.max(acc, c.origin.x + c.widthMm), 0),
    heightMm: Math.max(...contours.map((c) => c.heightMm), g.usefulHeightMm),
    industrialCodes: codesFromResult(result),
    measures: [
      { label: "externalWidth", valueMm: g.externalWidthMm },
      { label: "bodyDepth", valueMm: g.bodyDepthMm },
      { label: "usefulHeight", valueMm: g.usefulHeightMm },
    ],
    entities: [...geoEntities, ...drillEntities],
  };
}
