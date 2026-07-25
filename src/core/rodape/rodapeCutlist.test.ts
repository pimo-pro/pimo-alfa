import { describe, expect, it } from "vitest";
import { buildRodapeCutlistItems } from "./rodapeCutlist";
import type { ProjectRodape } from "./rodapeTypes";

function baseRodape(partial: Partial<ProjectRodape> & Pick<ProjectRodape, "id">): ProjectRodape {
  return {
    id: partial.id,
    kind: "SIMPLE",
    parentBoxId: "box-1",
    materialId: "mdf_branco-19",
    heightMm: 150,
    thicknessMm: 19,
    dimensions: { widthMm: 600, heightMm: 150, depthMm: 19 },
    name: "Rodape teste",
    ...partial,
  };
}

describe("buildRodapeCutlistItems", () => {
  it("exclui rodapes com visible=false", () => {
    const items = buildRodapeCutlistItems(
      [baseRodape({ id: "r1", visible: true }), baseRodape({ id: "r2", visible: false })],
      []
    );
    expect(items.map((i) => i.id)).toEqual(["r1"]);
  });

  it("exclui rodapes sem dimensões válidas (não inventa 1×1)", () => {
    const items = buildRodapeCutlistItems(
      [
        baseRodape({ id: "ok" }),
        baseRodape({
          id: "zero",
          heightMm: 0,
          dimensions: { widthMm: 0, heightMm: 0, depthMm: 19 },
          autoLengthMm: 0,
        }),
      ],
      []
    );
    expect(items.map((i) => i.id)).toEqual(["ok"]);
  });
});
