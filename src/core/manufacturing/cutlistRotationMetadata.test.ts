import { describe, expect, it } from "vitest";
import { buildCutlistRotationMetadata } from "./cutlistRotationMetadata";
import { isRotatablePiece } from "../cutlayout/utils/cutLayoutUtils";
import type { CutPiece } from "../cutlayout/cutLayoutTypes";

describe("cutlistRotationMetadata", () => {
  it("infere lockWoodGrain em material de madeira", () => {
    expect(
      buildCutlistRotationMetadata({ materialId: "carvalho-19" }).lockWoodGrain
    ).toBe(true);
  });

  it("respeita lockWoodGrain explícito em MDF", () => {
    expect(
      buildCutlistRotationMetadata({
        materialId: "mdf-branco-19",
        lockWoodGrain: true,
      }).lockWoodGrain
    ).toBe(true);
  });
});

describe("isRotatablePiece rodapé", () => {
  it("bloqueia rodapé com lockWoodGrain na metadata", () => {
    const piece: CutPiece = {
      largura_mm: 800,
      altura_mm: 100,
      espessura_mm: 19,
      quantidade: 1,
      boxId: "box-1",
      partName: "Rodapé",
      materialId: "mdf-branco-19",
      pieceTipo: "rodape",
      metadata: { lockWoodGrain: true },
    };
    expect(isRotatablePiece(piece)).toBe(false);
  });
});
