/**
 * Gera PDFs de amostra e valida strings do layout industrial.
 * Também grava ficheiros em test-output/ para inspeção visual.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { gerarPdfTecnicoCompleto } from "./gerarPdfTecnico";
import { buildCutlistPdf } from "./pdfCutlist";
import { buildUnifiedPdf } from "./pdfUnified";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { BoxModule } from "../types";

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

function pdfToLatin1Text(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("latin1");
}

describe("PDF layout industrial — geração de amostra", () => {
  it("tecnico.pdf com layout novo (landscape, CNC, CORTE manual, sem NESTING)", async () => {
    const projectName = "PROJETO_TESTE_LAYOUT_PDF";
    const doc = gerarPdfTecnicoCompleto(boxes, defaultRulesConfig, projectName);
    const buf = doc.output("arraybuffer");
    const text = pdfToLatin1Text(buf);

    expect(text).toContain("PIMO");
    expect(text).toContain("Designer:");
    expect(text).toContain("Data de design:");
    expect(text).toContain("CORTE manual");
    expect(text).toContain("OBSERVA");
    expect(text).toContain("No ETQ");
    expect(text).toContain("REF PECA");
    expect(text).toContain("CNC");
    expect(text).not.toMatch(/CORTE DISCO|CORTE NESTING|FOLHEAGEM|NESTING/);

    const outDir = path.join(process.cwd(), "test-output");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "tecnico-test.pdf"), Buffer.from(buf));
  });

  it("cutlist.pdf com shell partilhado", async () => {
    const projectName = "PROJETO_TESTE_LAYOUT_PDF";
    const doc = await buildCutlistPdf({ projectName, boxes, rules: defaultRulesConfig });
    const buf = doc.output("arraybuffer");
    const text = pdfToLatin1Text(buf);

    expect(text).toContain("PIMO");
    expect(text).toContain("CORTE manual");
    expect(text).toContain("Lista de Corte");
    expect(text).toContain("No ETQ");
    expect(text).not.toMatch(/CORTE DISCO|FOLHEAGEM|NESTING/);

    const outDir = path.join(process.cwd(), "test-output");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "cutlist-test.pdf"), Buffer.from(buf));
  });

  it("unified.pdf com secções técnico + cutlist no layout novo", async () => {
    const projectName = "PROJETO_TESTE_LAYOUT_PDF";
    const doc = await buildUnifiedPdf({ projectName, boxes, rules: defaultRulesConfig });
    const buf = doc.output("arraybuffer");
    const text = pdfToLatin1Text(buf);
    const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();

    expect(pageCount).toBeGreaterThan(1);
    expect(text).toContain("PIMO");
    expect(text).toContain("CORTE manual");
    expect(text).toContain("Lista de Corte - Painéis");
    expect(text).toContain("Lista de Corte");
    expect(text).not.toMatch(/CORTE DISCO|FOLHEAGEM|NESTING/);

    const outDir = path.join(process.cwd(), "test-output");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "unified-test.pdf"), Buffer.from(buf));
  });
});
