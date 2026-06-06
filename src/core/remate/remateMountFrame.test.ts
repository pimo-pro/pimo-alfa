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
  it("DIR lateral mantém peça junto à caixa (offsets em mm, não km)", () => {
    const snapped = snapToMountRule(
      basePiece({ tipo: "DIR", width: 760, height: 550, depth: 19 }),
      bounds
    );
    expect(Math.abs(snapped.position.xMm)).toBeLessThan(500);
    expect(Math.abs(snapped.position.yMm)).toBeLessThan(500);
    expect(Math.abs(snapped.position.zMm)).toBeLessThan(500);
  });

  it("FRENTE Completo fica à frente do módulo (z positivo, < 2 m)", () => {
    const snapped = snapToMountRule(
      basePiece({
        tipo: "FRENTE",
        productType: "COMPLETO",
        mountSlot: "FRENTE",
        width: 620,
        height: 780,
        depth: 19,
      }),
      bounds
    );
    expect(snapped.position.zMm).toBeGreaterThan(200);
    expect(snapped.position.zMm).toBeLessThan(2000);
  });

  it("ESQ/CIMA/BAIXO não colapsam para zMm≈0 (centro antigo)", () => {
    for (const tipo of ["ESQ", "CIMA", "BAIXO"] as const) {
      const p = snapToMountRule(basePiece({ tipo }), bounds);
      expect(Math.abs(p.position.zMm)).toBeGreaterThan(50);
      expect(Math.abs(p.position.zMm)).toBeLessThan(2000);
    }
  });

  it("followBox reaplica offsets sem regressar ao centro", () => {
    const piece = snapToMountRule(basePiece({ tipo: "DIR" }), bounds);
    const pose = resolveRematePoseLocal(piece, bounds);
    expect(pose.position.zMm).toBeCloseTo(piece.position.zMm, 0);
  });
});
