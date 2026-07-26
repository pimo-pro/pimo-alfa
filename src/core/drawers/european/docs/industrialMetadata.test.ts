import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import { generateEuropeanDrawer } from "../index";
import { buildEuropeanIndustrialMetadata } from "./industrialMetadata";

const box = {
  id: "cx",
  nome: "CX",
  dimensoes: { largura: 538, altura: 720, profundidade: 560 },
  espessura: 19,
  gavetas: 2,
  material: "mdf_branco",
  profundidadeInternaUtilMm: 500,
};

describe("docs/industrialMetadata", () => {
  it("extrai modelo, runner, materiais e códigos do resultado real", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const result = generateEuropeanDrawer("hettich-innotech-atira", box, {
      systemId: "hettich-innotech-atira",
      heightMm: 144,
      depthMm: 450,
      softClose: true,
      pushOpen: false,
      count: 2,
    });
    expect(result.valid).toBe(true);
    const meta = buildEuropeanIndustrialMetadata(result, box);
    expect(meta.systemId).toBe("hettich-innotech-atira");
    expect(meta.modelDisplayName).toContain("Atira");
    expect(meta.runnerLengthMm).toBe(450);
    expect(meta.drawerCount).toBe(2);
    expect(meta.heightUsedMm).toBe(144);
    expect(meta.industrialCodes.some((c) => c.includes("fren"))).toBe(true);
    expect(meta.industrialCodes).toContain("gav_lat_dir");
    expect(meta.box?.usefulInternalDepthMm).toBe(500);
    expect(meta.materialConsumptionM2ApproxTotal).toBeGreaterThan(0);
    expect(meta.flags.softClose).toBe(true);
    vi.restoreAllMocks();
  });
});
