/**
 * Encaixe DIV↔SEP rosto a rosto: gap = 0.
 * Furos LAT = centro do SEP (positionMm); alturaDIV = positionMm − T/2.
 */
import { describe, expect, it } from "vitest";
import {
  DIV_SEP_VERTICAL_CLEARANCE_MM,
  resolveDivisorLinkedHeightMm,
  resolveSeparadorBottomY,
} from "./coupling";
import {
  getDivSepInternalDims,
  resolveDivisorDimensions,
  resolveSeparadorCenterY,
  resolveSeparadorDimensions,
} from "./dimensions";
import { absoluteYToLateralPanelY } from "./shelfDrilling";
import { buildDivSepDrilling } from "./drilling";
import { getDivSepMeshSpecs } from "./visualSpecs";
import {
  defaultDivisorItem,
  defaultSeparadorItem,
  DIV_SEP_TEST_RULES,
  makeDivSepTestBox,
  roundMm,
} from "./divSepTestHelpers";

function linkedGapMm(
  box: ReturnType<typeof makeDivSepTestBox>,
  sep: ReturnType<typeof defaultSeparadorItem>,
  div: ReturnType<typeof defaultDivisorItem>
): { alturaDIV: number; gap: number; yLat: number } {
  const T = getDivSepInternalDims(box).espessura;
  const sepBottom = resolveSeparadorBottomY(box, sep);
  const alturaDIV = resolveDivisorLinkedHeightMm(box, div, sep);
  const gap = sepBottom - (T + alturaDIV);
  const yLat = absoluteYToLateralPanelY(box, resolveSeparadorCenterY(box, sep));
  return { alturaDIV, gap, yLat };
}

describe("DIV↔SEP encaixe rosto a rosto (gap 0)", () => {
  it("caso industrial: DIV=2000 → furos=2009.5 (T=19)", () => {
    const T = 19;
    const alturaDivAlvo = 2000;
    const positionMm = alturaDivAlvo + T / 2; // 2009.5
    const sep = defaultSeparadorItem({ id: "sep-2000", positionMm });
    const div = defaultDivisorItem({
      id: "div-2000",
      linkedSeparadorId: "sep-2000",
      positionMm: 400,
    });
    const box = makeDivSepTestBox({
      dimensoes: { largura: 800, altura: 2400, profundidade: 560 },
      espessura: T,
      separadores: [sep],
      divisores: [div],
    });

    const { alturaDIV, gap, yLat } = linkedGapMm(box, sep, div);
    expect(roundMm(yLat)).toBe(2009.5);
    expect(roundMm(alturaDIV)).toBe(2000);
    expect(roundMm(gap)).toBe(0);
    expect(DIV_SEP_VERTICAL_CLEARANCE_MM).toBe(0);
  });

  it("caso industrial: DIV=2000 → furos=2008 (T=16)", () => {
    const T = 16;
    const positionMm = 2000 + T / 2;
    const sep = defaultSeparadorItem({ id: "sep-2000-t16", positionMm });
    const div = defaultDivisorItem({
      id: "div-2000-t16",
      linkedSeparadorId: "sep-2000-t16",
      positionMm: 400,
    });
    const box = makeDivSepTestBox({
      dimensoes: { largura: 800, altura: 2400, profundidade: 560 },
      espessura: T,
      separadores: [sep],
      divisores: [div],
    });

    const { alturaDIV, gap, yLat } = linkedGapMm(box, sep, div);
    expect(roundMm(yLat)).toBe(2008);
    expect(roundMm(alturaDIV)).toBe(2000);
    expect(roundMm(gap)).toBe(0);
  });

  it("NP26389: T=19 positionMm=1519 → DIV 1509.5, gap 0, furos 1519", () => {
    const T = 19;
    const positionMm = 1519;
    const sep = defaultSeparadorItem({ id: "sep-np", positionMm });
    const div = defaultDivisorItem({
      id: "div-np",
      linkedSeparadorId: "sep-np",
      positionMm: 400,
    });
    const box = makeDivSepTestBox({
      dimensoes: { largura: 800, altura: 2400, profundidade: 560 },
      espessura: T,
      separadores: [sep],
      divisores: [div],
    });

    const sepBottom = resolveSeparadorBottomY(box, sep);
    expect(roundMm(sepBottom)).toBe(1528.5);

    const { alturaDIV, gap, yLat } = linkedGapMm(box, sep, div);
    expect(roundMm(alturaDIV)).toBe(1509.5);
    expect(roundMm(gap)).toBe(0);
    expect(roundMm(yLat)).toBe(1519);
    expect(roundMm(resolveDivisorDimensions(box, div).alturaMm)).toBe(1509.5);

    const { getExtraHoles } = buildDivSepDrilling(box, box.panelIds!, DIV_SEP_TEST_RULES);
    const ys = getExtraHoles("lateral_esquerda")
      .filter((h) => h.holeType === "cavilha" || h.holeType === "parafuso")
      .map((h) => roundMm(h.y));
    expect(ys.length).toBeGreaterThan(0);
    expect(new Set(ys)).toEqual(new Set([1519]));

    const H = 2400;
    const specs = getDivSepMeshSpecs(box, 0.8, H / 1000, 0.56, T / 1000);
    const sepSpec = specs.find((s) => s.name.startsWith("divsep-sep-"))!;
    const divSpec = specs.find((s) => s.name.startsWith("divsep-div-"))!;
    const heightM = H / 1000;
    const sepMeshBottom =
      (sepSpec.pos[1]! + heightM / 2) * 1000 - (sepSpec.size[1]! / 2) * 1000;
    const divMeshTop =
      (divSpec.pos[1]! + heightM / 2) * 1000 + (divSpec.size[1]! / 2) * 1000;
    expect(roundMm(divMeshTop)).toBe(roundMm(sepMeshBottom));
    expect(roundMm(sepMeshBottom - divMeshTop)).toBe(0);
  });

  it.each([
    { T: 19, label: "ímpar" },
    { T: 18, label: "par" },
    { T: 16, label: "par" },
  ])("T=$T ($label): gap 0; alturaDIV = positionMm − T/2; furos = positionMm", ({ T }) => {
    const positions = [200, 400, 600, 800, 1000];
    for (const positionMm of positions) {
      const sep = defaultSeparadorItem({ id: `sep-t${T}-${positionMm}`, positionMm });
      const div = defaultDivisorItem({
        id: `div-t${T}-${positionMm}`,
        linkedSeparadorId: sep.id,
        positionMm: 281,
      });
      const box = makeDivSepTestBox({
        dimensoes: { largura: 600, altura: 2200, profundidade: 560 },
        espessura: T,
        separadores: [sep],
        divisores: [div],
      });

      const sepBottom = resolveSeparadorBottomY(box, sep);
      const expected = sepBottom - T;
      const { alturaDIV, gap, yLat } = linkedGapMm(box, sep, div);

      expect(alturaDIV).toBe(expected);
      expect(roundMm(gap)).toBe(0);
      expect(roundMm(alturaDIV)).toBe(roundMm(positionMm - T / 2));
      expect(roundMm(yLat)).toBe(positionMm);
      expect(resolveSeparadorDimensions(box, sep).alturaMm).toBe(T);
    }
  });
});
