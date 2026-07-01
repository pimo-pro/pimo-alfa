import { describe, expect, it } from "vitest";
import { buildIndustrialFerragensForProject } from "../industriais/buildIndustrialFerragensForProject";
import { buildFerragensIndustriaisXlsxBuffer } from "./xlsxFerragensIndustriais";
import { industrialFerragensXlsxFileName } from "../fabrication/industrialProjectArtifacts";
import { defaultRulesConfig } from "../rules/rulesConfig";

describe("xlsxFerragensIndustriais", () => {
  it("gera XLSX com cabeçalhos e linhas", async () => {
    const data = buildIndustrialFerragensForProject({
      projectName: "Teste Ferragens XLSX",
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
    const buffer = await buildFerragensIndustriaisXlsxBuffer(data);
    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(industrialFerragensXlsxFileName("Teste Ferragens XLSX")).toBe(
      "Teste_Ferragens_XLSX_industrial_ferragens.xlsx"
    );
  });
});
