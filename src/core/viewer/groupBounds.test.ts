import { describe, expect, it } from "vitest";
import { getGroupBoundingBox } from "./groupBounds";
import { defaultState } from "../../context/projectState";
import { boxSelectionId } from "./selectionIds";

describe("groupBounds", () => {
  it("calcula AABB unificado de duas caixas", () => {
    const project = {
      ...defaultState,
      workspaceBoxes: [
        {
          ...defaultState.workspaceBoxes[0]!,
          id: "b1",
          posicaoX_mm: 0,
          posicaoY_mm: 0,
          posicaoZ_mm: 0,
          dimensoes: { largura: 600, altura: 720, profundidade: 600 },
        },
        {
          ...defaultState.workspaceBoxes[0]!,
          id: "b2",
          posicaoX_mm: 1000,
          posicaoY_mm: 0,
          posicaoZ_mm: 0,
          dimensoes: { largura: 600, altura: 720, profundidade: 600 },
        },
      ],
    };
    const bounds = getGroupBoundingBox(project, [boxSelectionId("b1"), boxSelectionId("b2")]);
    expect(bounds).not.toBeNull();
    expect(bounds!.size.x).toBeGreaterThan(1);
  });
});
