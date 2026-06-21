import { describe, expect, it } from "vitest";
import { cutLayoutResultToV3State } from "./cutLayoutResultToV3State";
import type { CutLayoutResult } from "../cutLayoutTypes";
import type { NestingV3State, V3Piece } from "../../../nesting-v3/nestingV3Types";
import { DEFAULT_NESTING_V3_SETTINGS } from "../../../nesting-v3/nestingV3Settings";

describe("cutLayoutResultToV3State", () => {
  it("mapeia placements TL e rotação a partir de metadata v3PieceId", () => {
    const pieces: V3Piece[] = [
      {
        id: "v3-a",
        name: "Peça A",
        widthMm: 100,
        heightMm: 50,
        thicknessMm: 19,
        originalHoles: [],
        rotation: 0,
        color: "#ccc",
        sourceBoxId: "box-1",
      },
    ];
    const baseState: NestingV3State = {
      sheets: [{ index: 0, widthMm: 1000, heightMm: 800, thicknessMm: 19 }],
      pieces,
      placements: [],
      unplacedPieceIds: ["v3-a"],
      settings: DEFAULT_NESTING_V3_SETTINGS,
      kerfMm: 4,
      activeSheetIndex: 0,
    };
    const result: CutLayoutResult = {
      sheets: [
        {
          sheet: { largura_mm: 1000, altura_mm: 800, espessura_mm: 19 },
          placements: [
            {
              x_mm: 10,
              y_mm: 20,
              largura_mm: 100,
              altura_mm: 50,
              rotacao: 90,
              sheetIndex: 0,
              boxId: "box-1",
              partName: "Peça A",
              metadata: { v3PieceId: "v3-a" },
            },
          ],
        },
      ],
    };

    const next = cutLayoutResultToV3State(result, baseState);
    expect(next.placements).toHaveLength(1);
    expect(next.placements[0]?.pieceId).toBe("v3-a");
    expect(next.placements[0]?.xMm).toBe(10);
    expect(next.placements[0]?.yMm).toBe(800 - 20 - 50);
    expect(next.pieces[0]?.rotation).toBe(90);
    expect(next.unplacedPieceIds).toHaveLength(0);
  });
});
