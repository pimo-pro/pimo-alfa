/**
 * Gera PDFs de teste (técnico + cutlist) para validação visual do layout.
 * Uso: npx tsx scripts/generatePdfTecnicoTest.mts
 */
import fs from "node:fs";
import path from "node:path";
import { gerarPdfTecnicoCompleto } from "../src/core/pdf/gerarPdfTecnico.ts";
import { buildCutlistPdf } from "../src/core/pdf/pdfCutlist.ts";
import { defaultRulesConfig } from "../src/core/rules/rulesConfig.ts";
import { withIndustrialOutputAuthorization } from "../src/core/industrial/industrialOutputGuard.ts";
import type { BoxModule } from "../src/core/types.ts";

const boxes: BoxModule[] = [
  {
    id: "box-test-1",
    nome: "Armario Base Teste",
    dimensoes: { largura: 600, altura: 720, profundidade: 500 },
    espessura: 18,
    material: "mdf_branco",
    posicao: 0,
    portaTipo: "sem_porta",
    gavetas: 0,
    prateleiras: 1,
    tipoBorda: "reta",
    cutList: [
      {
        id: "p1",
        tipo: "cima",
        quantidade: 1,
        dimensoes: { largura: 564, altura: 464, profundidade: 18 },
        espessura: 18,
        material: "mdf_branco",
      },
      {
        id: "p2",
        tipo: "lateral_esquerda",
        quantidade: 2,
        dimensoes: { largura: 500, altura: 684, profundidade: 18 },
        espessura: 18,
        material: "mdf_branco",
      },
    ],
  } as BoxModule,
];

const outDir = path.join(process.cwd(), "test-output");
fs.mkdirSync(outDir, { recursive: true });

const projectName = "PROJETO_TESTE_LAYOUT_PDF";
const rules = defaultRulesConfig;

const docTecnico = gerarPdfTecnicoCompleto(boxes, rules, projectName);
const tecnicoPath = path.join(outDir, "tecnico-test.pdf");
fs.writeFileSync(tecnicoPath, Buffer.from(docTecnico.output("arraybuffer")));

const docCutlist = await withIndustrialOutputAuthorization("pdf-cutlist", () =>
  buildCutlistPdf({ projectName, boxes, rules })
);
const cutlistPath = path.join(outDir, "cutlist-test.pdf");
fs.writeFileSync(cutlistPath, Buffer.from(docCutlist.output("arraybuffer")));

console.log(JSON.stringify({ tecnicoPath, cutlistPath, ok: true }, null, 2));
