/**
 * Regressão geométrica Viewer ↔ cutlist — caso industrial H=720 T=19 SEP pos=600.
 * Garante que hole.y nas LAT (após absoluteY−T) coincide com o centro do mesh SEP.
 */
import { describe, expect, it } from "vitest";
import { buildDivSepDrilling } from "./drilling";
import { absoluteYToLateralPanelY } from "./shelfDrilling";
import {
  getDivSepInternalDims,
  resolveDivisorDimensions,
  resolveSeparadorCenterY,
} from "./dimensions";
import { resolveSeparadorBottomY } from "./coupling";
import { getDivSepMeshSpecs } from "./visualSpecs";
import {
  defaultDivisorItem,
  defaultSeparadorItem,
  DIV_SEP_TEST_RULES,
  makeDivSepTestBox,
  roundMm,
} from "./divSepTestHelpers";
import { getHole2DLocalPosition } from "../../3d/objects/DrillGeometryBuilder";

describe("Viewer visual verify H=720 T=19 pos=600", () => {
  it("furos LAT alinham com mesh SEP; DIV sob SEP; Y local=600", () => {
    const H = 720;
    const T = 19;
    const sep = defaultSeparadorItem({ id: "sep-720", positionMm: 600 });
    const div = defaultDivisorItem({
      id: "div-720",
      linkedSeparadorId: "sep-720",
      positionMm: 281,
    });
    const box = makeDivSepTestBox({
      dimensoes: { largura: 600, altura: H, profundidade: 560 },
      espessura: T,
      separadores: [sep],
      divisores: [div],
    });

    const heightM = H / 1000;
    const widthM = 0.6;
    const depthM = 0.56;
    const thicknessM = T / 1000;
    const sideH = (H - 2 * T) / 1000;

    const sepCenterAbs = resolveSeparadorCenterY(box, sep);
    const sepBottom = resolveSeparadorBottomY(box, sep);
    const fundoTop = getDivSepInternalDims(box).espessura;
    const divH = resolveDivisorDimensions(box, div).alturaMm;

    expect(roundMm(sepCenterAbs)).toBe(619);
    expect(roundMm(absoluteYToLateralPanelY(box, sepCenterAbs))).toBe(600);
    expect(divH).toBe(Math.floor(sepBottom - fundoTop));

    const { getExtraHoles } = buildDivSepDrilling(box, box.panelIds!, DIV_SEP_TEST_RULES);
    const lat = getExtraHoles("lateral_esquerda").filter(
      (h) => h.holeType === "cavilha" || h.holeType === "parafuso"
    );
    expect([...new Set(lat.map((h) => roundMm(h.y)))]).toEqual([600]);

    const specs = getDivSepMeshSpecs(box, widthM, heightM, depthM, thicknessM);
    const sepSpec = specs.find((s) => s.name.startsWith("divsep-sep-"))!;
    const divSpec = specs.find((s) => s.name.startsWith("divsep-div-"))!;
    const sepMeshAbsCenter = (sepSpec.pos[1]! + heightM / 2) * 1000;
    const divMeshAbsTop =
      (divSpec.pos[1]! + heightM / 2) * 1000 + (divSpec.size[1]! / 2) * 1000;
    const divMeshAbsBot =
      (divSpec.pos[1]! + heightM / 2) * 1000 - (divSpec.size[1]! / 2) * 1000;

    expect(roundMm(sepMeshAbsCenter)).toBe(619);
    expect(roundMm(divMeshAbsTop)).toBeLessThanOrEqual(roundMm(sepBottom));
    expect(roundMm(divMeshAbsBot)).toBe(fundoTop);

    const sample = lat[0]!;
    const { b } = getHole2DLocalPosition("left", depthM, sideH, {
      x: sample.x,
      y: sample.y,
      diametro: sample.diameter,
      profundidade: sample.depth,
      tipo: sample.holeType === "parafuso" ? "parafuso" : "cavilha",
      face: "cima",
    });
    const holeAbsY = H / 2 + b * 1000;
    expect(Math.abs(holeAbsY - sepMeshAbsCenter)).toBeLessThan(0.05);
  });
});
