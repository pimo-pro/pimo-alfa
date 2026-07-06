import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  buildDrillCutGeometries,
  lateralDrillEntryXM,
  lateralInteriorDrillAxis,
} from "./DrillGeometryBuilder";
import type { TechnicalDrillHole } from "../../core/types";
import type { PanelType } from "./PanelFactory";

const THICKNESS_M = 0.019;

function makeLateralPanel(panelType: PanelType): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(THICKNESS_M, 0.6, 0.5);
  const mesh = new THREE.Mesh(geometry);
  mesh.name = panelType;
  return mesh;
}

describe("DrillGeometryBuilder — laterais SEP (face interior)", () => {
  it("lateralDrillEntryXM coloca entrada na face interior (+X esq., −X dir.)", () => {
    expect(lateralDrillEntryXM("left", THICKNESS_M)).toBeCloseTo(THICKNESS_M / 2, 6);
    expect(lateralDrillEntryXM("right", THICKNESS_M)).toBeCloseTo(-THICKNESS_M / 2, 6);
  });

  it("lateralInteriorDrillAxis perfura da face interior para o centro da chapa", () => {
    const leftEntry = lateralDrillEntryXM("left", THICKNESS_M);
    const rightEntry = lateralDrillEntryXM("right", THICKNESS_M);
    expect(lateralInteriorDrillAxis("left", leftEntry).x).toBeCloseTo(-1, 6);
    expect(lateralInteriorDrillAxis("right", rightEntry).x).toBeCloseTo(1, 6);
  });

  it("lateral direita: cilindro de cavilha SEP avança para o interior (+X local)", () => {
    const panel = makeLateralPanel("right");
    const hole: TechnicalDrillHole = {
      x: 100,
      y: 300,
      diametro: 10,
      profundidade: 30,
      tipo: "cavilha",
      face: "esquerda",
    };
    const geometries = buildDrillCutGeometries("right", panel, [hole]);
    expect(geometries.length).toBeGreaterThan(0);
    const main = geometries[0]!;
    main.computeBoundingBox();
    const bb = main.boundingBox;
    expect(bb).toBeTruthy();
    const centerX = (bb!.min.x + bb!.max.x) / 2;
    expect(centerX).toBeGreaterThan(-THICKNESS_M / 2);
    expect(centerX).toBeLessThan(THICKNESS_M / 2);
  });
});
