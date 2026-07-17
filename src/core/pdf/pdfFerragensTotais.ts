import jsPDF from "jspdf";
import type { ProjectState } from "../../context/projectTypes";
import type { ComponentType } from "../components/componentTypes";
import type { Ferragem } from "../ferragens/ferragens";
import type { MaterialIndustrial } from "../manufacturing/materials";
import {
  buildFerragensTotaisArmazemData,
  buildFerragensTotaisPdfData,
} from "../industrial/industrialBottomSectionData";
import {
  drawIndustrialSectionPdfHeader,
  drawIndustrialSectionTable,
  industrialSectionPdfFileName,
  resolveIndustrialSectionPdfMeta,
} from "./pdfIndustrialSectionShell";

export function ferragensTotaisPdfFileName(projectName: string): string {
  return industrialSectionPdfFileName(projectName, "ferragens_totais");
}

type FerragensTotaisProject = Pick<
  ProjectState,
  | "boxes"
  | "rules"
  | "materialId"
  | "projectName"
  | "remates"
  | "rodapes"
  | "extractedPartsByBoxId"
  | "pieceObservacoes"
>;

const HEAD = [["Material", "Ref", "Medida", "Quantidade total", "Preço", "Responsável"]];
const HEAD_FER = [["Material / Ferragem", "Ref", "Medida", "Quantidade total", "Preço", "Responsável"]];

function toBody(rows: Array<{ material: string; ref: string; medida: string; quantidade: number }>): string[][] {
  return rows.map((r) => [r.material, r.ref, r.medida, String(r.quantidade), "", ""]);
}

/**
 * PDF industrial ferragens_totais — landscape, totais agregados (chapas + ferragens).
 * Sem detalhe por caixa/peça. Preço e Responsável ficam vazios (edições futuras).
 */
export function buildFerragensTotaisPdf(
  project: FerragensTotaisProject,
  componentTypes: ComponentType[],
  catalogFerragens: Ferragem[],
  materials: MaterialIndustrial[] = []
): jsPDF {
  const meta = resolveIndustrialSectionPdfMeta("Ferragens Totais", project.projectName ?? "Projeto");
  const { materiaisChapas, ferragens } = buildFerragensTotaisArmazemData(
    project,
    componentTypes,
    catalogFerragens,
    materials
  );

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  let y = drawIndustrialSectionPdfHeader(doc, meta);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Materiais (Chapas)", 14, y);
  y += 5;

  drawIndustrialSectionTable(doc, y, HEAD, toBody(materiaisChapas), { fontSize: 9 });
  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Ferragens Totais", 14, y);
  y += 5;

  drawIndustrialSectionTable(doc, y, HEAD_FER, toBody(ferragens), { fontSize: 9 });
  return doc;
}

/** Secção legada para o PDF unificado — mantém formato anterior (não alterar outros PDFs). */
export function appendFerragensTotaisSection(
  doc: jsPDF,
  project: Parameters<typeof buildFerragensTotaisPdf>[0],
  componentTypes: ComponentType[],
  catalogFerragens: Ferragem[]
): void {
  const meta = resolveIndustrialSectionPdfMeta("Ferragens Totais — Resumo Industrial", project.projectName ?? "Projeto");
  const { detalhe, porTipo } = buildFerragensTotaisPdfData(project, componentTypes, catalogFerragens);
  doc.addPage("a4", "portrait");
  let y = drawIndustrialSectionPdfHeader(doc, meta);
  drawIndustrialSectionTable(doc, y, [["Caixa", "Ferragem", "Qtd", "Material", "Código Industrial"]], detalhe, {
    fontSize: 9,
  });
  y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  drawIndustrialSectionTable(doc, y + 8, [["Tipo / Ferragem", "Total"]], porTipo, { fontSize: 10 });
}
