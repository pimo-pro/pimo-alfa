import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import type { BoxModule } from "../src/core/types";
import { defaultRulesConfig } from "../src/core/rules/rulesConfig";
import { gerarPdfTecnicoCompleto } from "./gerarPdfTecnico.v1.9.220f952.ts";
import { buildCutlistPdf, type ProjectForPdf } from "./pdfCutlist.v2.8.9.c0202db.ts";

async function main() {
  const projectName = "Projeto Teste Legacy";

  const boxes: BoxModule[] = [
    {
      id: "box-1",
      nome: "Caixa 1",
      dimensoes: {
        largura: 800,
        altura: 700,
        profundidade: 400,
      },
      espessura: 18,
      material: "MDF Branco",
      tipoBorda: "reta",
      tipoFundo: "integrado",
      models: [],
      prateleiras: 2,
      portaTipo: "porta_dupla",
      gavetas: 0,
      alturaGaveta: 150,
      doorsLayer: [],
      drawersLayer: [],
      ferragens: [],
      cutList: [],
      cutListComPreco: [],
      estrutura3D: null,
      precoTotalPecas: 0,
    },
  ];

  const rules = defaultRulesConfig;

  // PDF Técnico (cabeçalho + tabela industrial)
  const tecnicoDoc = gerarPdfTecnicoCompleto(boxes, rules, projectName, {
    incluirPaginaPrecos: false,
  });

  // Cut List (lista industrial) anexada ao mesmo documento
  const pdfProject: ProjectForPdf = {
    projectName,
    boxes,
    rules,
    materialId: undefined,
    extractedPartsByBoxId: {},
  };
  const fullDoc = buildCutlistPdf(pdfProject, tecnicoDoc);

  const outputDir = join(__dirname, "output");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const pdfArrayBuffer = fullDoc.output("arraybuffer") as ArrayBuffer;
  const pdfBuffer = Buffer.from(pdfArrayBuffer);
  const outputPath = join(outputDir, "teste-legacy-cutlist-tecnico.pdf");
  writeFileSync(outputPath, pdfBuffer);

  console.log(`PDF legacy gerado em: ${outputPath}`);
}

void main();

