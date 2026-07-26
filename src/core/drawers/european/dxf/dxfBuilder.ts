/**
 * dxfBuilder.ts — Agrega entidades DXF (contornos + furos + layers).
 */

import type { EuropeanDrawerResult } from "../types";
import { buildDxfGeometryContours, type DxfPieceContour } from "./dxfGeometry";
import { buildDxfDrillingEntities } from "./dxfDrilling";
import { buildDxfLayerTable, type EuropeanDxfLayerDef } from "./dxfLayers";
import type { DxfEntity } from "./dxfTypes";

export type EuropeanDxfDocument = {
  units: "mm";
  layers: EuropeanDxfLayerDef[];
  contours: DxfPieceContour[];
  entities: DxfEntity[];
  contourCount: number;
  holeEntityCount: number;
};

export function buildEuropeanDxfDocument(result: EuropeanDrawerResult): EuropeanDxfDocument {
  const layers = buildDxfLayerTable();
  const { contours, entities: geoEntities } = buildDxfGeometryContours(result);
  const { entities: drillEntities, holeEntityCount } = buildDxfDrillingEntities(result, contours);
  return {
    units: "mm",
    layers,
    contours,
    entities: [...geoEntities, ...drillEntities],
    contourCount: contours.length,
    holeEntityCount,
  };
}
