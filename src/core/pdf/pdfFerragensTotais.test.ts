import { describe, it, expect, vi } from "vitest";
import { buildFerragensTotaisPdf, ferragensTotaisPdfFileName } from "./pdfFerragensTotais";
import type { ComponentType } from "../components/componentTypes";
import type { Ferragem } from "../ferragens/ferragens";
import type { MaterialIndustrial } from "../manufacturing/materials";

vi.mock("../industrial/industrialBottomSectionData", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../industrial/industrialBottomSectionData")>();
  return {
    ...actual,
    buildFerragensTotaisArmazemData: () => ({
      materiaisChapas: [],
      ferragens: [
        { material: "Cavilha 8mm", ref: "cavilha_8mm", medida: "Ø8mm", quantidade: 16 },
        { material: "Corrediça Lateral Esquerda", ref: "corredica_esq", medida: "", quantidade: 2 },
        { material: "Corrediça Lateral Direita", ref: "corredica_dir", medida: "", quantidade: 2 },
        { material: "Dobradiça 35mm", ref: "dobradica_35mm", medida: "35mm", quantidade: 2 },
        { material: "Parafuso para Puxador", ref: "parafuso_puxador", medida: "M4", quantidade: 4 },
        { material: "Prego para Costa", ref: "prego_costa", medida: "2mm", quantidade: 12 },
        { material: "Suporte de Prateleira", ref: "suporte_prateleira", medida: "", quantidade: 4 },
      ],
    }),
  };
});

vi.mock("../fabrication/buildCutlistItemsForIndustrialExport", () => ({
  buildCutlistItemsForIndustrialExport: () => [
    { tipo: "COSTA", dimensoes: { largura: 720, altura: 560 }, quantidade: 1 },
  ],
}));

describe("buildFerragensTotaisPdf", () => {
  it("gera PDF landscape com tabela única normalizada", () => {
    const doc = buildFerragensTotaisPdf(
      {
        boxes: [
          {
            id: "b1",
            gavetas: 1,
            dimensoes: { largura: 600, altura: 720, profundidade: 450 },
          } as never,
        ],
        rules: {} as never,
        materialId: undefined,
        projectName: "Projeto Teste",
        remates: [],
        rodapes: [],
        extractedPartsByBoxId: {},
        pieceObservacoes: {},
      },
      [] as ComponentType[],
      [] as Ferragem[],
      [] as MaterialIndustrial[]
    );
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight());
    expect(doc.getNumberOfPages()).toBe(1);
    expect(ferragensTotaisPdfFileName("Projeto Teste")).toBe("Projeto_Teste_ferragens_totais.pdf");
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(500);
  });
});
