import { describe, expect, it } from "vitest";
import {
  clampDivisorLocalX,
  clampSeparadorLocalY,
  divisorLocalXToPositionMm,
  parseDivSepMeshName,
  separadorLocalYToPositionMm,
} from "./dragCoords";
import { resolveDivisorCenterX, resolveSeparadorCenterY } from "./dimensions";
import { makeDivSepTestBox } from "./divSepTestHelpers";

describe("parseDivSepMeshName", () => {
  it("parseia divisório", () => {
    expect(parseDivSepMeshName("divsep-div-abc")).toEqual({ kind: "div", itemId: "abc" });
  });
  it("parseia separador", () => {
    expect(parseDivSepMeshName("divsep-sep-xyz")).toEqual({ kind: "sep", itemId: "xyz" });
  });
});

describe("dragCoords round-trip", () => {
  const box = makeDivSepTestBox({
    dimensoes: { largura: 600, altura: 720, profundidade: 560 },
  });

  it("separador: local Y ↔ positionMm (bottom)", () => {
    const item = { id: "s1", positionMm: 300, referenceEdge: "bottom" as const };
    const centerYAbs = resolveSeparadorCenterY(box, item);
    const heightM = 0.72;
    const localY = centerYAbs / 1000 - heightM / 2;
    const back = separadorLocalYToPositionMm(localY, heightM, box, item);
    expect(back).toBeCloseTo(item.positionMm, 0);
    expect(clampSeparadorLocalY(localY, heightM, box, item)).toBeCloseTo(localY, 5);
  });

  it("divisório: local X ↔ positionMm (left)", () => {
    const item = { id: "d1", positionMm: 250, referenceEdge: "left" as const };
    const centerXAbs = resolveDivisorCenterX(box, item);
    const widthM = 0.6;
    const localX = centerXAbs / 1000 - widthM / 2;
    const back = divisorLocalXToPositionMm(localX, widthM, box, item);
    expect(back).toBeCloseTo(item.positionMm, 0);
    expect(clampDivisorLocalX(localX, widthM, box, item)).toBeCloseTo(localX, 5);
  });
});
