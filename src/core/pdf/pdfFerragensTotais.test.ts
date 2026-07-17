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
      materiaisChapas: [
        { material: "MDF Branco", ref: "mdf_branco-19", medida: "2780�2070�19 mm", quantidade: 3 },
      ],
      ferragens: [
        { material: "Parafuso 4�50", ref: "parafuso_4x50", medida: "4mm � 50mm", quantidade: 120 },
      ],
    }),
  };
});

describe("buildFerragensTotaisPdf", () => {
  it("gera PDF landscape com totais agregados", () => {
    const doc = buildFerragensTotaisPdf(
      {
        boxes: [],
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
