import { describe, it, expect } from "vitest";
import { quantizeRad90, rotationSnapIndexFromLocalY, quantizeRemateRotationLocal } from "./remateRotationSnap";

describe("remateRotationSnap", () => {
  it("quantiza para múltiplos de 90°", () => {
    expect(quantizeRad90(Math.PI / 4)).toBeCloseTo(Math.PI / 2, 5);
    expect(quantizeRad90(Math.PI)).toBeCloseTo(Math.PI, 5);
  });

  it("rotationSnapIndex 0..3", () => {
    expect(rotationSnapIndexFromLocalY(0)).toBe(0);
    expect(rotationSnapIndexFromLocalY(Math.PI / 2)).toBe(1);
    expect(rotationSnapIndexFromLocalY(Math.PI)).toBe(2);
  });

  it("preserva valores já quantizados", () => {
    const r = quantizeRemateRotationLocal({ xRad: 0, yRad: Math.PI / 2, zRad: 0 });
    expect(r.yRad).toBeCloseTo(Math.PI / 2, 5);
  });
});
