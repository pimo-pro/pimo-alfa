import { describe, expect, it } from "vitest";
import { buildIndustrialFerragensForProject } from "../industriais/buildIndustrialFerragensForProject";
import { buildFerragensIndustriaisPdf } from "./pdfFerragensIndustriais";
import { industrialFerragensPdfFileName } from "../fabrication/industrialProjectArtifacts";
import { defaultRulesConfig } from "../rules/rulesConfig";

describe("pdfFerragensIndustriais", () => {
  it("gera PDF com cabeçalho e tabela", () => {
    const data = buildIndustrialFerragensForProject({
      projectName: "Teste Ferragens",
      boxes: [
        {
          id: "b1",
          nome: "Caixa 1",
          dimensoes: { largura: 600, altura: 720, profundidade: 500 },
          portaTipo: "sem_porta",
          prateleiras: 0,
          gavetas: 0,
        } as never,
      ],
      rules: defaultRulesConfig,
    });
    const doc = buildFerragensIndustriaisPdf(data);
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
    expect(data.projectName).toBe("Teste Ferragens");
    expect(data.rows.length).toBeGreaterThan(0);
    expect(industrialFerragensPdfFileName("Teste Ferragens")).toBe(
      "Teste_Ferragens_industrial_ferragens.pdf"
    );
  });
});
