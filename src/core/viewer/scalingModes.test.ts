import { describe, expect, it } from "vitest";
import { maxLengthAcross, scaleDimensionValues } from "./scalingModes";

describe("scalingModes", () => {
  it("additive: aplica delta uniforme a todas as dimensões", () => {
    const oldMax = 800;
    const newMax = 900;
    const result = scaleDimensionValues([400, 800, 200], newMax, "additive");
    const delta = newMax - oldMax;
    expect(result).toEqual([400 + delta, 800 + delta, 200 + delta]);
  });

  it("ratio: escala proporcionalmente", () => {
    const result = scaleDimensionValues([400, 800], 400, "ratio");
    expect(result[0]).toBeCloseTo(200, 5);
    expect(result[1]).toBeCloseTo(400, 5);
  });

  it("maxLengthAcross encontra o maior valor", () => {
    expect(maxLengthAcross([100, 50], [800, 300])).toBe(800);
  });
});
