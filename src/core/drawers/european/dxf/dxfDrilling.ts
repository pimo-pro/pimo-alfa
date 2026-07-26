/**
 * dxfDrilling.ts — Círculos DXF a partir dos furos existentes (somente leitura).
 */

import type { EuropeanDrawerHole, EuropeanDrawerResult } from "../types";
import type { DxfCircleEntity, DxfEntity } from "./dxfTypes";
import type { DxfPieceContour } from "./dxfGeometry";

function mapHoleToContour(
  hole: EuropeanDrawerHole,
  contours: DxfPieceContour[]
): DxfPieceContour | undefined {
  const ref = (hole.pieceRef || "").toLowerCase();
  const find = (...keys: string[]) =>
    contours.find((c) => keys.some((k) => c.pieceCode.includes(k) || ref.includes(k)));

  if (ref.includes("fren") || ref === "front") return find("gav_fren");
  if (ref.includes("fre_int") || ref.includes("front_int")) return find("gav_fre_int");
  if (ref.includes("lat_esq")) return find("gav_lat_esq");
  if (ref.includes("lat_dir")) return find("gav_lat_dir");
  if (ref.includes("costa") || ref === "back") return find("gav_costa");
  if (ref.includes("fun") || ref === "bottom") return find("gav_fun");
  return undefined;
}

/**
 * Gera entidades CIRCLE no layer DRILLING. Profundidade fica em metadata.
 * Furos de módulo (module_lat_*) são documentados sem contorno de peça.
 */
export function buildDxfDrillingEntities(
  result: EuropeanDrawerResult,
  contours: DxfPieceContour[]
): { entities: DxfEntity[]; holeEntityCount: number; skippedModule: number } {
  const entities: DxfEntity[] = [];
  let skippedModule = 0;

  for (const h of result.holes) {
    const ref = h.pieceRef || "";
    if (ref.startsWith("module_")) {
      skippedModule += 1;
      // Ainda exportamos no space absoluto 0,0 relativo ao ref (metadata)
      const circle: DxfCircleEntity = {
        type: "CIRCLE",
        layer: "DRILLING",
        center: { x: h.x, y: h.y },
        radius: Math.max(0, h.diameter / 2),
        depthMm: h.depth,
        diameterMm: h.diameter,
        pieceCode: ref,
        holeType: h.holeType,
      };
      entities.push(circle);
      continue;
    }

    const contour = mapHoleToContour(h, contours);
    const ox = contour?.origin.x ?? 0;
    const oy = contour?.origin.y ?? 0;
    const circle: DxfCircleEntity = {
      type: "CIRCLE",
      layer: "DRILLING",
      center: { x: ox + h.x, y: oy + h.y },
      radius: Math.max(0, h.diameter / 2),
      depthMm: h.depth,
      diameterMm: h.diameter,
      pieceCode: contour?.pieceCode ?? ref,
      holeType: h.holeType,
    };
    entities.push(circle);
  }

  return { entities, holeEntityCount: entities.length, skippedModule };
}
