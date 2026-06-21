import { describe, expect, it } from "vitest";
import { v3PiecesToCutPieces } from "./v3ToCutPieces";
import type { V3Piece } from "../../../nesting-v3/nestingV3Types";
import { DEFAULT_NESTING_V3_SETTINGS } from "../../../nesting-v3/nestingV3Settings";

function samplePiece(overrides: Partial<V3Piece> = {}): V3Piece {
  return {
    id: "v3-piece-1",
    name: "Gaveta_Frente",
    widthMm: 400,
    heightMm: 150,
    thicknessMm: 19,
    materialId: "mdf_branco",
    originalHoles: [{ x: 10, y: 20, diameter: 5, depth: 13 }],
    rotation: 0,
    color: "#ccc",
    sourceBoxId: "box-a",
    industrialGrainCode: "YY",
    pieceTipo: "gaveta_frente",
    ...overrides,
  };
}

describe("v3PiecesToCutPieces", () => {
  it("mapeia campos industriais e metadata v3PieceId", () => {
    const cut = v3PiecesToCutPieces([samplePiece()], DEFAULT_NESTING_V3_SETTINGS)[0]!;
    expect(cut.partName).toBe("Gaveta_Frente");
    expect(cut.boxId).toBe("box-a");
    expect(cut.largura_mm).toBe(400);
    expect(cut.altura_mm).toBe(150);
    expect(cut.metadata?.v3PieceId).toBe("v3-piece-1");
    expect(cut.drillHoles?.[0]?.x).toBe(10);
    expect(cut.industrialGrainCode).toBe("YY");
  });

  it("preserva v3Rotation e grainDirection", () => {
    const cut = v3PiecesToCutPieces(
      [samplePiece({ rotation: 90, industrialGrainCode: "XX" })],
      DEFAULT_NESTING_V3_SETTINGS
    )[0]!;
    expect(cut.metadata?.v3Rotation).toBe(90);
    expect(cut.grainDirection).toBe("width");
  });

  it("usa piece.id como boxId quando sourceBoxId ausente", () => {
    const cut = v3PiecesToCutPieces([samplePiece({ sourceBoxId: undefined })], DEFAULT_NESTING_V3_SETTINGS)[0]!;
    expect(cut.boxId).toBe("v3-piece-1");
  });
});
