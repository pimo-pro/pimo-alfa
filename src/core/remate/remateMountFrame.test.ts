import { describe, it, expect } from "vitest";
import { getStructuralBoundsM } from "./rematePlacement";
import { resolveRematePoseLocal, snapToMountRule } from "./remateMountFrame";
import type { RematePiece } from "./rematePieceTypes";

const bounds = getStructuralBoundsM(0.6, 0.72, 0.6);

function basePiece(overrides: Partial<RematePiece>): RematePiece {
  return {
    id: "t",
    tipo: "DIR",
    width: 19,
    height: 760,
    depth: 100,
    materialPresetId: "m",
    position: { xMm: 0, yMm: 0, zMm: 0 },
    rotation: { xRad: 0, yRad: 0, zRad: 0 },
    followBox: true,
    name: "T",
    ...overrides,
  };
}

describe("remateMountFrame", () => {
  it("DIR nasce alinhado à frente (zMm ≠ 0)", () => {
    const snapped = snapToMountRule(basePiece({ tipo: "DIR" }), bounds);
    expect(Math.abs(snapped.position.zMm)).toBeGreaterThan(200);
    expect(Math.abs(snapped.position.zMm - (bounds.maxZ * 1000 - 50))).toBeLessThan(5);
  });

  it("ESQ/CIMA/BAIXO não usam zMm≈0", () => {
    for (const tipo of ["ESQ", "CIMA", "BAIXO"] as const) {
      const p = snapToMountRule(basePiece({ tipo }), bounds);
      expect(Math.abs(p.position.zMm)).toBeGreaterThan(200);
    }
  });

  it("followBox reaplica offsets sem regressar ao centro", () => {
    const piece = snapToMountRule(basePiece({ tipo: "DIR" }), bounds);
    const pose = resolveRematePoseLocal(piece, bounds);
    expect(pose.position.zMm).toBeCloseTo(piece.position.zMm, 0);
  });
});
