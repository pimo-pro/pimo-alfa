import type jsPDF from "jspdf";
import type { ProjectState } from "../../context/projectTypes";
import type { ComponentType } from "../components/componentTypes";
import type { Ferragem } from "../ferragens/ferragens";
import { buildFerragensTotaisPdfData } from "../industrial/industrialBottomSectionData";
import {
  createIndustrialSectionPdf,
  drawIndustrialSectionPdfHeader,
  drawIndustrialSectionTable,
  industrialSectionPdfFileName,
  resolveIndustrialSectionPdfMeta,
} from "./pdfIndustrialSectionShell";

export function ferragensTotaisPdfFileName(projectName: string): string {
  return industrialSectionPdfFileName(projectName, "ferragens_totais");
}

export function buildFerragensTotaisPdf(
  project: Pick<
    ProjectState,
    | "boxes"
    | "rules"
    | "materialId"
    | "projectName"
    | "remates"
    | "rodapes"
    | "extractedPartsByBoxId"
    | "pieceObservacoes"
  >,
  componentTypes: ComponentType[],
  catalogFerragens: Ferragem[]
): jsPDF {
  const meta = resolveIndustrialSectionPdfMeta("Ferragens Totais — Resumo Industrial", project.projectName ?? "Projeto");
  const { detalhe, porTipo } = buildFerragensTotaisPdfData(project, componentTypes, catalogFerragens);

  const doc = createIndustrialSectionPdf(
    meta,
    [["Caixa", "Ferragem", "Qtd", "Material", "Código Industrial"]],
    detalhe,
    { fontSize: 9 }
  );

  const y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;
  drawIndustrialSectionTable(
    doc,
    y + 8,
    [["Tipo / Ferragem", "Total"]],
    porTipo,
    { fontSize: 10 }
  );
  return doc;
}

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
