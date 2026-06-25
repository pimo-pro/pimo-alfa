import { describe, expect, it } from "vitest";
import type { CutPiece } from "../cutLayoutTypes";
import { applyPairVirtualPieces, expandPairPlacement } from "./pairPacking";
import { isRotatablePiece } from "../utils/cutLayoutUtils";

function piece(partName: string, holeX: number): CutPiece {
  return {
    largura_mm: 200,
    altura_mm: 80,
    espessura_mm: 19,
    quantidade: 1,
    boxId: "box1",
    partName,
    drillHoles: [{ x: holeX, y: 20, diameter: 5, depth: 12 }],
    holes: [{ x: holeX, y: 20, diameter: 5, depth: 12 }],
  };
}

describe("pairPacking", () => {
  it("expande pares virtuais rodados preservando peça, furos e rotação final", () => {
    const kerf = 4;
    const [virtual] = applyPairVirtualPieces([piece("Lateral", 10), piece("Prateleira", 30)], 500, kerf);

    const expanded = expandPairPlacement(
      virtual!,
      {
        x: 10,
        y: 20,
        w: 80,
        h: 404,
        rotation: 90,
      },
      kerf
    );

    expect(expanded).toHaveLength(2);
    expect(expanded[0]?.piece.partName).toBe("Lateral");
    expect(expanded[0]?.piece.drillHoles?.[0]).toMatchObject({ x: 10, y: 20 });
    expect(expanded[0]?.placement).toMatchObject({ x: 10, y: 224, w: 80, h: 200, rotation: 90 });
    expect(expanded[1]?.piece.partName).toBe("Prateleira");
    expect(expanded[1]?.piece.drillHoles?.[0]).toMatchObject({ x: 30, y: 20 });
    expect(expanded[1]?.placement).toMatchObject({ x: 10, y: 20, w: 80, h: 200, rotation: 90 });
  });

  it("super-peça virtual herda restrições de rotação das duas peças", () => {
    const locked = {
      ...piece("Prateleira", 30),
      drillHoles: [{ x: 30, y: 20, diameter: 5, depth: 12, topDrillable: false }],
      holes: [{ x: 30, y: 20, diameter: 5, depth: 12, topDrillable: false }],
    };
    const [virtual] = applyPairVirtualPieces([piece("Lateral", 10), locked], 500, 4);

    expect(virtual?.drillHoles?.some((h) => h.topDrillable === false)).toBe(true);
    expect(isRotatablePiece(virtual!)).toBe(false);
  });
});
