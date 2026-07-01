import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  buildDrillCutGeometries,
  isLateralInteriorDrill,
  lateralDrillEntryXM,
} from "./DrillGeometryBuilder";
import type { TechnicalDrillHole } from "../../core/types";

function makeLateralPanel(thicknessM = 0.019): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(thicknessM, 0.72, 0.5));
}

describe("DrillGeometryBuilder — lateral_esquerda interior", () => {
  it("isLateralInteriorDrill força interior em left/right", () => {
    const hole = { x: 60, y: 400, diametro: 5, profundidade: 13, tipo: "prateleira" as const, face: "esquerda" as const };
    expect(isLateralInteriorDrill("left", hole)).toBe(true);
    expect(isLateralInteriorDrill("right", { ...hole, face: "direita" })).toBe(true);
  });

  it("lateralDrillEntryXM usa +X (interior) para left", () => {
    expect(lateralDrillEntryXM("left", 0.019)).toBeCloseTo(0.0095, 4);
    expect(lateralDrillEntryXM("left", 0.019)).toBeGreaterThan(0);
  });

  it("buildDrillCutGeometries coloca furo na face interior (+X) mesmo com face exterior no hole", () => {
    const panel = makeLateralPanel();
    const holes: TechnicalDrillHole[] = [
      {
        x: 60,
        y: 400,
        diametro: 5,
        profundidade: 13,
        tipo: "prateleira",
        face: "esquerda",
      },
    ];
    const cuts = buildDrillCutGeometries("left", panel, holes);
    expect(cuts.length).toBeGreaterThan(0);
    cuts[0]!.computeBoundingBox();
    const centerX = cuts[0]!.boundingBox!.getCenter(new THREE.Vector3()).x;
    expect(centerX).toBeGreaterThan(0);
  });

  it("buildDrillCutGeometries left com face direita (interior industrial) mantém +X", () => {
    const panel = makeLateralPanel();
    const holes: TechnicalDrillHole[] = [
      {
        x: 60,
        y: 400,
        diametro: 5,
        profundidade: 13,
        tipo: "dobradica_fixacao",
        face: "direita",
      },
    ];
    const cuts = buildDrillCutGeometries("left", panel, holes);
    cuts[0]!.computeBoundingBox();
    const centerX = cuts[0]!.boundingBox!.getCenter(new THREE.Vector3()).x;
    expect(centerX).toBeGreaterThan(0);
  });
});
