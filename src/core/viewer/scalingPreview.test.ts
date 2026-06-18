import { describe, expect, it } from "vitest";
import { buildScalingPreviewData } from "./scalingPreview";
import type { ProjectState } from "../../context/projectTypes";

const baseProject = {
  workspaceBoxes: [
    {
      id: "box-1",
      nome: "A",
      dimensoes: { largura: 400, altura: 720, profundidade: 500 },
      doorsLayer: [],
      drawersLayer: [],
    },
    {
      id: "box-2",
      nome: "B",
      dimensoes: { largura: 800, altura: 720, profundidade: 500 },
      doorsLayer: [],
      drawersLayer: [],
    },
  ],
  remates: [],
  rodapes: [],
} as unknown as ProjectState;

describe("scalingPreview", () => {
  it("gera preview additive com delta correto", () => {
    const preview = buildScalingPreviewData(
      baseProject,
      ["box:box-1", "box:box-2"],
      900,
      "additive"
    );
    expect(preview).not.toBeNull();
    expect(preview!.oldMax).toBe(800);
    expect(preview!.newMax).toBe(900);
    expect(preview!.delta).toBe(100);
    expect(preview!.rows).toHaveLength(2);
    expect(preview!.rows[1]!.after[0]).toBe(900);
  });

  it("gera preview ratio proporcional", () => {
    const preview = buildScalingPreviewData(baseProject, ["box:box-2"], 400, "ratio");
    expect(preview!.ratio).toBeCloseTo(0.5, 5);
    expect(preview!.rows[0]!.after[0]).toBeCloseTo(400, 5);
  });
});
