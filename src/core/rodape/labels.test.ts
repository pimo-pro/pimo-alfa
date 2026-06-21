import { describe, expect, it } from "vitest";
import { buildRodapeIndustrialLabel, buildRodapeIndustrialLabelsForRodapes } from "./labels";
import type { ProjectRodape } from "./rodapeTypes";

function rodape(partial: Partial<ProjectRodape> & Pick<ProjectRodape, "id">): ProjectRodape {
  return {
    parentBoxId: "b1",
    kind: "SIMPLE",
    materialId: "mdf_branco",
    thicknessMm: 19,
    heightMm: 100,
    dimensions: { widthMm: 600, heightMm: 100, depthMm: 19 },
    name: "legacy",
    visible: true,
    ...partial,
  };
}

describe("rodape industrial labels", () => {
  it("buildRodapeIndustrialLabel — formato BOXNAME_RODA_PE_NN", () => {
    expect(buildRodapeIndustrialLabel("Armario Test", 1)).toBe("Armario_Test_RODA_PE_01");
    expect(buildRodapeIndustrialLabel("MOD1", 3)).toBe("MOD1_RODA_PE_03");
  });

  it("buildRodapeIndustrialLabelsForRodapes — indexação por caixa", () => {
    const labels = buildRodapeIndustrialLabelsForRodapes(
      [
        rodape({ id: "r1", parentBoxId: "b1" }),
        rodape({ id: "r2", parentBoxId: "b1" }),
        rodape({ id: "r3", parentBoxId: "b2" }),
      ],
      { b1: "MOD1", b2: "MOD2" }
    );
    expect(labels.get("r1")).toBe("MOD1_RODA_PE_01");
    expect(labels.get("r2")).toBe("MOD1_RODA_PE_02");
    expect(labels.get("r3")).toBe("MOD2_RODA_PE_01");
  });

  it("ignora rodapés invisíveis", () => {
    const labels = buildRodapeIndustrialLabelsForRodapes(
      [rodape({ id: "r1", visible: false }), rodape({ id: "r2" })],
      { b1: "MOD1" }
    );
    expect(labels.has("r1")).toBe(false);
    expect(labels.get("r2")).toBe("MOD1_RODA_PE_01");
  });
});
