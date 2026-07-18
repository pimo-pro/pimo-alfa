import { describe, it, expect, vi } from "vitest";
import {
  buildFerragensTotaisPdf,
  chapasRowsForFerragensTotaisPdf,
  ferragensTotaisPdfFileName,
} from "./pdfFerragensTotais";
import type { ComponentType } from "../components/componentTypes";
import type { Ferragem } from "../ferragens/ferragens";
import type { MaterialIndustrial } from "../manufacturing/materials";
import {
  assertFerragensTotaisInExport,
  exportProjectPdfFileNames,
} from "../fabrication/exportProjectFiles";
import { projectPdfListIncludesFerragensTotais } from "../fabrication/buildProjectPdfList";

vi.mock("../industrial/industrialBottomSectionData", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../industrial/industrialBottomSectionData")>();
  return {
    ...actual,
    buildFerragensTotaisArmazemData: () => ({
      materiaisChapas: [
        {
          material: "MDF Branco",
          ref: "mdf_branco",
          medida: "2800\u00d72070\u00d719 mm",
          quantidade: 3,
        },
      ],
      ferragens: [
        { material: "Cavilha 8mm", ref: "cavilha_8mm", medida: "\u00d88mm", quantidade: 16 },
        { material: "Corredica Lateral Esquerda", ref: "corredica_esq", medida: "", quantidade: 2 },
        { material: "Corredica Lateral Direita", ref: "corredica_dir", medida: "", quantidade: 2 },
        { material: "Dobradica 35mm", ref: "dobradica_35mm", medida: "35mm", quantidade: 2 },
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
  it("gera PDF landscape com chapas (estilo armazem) + ferragens normalizadas", () => {
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

  it("chapasRowsForFerragensTotaisPdf usa estilo TOTAL Chapas | Material | Espessura", () => {
    const rows = chapasRowsForFerragensTotaisPdf([
      {
        material: "MDF Branco",
        ref: "mdf",
        medida: "2800\u00d72070\u00d719 mm",
        quantidade: 3,
      },
    ]);
    expect(rows).toEqual([["3", "MDF Branco", "19 mm"]]);
  });

  it("ferragens_totais esta na lista de exportacao (nao substituido por industrial_armazem)", () => {
    expect(projectPdfListIncludesFerragensTotais("Projeto Teste")).toBe(true);
    expect(assertFerragensTotaisInExport("Projeto Teste")).toBe("Projeto_Teste_ferragens_totais.pdf");
    const names = exportProjectPdfFileNames("Projeto Teste");
    expect(names).toContain("Projeto_Teste_ferragens_totais.pdf");
    expect(names).toContain("Projeto_Teste_industrial_armazem.pdf");
    expect(names.filter((n) => n.endsWith("_ferragens_totais.pdf"))).toHaveLength(1);
  });
});
