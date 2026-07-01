/**
 * PDF Unificado — Cutlist Industrial, Painéis, Portas, Gavetas, Ferragens, Totais, Resumo Financeiro.
 * Cada seção só é incluída se houver conteúdo real.
 */

import type jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { gerarPdfTecnicoCompleto } from "./gerarPdfTecnico";
import { buildCutlistPdf, type ProjectForPdf } from "./pdfCutlist";
import { cutlistComPrecoFromBoxes } from "../manufacturing/cutlistFromBoxes";
import { ferragensFromBoxes } from "../manufacturing/cutlistFromBoxes";
import { buildIndustrialFerragensForProject } from "../industriais/buildIndustrialFerragensForProject";
import { appendFerragensIndustriaisSection } from "./pdfFerragensIndustriais";
import { appendResumoFinanceiroSection } from "./pdfResumoFinanceiro";
import { appendPecasTotaisSection } from "./pdfPecasTotais";
import { appendFerragensTotaisSection } from "./pdfFerragensTotais";
import { appendTotaisProjetoSection, type TotaisProjetoPdfExtras } from "./pdfTotaisProjeto";
import type { RematePiece } from "../remate/rematePieceTypes";
import type { ProjectRodape } from "../rodape/rodapeTypes";
import type { MaterialIndustrial } from "../manufacturing/materials";
import type { ComponentType } from "../components/componentTypes";
import type { Ferragem } from "../ferragens/ferragens";
import {
  calcularPrecoTotalPecas,
  calcularPrecoTotalProjeto,
} from "../pricing/pricing";
import { formatCurrency } from "../../utils/formatting";

/** Alias ao `ProjectForPdf` da cutlist (inclui extractedPartsByBoxId e precomputedItems). */
export type ProjectForPdfWithExtracted = ProjectForPdf & {
  remates?: RematePiece[];
  rodapes?: ProjectRodape[];
};

export type UnifiedPdfIndustrialContext = {
  materials: MaterialIndustrial[];
  componentTypes: ComponentType[];
  ferragens: Ferragem[];
  showPrices?: boolean;
  totaisExtras?: TotaisProjetoPdfExtras;
};

const MARGIN = 14;
const HEADER_COLOR: [number, number, number] = [15, 23, 42];

function addPainéisSection(doc: jsPDF, project: ProjectForPdfWithExtracted): void {
  if (!project.boxes.length) return;
  doc.addPage("a4", "portrait");
  let y = MARGIN;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Painéis (Caixas)", MARGIN, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  project.boxes.forEach((box, i) => {
    const d = box.dimensoes;
    doc.text(
      `${i + 1}. ${box.nome} — ${d.largura}×${d.altura}×${d.profundidade} mm`,
      MARGIN,
      y
    );
    y += 6;
  });
}

function addPortasSection(doc: jsPDF, project: ProjectForPdfWithExtracted): void {
  const comPortas = project.boxes.filter(
    (b) => b.portaTipo && b.portaTipo !== "sem_porta"
  );
  if (comPortas.length === 0) return;
  doc.addPage("a4", "portrait");
  let y = MARGIN;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Portas", MARGIN, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  comPortas.forEach((box) => {
    doc.text(`${box.nome}: ${box.portaTipo ?? "—"}`, MARGIN, y);
    y += 6;
  });
}

function addGavetasSection(doc: jsPDF, project: ProjectForPdfWithExtracted): void {
  const comGavetas = project.boxes.filter((b) => (b.gavetas ?? 0) > 0);
  if (comGavetas.length === 0) return;
  doc.addPage("a4", "portrait");
  let y = MARGIN;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Gavetas", MARGIN, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  comGavetas.forEach((box) => {
    doc.text(`${box.nome}: ${box.gavetas ?? 0} gaveta(s)`, MARGIN, y);
    y += 6;
  });
}

function addFerragensSection(doc: jsPDF, project: ProjectForPdfWithExtracted): void {
  const lista = ferragensFromBoxes(project.boxes, project.rules);
  if (lista.length === 0) return;
  doc.addPage("a4", "portrait");
  let y = MARGIN;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Ferragens Industriais (todas as caixas)", MARGIN, y);
  y += 10;
  const head = [["Ferragem", "Quantidade", "Preço total"]];
  const body = lista.map((a) => [
    a.nome,
    String(a.quantidade),
    formatCurrency(a.precoTotal, { placement: "prefix", empty: "—" }),
  ]);
  autoTable(doc, {
    head,
    body,
    startY: y,
    styles: { fontSize: 9 },
    headStyles: { fillColor: HEADER_COLOR },
    margin: { left: MARGIN, right: MARGIN },
  });
}

function addFerragensDetalhadoSection(doc: jsPDF, project: ProjectForPdfWithExtracted): void {
  const head = [["Caixa", "Ferragem", "Quantidade", "Preço total"]];
  const body: string[][] = [];
  for (const box of project.boxes) {
    const lista = ferragensFromBoxes([box], project.rules);
    for (const a of lista) {
      body.push([
        box.nome ?? box.id,
        a.nome,
        String(a.quantidade),
        formatCurrency(a.precoTotal, { placement: "prefix", empty: "—" }),
      ]);
    }
  }
  if (body.length === 0) return;
  doc.addPage("a4", "portrait");
  let y = MARGIN;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Ferragens Industriais (detalhado)", MARGIN, y);
  y += 10;
  autoTable(doc, {
    head,
    body,
    startY: y,
    styles: { fontSize: 8 },
    headStyles: { fillColor: HEADER_COLOR },
    margin: { left: MARGIN, right: MARGIN },
  });
}

function addFerragensIndustriaisResumoSection(doc: jsPDF, project: ProjectForPdfWithExtracted): void {
  const data = buildIndustrialFerragensForProject({
    projectName: project.projectName,
    boxes: project.boxes,
    rules: project.rules,
    materialId: project.materialId,
    extractedPartsByBoxId: project.extractedPartsByBoxId,
    remates: project.remates ?? [],
    rodapes: project.rodapes ?? [],
    pieceObservacoes: project.pieceObservacoes,
  });
  appendFerragensIndustriaisSection(doc, data, {
    includePageBreak: true,
    includeHeader: true,
  });
}

function addTotaisEResumoSection(doc: jsPDF, project: ProjectForPdfWithExtracted): void {
  doc.addPage("a4", "portrait");
  let y = MARGIN;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Totais do Projeto", MARGIN, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const cutlist = cutlistComPrecoFromBoxes(
    project.boxes,
    project.rules,
    project.materialId,
    project.projectName
  );
  const extracted = (project.extractedPartsByBoxId ?? {});
  const extractedList = project.boxes.flatMap((b) =>
    Object.values(extracted[b.id] ?? {}).flat()
  );
  const totalPecas = cutlist.reduce((s, i) => s + i.quantidade, 0)
    + extractedList.reduce((s, i) => s + i.quantidade, 0);
  doc.text(`Caixas: ${project.boxes.length}`, MARGIN, y);
  y += 6;
  doc.text(`Total de peças (cutlist): ${totalPecas}`, MARGIN, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resumo Financeiro", MARGIN, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const allCutlist = [...cutlist, ...extractedList];
  const totalPecasPreco =
    allCutlist.length > 0 ? calcularPrecoTotalPecas(allCutlist) : 0;
  const ferragens = ferragensFromBoxes(project.boxes, project.rules);
  const totalFerragensPreco = ferragens.reduce((s, a) => s + (a.precoTotal ?? 0), 0);
  const baseTotal = totalPecasPreco + totalFerragensPreco;
  const totalProjeto = baseTotal > 0 ? calcularPrecoTotalProjeto(baseTotal) : 0;
  doc.text(
    `Total peças: ${formatCurrency(totalPecasPreco, { placement: "prefix", empty: "—" })}`,
    MARGIN,
    y
  );
  y += 6;
  doc.text(
    `Total ferragens: ${formatCurrency(totalFerragensPreco, { placement: "prefix", empty: "—" })}`,
    MARGIN,
    y
  );
  y += 6;
  doc.text(
    `Total projeto (c/ margem): ${formatCurrency(totalProjeto, { placement: "prefix", empty: "—" })}`,
    MARGIN,
    y
  );
}

/**
 * Gera PDF unificado: Técnico + Cutlist + Painéis + Portas (se existir) + Gavetas (se existir)
 * + Ferragens Industriais + Totais e Resumo Financeiro.
 */
export async function buildUnifiedPdf(
  project: ProjectForPdfWithExtracted,
  industrial?: UnifiedPdfIndustrialContext
): Promise<jsPDF> {
  const doc = gerarPdfTecnicoCompleto(project.boxes, project.rules, project.projectName, {
    materialId: project.materialId,
    extractedPartsByBoxId: project.extractedPartsByBoxId,
    precomputedItems: project.precomputedItems,
    pieceObservacoes: project.pieceObservacoes,
  });
  await buildCutlistPdf(project, doc);
  addPainéisSection(doc, project);

  if (industrial) {
    appendResumoFinanceiroSection(
      doc,
      project.boxes,
      project.rules,
      project.materialId,
      project.projectName,
      industrial.materials,
      industrial.showPrices ?? false
    );
    appendPecasTotaisSection(
      doc,
      {
        boxes: project.boxes,
        rules: project.rules,
        materialId: project.materialId,
        projectName: project.projectName,
        remates: project.remates ?? [],
        rodapes: project.rodapes ?? [],
        extractedPartsByBoxId: project.extractedPartsByBoxId,
        industrialPieceEdits: project.industrialPieceEdits,
      },
      industrial.materials
    );
    appendFerragensTotaisSection(
      doc,
      {
        boxes: project.boxes,
        rules: project.rules,
        materialId: project.materialId,
        projectName: project.projectName,
        remates: project.remates ?? [],
        rodapes: project.rodapes ?? [],
        extractedPartsByBoxId: project.extractedPartsByBoxId,
        pieceObservacoes: project.pieceObservacoes ?? {},
      },
      industrial.componentTypes,
      industrial.ferragens
    );
    addFerragensIndustriaisResumoSection(doc, project);
    appendTotaisProjetoSection(
      doc,
      project.boxes,
      project.rules,
      project.materialId,
      project.projectName,
      industrial.materials,
      industrial.showPrices ?? false,
      industrial.totaisExtras
    );
  } else {
    addPortasSection(doc, project);
    addGavetasSection(doc, project);
    addFerragensSection(doc, project);
    addFerragensDetalhadoSection(doc, project);
    addFerragensIndustriaisResumoSection(doc, project);
    addTotaisEResumoSection(doc, project);
  }
  return doc;
}
