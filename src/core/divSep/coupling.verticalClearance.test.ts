/**
 * Folga vertical DIV↔SEP (decisão D): gap ≥ DIV_SEP_VERTICAL_CLEARANCE_MM.
 * Furos LAT permanecem no centro do SEP (positionMm).
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

describe("DIV_SEP_VERTICAL_CLEARANCE_MM — folga Y ≥ 5", () => {
  it("NP26389: T=19 positionMm=1519 → DIV 1504, gap 5.5, furos 1519", () => {
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
    expect(alturaDIV).toBe(1504);
    expect(roundMm(gap)).toBe(5.5);
    expect(roundMm(yLat)).toBe(1519);
    expect(resolveDivisorDimensions(box, div).alturaMm).toBe(1504);

    // Furos LAT inalterados no centro do SEP
    const { getExtraHoles } = buildDivSepDrilling(box, box.panelIds!, DIV_SEP_TEST_RULES);
    const ys = getExtraHoles("lateral_esquerda")
      .filter((h) => h.holeType === "cavilha" || h.holeType === "parafuso")
      .map((h) => roundMm(h.y));
    expect(ys.length).toBeGreaterThan(0);
    expect(new Set(ys)).toEqual(new Set([1519]));

    // Viewer: sem penetração + gap ≥ 5
    const H = 2400;
    const specs = getDivSepMeshSpecs(box, 0.8, H / 1000, 0.56, T / 1000);
    const sepSpec = specs.find((s) => s.name.startsWith("divsep-sep-"))!;
    const divSpec = specs.find((s) => s.name.startsWith("divsep-div-"))!;
    const heightM = H / 1000;
    const sepMeshBottom =
      (sepSpec.pos[1]! + heightM / 2) * 1000 - (sepSpec.size[1]! / 2) * 1000;
    const divMeshTop =
      (divSpec.pos[1]! + heightM / 2) * 1000 + (divSpec.size[1]! / 2) * 1000;
    expect(roundMm(divMeshTop)).toBeLessThanOrEqual(roundMm(sepMeshBottom));
    expect(roundMm(sepMeshBottom - divMeshTop)).toBeGreaterThanOrEqual(
      DIV_SEP_VERTICAL_CLEARANCE_MM
    );
  });

  it.each([
    { T: 19, label: "ímpar" },
    { T: 18, label: "par" },
    { T: 16, label: "par" },
  ])("T=$T ($label): gap ≥ 5 em vários positionMm; furos = positionMm", ({ T }) => {
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
      const expected = Math.floor(
        sepBottom - T - DIV_SEP_VERTICAL_CLEARANCE_MM
      );
      const { alturaDIV, gap, yLat } = linkedGapMm(box, sep, div);

      expect(alturaDIV).toBe(expected);
      expect(gap).toBeGreaterThanOrEqual(DIV_SEP_VERTICAL_CLEARANCE_MM);
      expect(gap).toBeLessThan(DIV_SEP_VERTICAL_CLEARANCE_MM + 1);
      expect(roundMm(yLat)).toBe(positionMm);
      expect(resolveSeparadorDimensions(box, sep).alturaMm).toBe(T);
    }
  });
});
