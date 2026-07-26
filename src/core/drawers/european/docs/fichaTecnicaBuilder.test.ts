import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import { generateEuropeanDrawer } from "../index";
import { buildFichaTecnica } from "./fichaTecnicaBuilder";

describe("docs/fichaTecnicaBuilder", () => {
  it("contém secções e todas as peças wood relevantes", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "cx",
        nome: "CX",
        dimensoes: { largura: 538, altura: 720, profundidade: 560 },
        espessura: 19,
        gavetas: 1,
        material: "mdf_branco",
        profundidadeInternaUtilMm: 500,
      },
      {
        systemId: "hettich-innotech-atira",
        heightMm: 144,
        depthMm: 450,
        softClose: true,
        pushOpen: false,
        count: 1,
      }
    );
    const ficha = buildFichaTecnica(result, {
      id: "cx",
      dimensoes: { largura: 538, altura: 720, profundidade: 560 },
      espessura: 19,
      profundidadeInternaUtilMm: 500,
    });
    expect(ficha.sections.map((s) => s.id)).toEqual([
      "identificacao",
      "materiais",
      "medidas",
      "frente",
      "corredicas",
      "observacoes",
    ]);
    const woodCodes = result.cutlist.filter((i) => i.kind === "wood").map((i) => i.codigo);
    for (const code of woodCodes) {
      expect(ficha.metadata.pieces.some((p) => p.codigo === code)).toBe(true);
    }
    vi.restoreAllMocks();
  });
});
