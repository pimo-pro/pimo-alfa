import { describe, expect, it } from "vitest";
import { resolveDivisorLinkedHeightMm, resolveSeparadorBottomY } from "./coupling";
import {
  getDivSepInternalDims,
  resolveDivisorDimensions,
  resolveSeparadorDimensions,
} from "./dimensions";
import {
  defaultDivisorItem,
  defaultSeparadorItem,
  DIV_SEP_ESPESSURA,
  makeDivSepTestBox,
  roundMm,
} from "./divSepTestHelpers";
import { getDivSepMeshSpecs, type DivSepMeshSpec } from "./visualSpecs";

type AabbY = { yMin: number; yMax: number };

function absYRangeFromSpec(spec: DivSepMeshSpec, heightM: number): AabbY {
  const halfH = spec.size[1]! / 2;
  const centerAbsMm = (spec.pos[1]! + heightM / 2) * 1000;
  return {
    yMin: centerAbsMm - halfH * 1000,
    yMax: centerAbsMm + halfH * 1000,
  };
}

function yOverlapMm(a: AabbY, b: AabbY): number {
  return Math.max(0, Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin));
}

function assertLinkedDivBelowSep(
  box: ReturnType<typeof makeDivSepTestBox>,
  sep: ReturnType<typeof defaultSeparadorItem>,
  div: ReturnType<typeof defaultDivisorItem>
): void {
  const heightM = box.dimensoes.altura / 1000;
  const widthM = box.dimensoes.largura / 1000;
  const depthM = (box.profundidadeExterna ?? box.dimensoes.profundidade) / 1000;
  const thicknessM = DIV_SEP_ESPESSURA / 1000;

  const internal = getDivSepInternalDims(box);
  const fundoTopY = internal.espessura;
  const sepBottomY = resolveSeparadorBottomY(box, sep);
  const dims = resolveDivisorDimensions(box, div);
  const linkedH = resolveDivisorLinkedHeightMm(box, div, sep);

  expect(dims.alturaMm).toBe(Math.floor(sepBottomY - fundoTopY));
  expect(dims.alturaMm).toBe(linkedH);
  expect(fundoTopY + dims.alturaMm).toBeLessThanOrEqual(sepBottomY);

  const specs = getDivSepMeshSpecs(box, widthM, heightM, depthM, thicknessM);
  const sepSpec = specs.find((s) => s.name === `divsep-sep-${sep.id}`);
  const divSpec = specs.find((s) => s.name === `divsep-div-${div.id}`);
  expect(sepSpec).toBeDefined();
  expect(divSpec).toBeDefined();

  const sepY = absYRangeFromSpec(sepSpec!, heightM);
  const divY = absYRangeFromSpec(divSpec!, heightM);

  expect(roundMm(divY.yMax)).toBeLessThanOrEqual(roundMm(sepY.yMin));
  expect(yOverlapMm(divY, sepY)).toBe(0);
  expect(roundMm(sepY.yMin)).toBe(roundMm(sepBottomY));
}

describe("SEP/DIV geometry — P0 Viewer + P1 floor", () => {
  it("altura industrial = floor(sepBottomY − FUNDO.topY) sem penetração", () => {
    const sep = defaultSeparadorItem({ id: "sep-geo", positionMm: 600 });
    const div = defaultDivisorItem({
      id: "div-geo",
      linkedSeparadorId: "sep-geo",
      positionMm: 281,
    });
    const box = makeDivSepTestBox({
      dimensoes: { largura: 600, altura: 720, profundidade: 560 },
      separadores: [sep],
      divisores: [div],
    });
    assertLinkedDivBelowSep(box, sep, div);
  });

  it("Viewer: divTop ≤ sepBottom e AABB sem overlap em Y", () => {
    const sep = defaultSeparadorItem({ id: "sep-view", positionMm: 400 });
    const div = defaultDivisorItem({
      id: "div-view",
      linkedSeparadorId: "sep-view",
      positionMm: 200,
    });
    const box = makeDivSepTestBox({
      dimensoes: { largura: 600, altura: 900, profundidade: 560 },
      separadores: [sep],
      divisores: [div],
    });
    assertLinkedDivBelowSep(box, sep, div);
  });

  it("após mover o SEP, altura e Viewer continuam sem overlap", () => {
    const sepBase = defaultSeparadorItem({ id: "sep-move", positionMm: 350 });
    const div = defaultDivisorItem({
      id: "div-move",
      linkedSeparadorId: "sep-move",
      positionMm: 281,
    });

    for (const positionMm of [250, 400, 550, 620]) {
      const sep = { ...sepBase, positionMm };
      const box = makeDivSepTestBox({
        dimensoes: { largura: 600, altura: 720, profundidade: 560 },
        separadores: [sep],
        divisores: [div],
      });
      assertLinkedDivBelowSep(box, sep, div);

      const sepDims = resolveSeparadorDimensions(box, sep);
      expect(sepDims.alturaMm).toBe(DIV_SEP_ESPESSURA);
    }
  });
});
