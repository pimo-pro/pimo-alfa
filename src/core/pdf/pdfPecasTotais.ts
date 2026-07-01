import type jsPDF from "jspdf";
import type { ProjectState } from "../../context/projectTypes";
import type { MaterialIndustrial } from "../manufacturing/materials";
import { buildPecasTotaisRows } from "../industrial/industrialBottomSectionData";
import {
  createIndustrialSectionPdf,
  drawIndustrialSectionPdfHeader,
  drawIndustrialSectionTable,
  industrialSectionPdfFileName,
  resolveIndustrialSectionPdfMeta,
} from "./pdfIndustrialSectionShell";

export function pecasTotaisPdfFileName(projectName: string): string {
  return industrialSectionPdfFileName(projectName, "pecas_totais");
}

export function buildPecasTotaisPdf(
  project: Pick<
    ProjectState,
    "boxes" | "rules" | "materialId" | "projectName" | "remates" | "rodapes" | "extractedPartsByBoxId"
  >,
  materials: MaterialIndustrial[]
): jsPDF {
  const rows = buildPecasTotaisRows(project, materials);
  const meta = resolveIndustrialSectionPdfMeta(
    "Peças Totais — Cutlist + Portas + Gavetas + Remates",
    project.projectName ?? "Projeto"
  );
  const body = rows.map((r) => [
    r.categoria,
    r.caixa,
    r.tipo,
    r.dimensoes,
    r.material,
    `${r.pesoKg.toFixed(3)} kg`,
    String(r.qtd),
  ]);

  return createIndustrialSectionPdf(
    meta,
    [["Categoria", "Caixa", "Tipo", "Dimensões", "Material", "Peso", "Qtd"]],
    body,
    { fontSize: 9 }
  );
}

export function appendPecasTotaisSection(doc: jsPDF, project: Parameters<typeof buildPecasTotaisPdf>[0], materials: MaterialIndustrial[]): void {
  const rows = buildPecasTotaisRows(project, materials);
  const meta = resolveIndustrialSectionPdfMeta(
    "Peças Totais — Cutlist + Portas + Gavetas + Remates",
    project.projectName ?? "Projeto"
  );
  doc.addPage("a4", "portrait");
  const y = drawIndustrialSectionPdfHeader(doc, meta);
  drawIndustrialSectionTable(
    doc,
    y,
    [["Categoria", "Caixa", "Tipo", "Dimensões", "Material", "Peso", "Qtd"]],
    rows.map((r) => [
      r.categoria,
      r.caixa,
      r.tipo,
      r.dimensoes,
      r.material,
      `${r.pesoKg.toFixed(3)} kg`,
      String(r.qtd),
    ]),
    { fontSize: 9 }
  );
}
