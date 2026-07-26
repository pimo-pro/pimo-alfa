import { describe, expect, it, vi } from "vitest";
import * as flags from "../drawerSystemFlags";
import { generateEuropeanDrawer } from "./index";

describe("generateEuropeanDrawer — regras industriais", () => {
  it("aplica Hettich, folga 7+7, corpo?10 e nomes industriais", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);

    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "cx1",
        nome: "CX1",
        dimensoes: { largura: 538, altura: 720, profundidade: 560 },
        espessura: 19,
        gavetas: 2,
        material: "mdf_branco",
        profundidadeInternaUtilMm: 500,
        europeanDrawerConfig: {
          systemId: "hettich-innotech-atira",
          heightMm: 144,
          depthMm: 450,
          softClose: true,
          pushOpen: false,
          count: 2,
          dualFront: false,
          frontMaterialId: "carvalho",
        },
      },
      undefined,
      { applyAutoFixes: true }
    );

    expect(result.valid, result.errors.join(" | ")).toBe(true);
    expect(result.geometry.runnerDepthMm).toBe(450);
    expect(result.geometry.bodyDepthMm).toBe(440);
    expect(result.geometry.externalWidthMm).toBe(486);

    const wood = result.cutlist.filter((i) => i.kind === "wood");
    const codes = wood.map((i) => i.codigo);
    expect(codes).toContain("gav_1_fren");
    expect(codes).toContain("gav_lat_dir");
    expect(codes).toContain("gav_lat_esq");
    expect(codes).toContain("gav_costa");
    expect(codes).toContain("gav_fun");

    const front = wood.find((i) => i.codigo === "gav_1_fren");
    expect(front?.material).toBe("carvalho");

    const lat = wood.find((i) => i.codigo === "gav_lat_esq");
    expect(lat?.material).toBe("mdf_branco");
    expect(lat?.espessuraMm).toBe(16);

    const fundo = wood.find((i) => i.codigo === "gav_fun");
    expect(fundo?.espessuraMm).toBe(10);

    const sideHoles = result.holes.filter(
      (h) => h.pieceRef === "gav_lat_esq" || h.pieceRef === "gav_costa"
    );
    expect(sideHoles.length).toBeGreaterThan(0);

    vi.restoreAllMocks();
  });
});
