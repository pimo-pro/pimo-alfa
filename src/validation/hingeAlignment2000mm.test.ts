import { describe, it, expect } from "vitest";
import { defaultRulesConfig, getNumDobradicas } from "../core/rules/rulesConfig";
import { buildPanelDrillingResult } from "../modules/drilling/drillingAdapter";

function uniqueSorted(values: number[]): number[] {
  const unique = Array.from(new Set(values.map((v) => Math.round(v * 1000) / 1000)));
  unique.sort((a, b) => a - b);
  return unique;
}

describe("Hinges — alinhamento porta vs lateral (altura 2000mm)", () => {
  it("porta é master e lateral copia 100% das posições Y", () => {
    const rules = defaultRulesConfig;
    const doorHeightMm = 2000;
    const doorWidthMm = 600;
    const espessuraMm = 19;

    const expectedNumHinges = getNumDobradicas(doorHeightMm, rules);

    // 1) Porta (master): gera posições via getHingeYPositions (industrial).
    const door = buildPanelDrillingResult(
      {
        tipo: "porta_simples",
        larguraMm: doorWidthMm,
        alturaMm: doorHeightMm,
        espessuraMm,
        hingeSide: "left",
      },
      rules
    );
    expect(door.success).toBe(true);
    const doorHoles = door.data?.drillHoles ?? [];
    const doorDobradicaYs = uniqueSorted(doorHoles.filter((h) => h.holeType === "dobradica").map((h) => h.y));
    const doorOffsetsFromBase = uniqueSorted(
      doorHoles.filter((h) => h.holeType === "dobradica").map((h) => doorHeightMm - h.y)
    );

    expect(doorDobradicaYs.length).toBe(expectedNumHinges);

    // 2) Lateral: NÃO recalcula; hingePositionsMm = offsets a partir da base (igual cutlistFromBoxes).
    const lateral = buildPanelDrillingResult(
      {
        tipo: "lateral_esquerda",
        larguraMm: 300,
        alturaMm: doorHeightMm,
        espessuraMm,
        hingeSide: "left",
        hingePositionsMm: doorOffsetsFromBase,
      },
      rules
    );
    expect(lateral.success).toBe(true);
    const latHoles = lateral.data?.drillHoles ?? [];

    // A lateral tem 3 furos por dobradiça (2 calço + 1 união). O alinhamento é pelo Y do furo de união.
    const latUniaoYs = uniqueSorted(latHoles.filter((h) => h.holeType === "dobradica_parafuso_uniao").map((h) => h.y));

    expect(latUniaoYs.length).toBe(expectedNumHinges);
    expect(latUniaoYs).toEqual(doorDobradicaYs);
    expect(doorOffsetsFromBase).toEqual(
      uniqueSorted(latHoles.filter((h) => h.holeType === "dobradica_parafuso_uniao").map((h) => doorHeightMm - h.y))
    );
  });
});

