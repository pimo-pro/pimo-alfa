import jsPDF from "jspdf";
import type { ProjectState } from "../../context/projectTypes";
import type { ComponentType } from "../components/componentTypes";
import type { Ferragem } from "../ferragens/ferragens";
import type { MaterialIndustrial } from "../manufacturing/materials";
import {
  buildFerragensTotaisArmazemData,
  buildFerragensTotaisPdfData,
  type FerragensTotaisArmazemRow,
} from "../industrial/industrialBottomSectionData";
import { buildCutlistItemsForIndustrialExport } from "../fabrication/buildCutlistItemsForIndustrialExport";
import {
  drawIndustrialSectionPdfHeader,
  drawIndustrialSectionTable,
  industrialSectionPdfFileName,
  resolveIndustrialSectionPdfMeta,
} from "./pdfIndustrialSectionShell";
import { normalizeFerragensTotaisForPdf } from "./pdfFerragensTotaisNormalize";

const EM_DASH = "\u2014";

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

const HEAD_CHAPAS = [["TOTAL Chapas", "Material", "Espessura"]];
const HEAD_FER = [
  ["Material / Ferragem", "Ref", "Medida", "Quantidade Total", "Pre\u00e7o", "Respons\u00e1vel"],
];

function extractEspessuraLabel(medida: string): string {
  const raw = String(medida ?? "").trim();
  // Formato tipico: "2800x2070x19 mm" ou "2800\times2070\times19 mm"
  const match = raw.match(/(\d+)\s*mm\s*$/i);
  if (match) return `${match[1]} mm`;
  const parts = raw.split(/[x\u00d7\times]/i).map((p) => p.trim());
  const last = parts[parts.length - 1]?.replace(/[^\d.]/g, "");
  if (last) return `${last} mm`;
  return EM_DASH;
}

/** Converte materiaisChapas para o estilo visual do industrial_armazem (UTF-8). */
export function chapasRowsForFerragensTotaisPdf(materiaisChapas: FerragensTotaisArmazemRow[]): string[][] {
  if (!materiaisChapas.length) return [];
  return materiaisChapas.map((r) => [
    String(r.quantidade),
    r.material || EM_DASH,
    extractEspessuraLabel(r.medida),
  ]);
}

function toBody(
  rows: Array<{ material: string; ref: string; medida: string; quantidade: number; preco?: number }>
): string[][] {
  return rows.map((r) => [
    r.material,
    r.ref || EM_DASH,
    r.medida || EM_DASH,
    String(r.quantidade),
    r.preco != null && Number.isFinite(r.preco) ? `${Number(r.preco).toFixed(2)}\u20ac` : EM_DASH,
    EM_DASH,
  ]);
}

/**
 * PDF oficial ferragens_totais — landscape A4:
 * 1) Materiais (Chapas) no estilo industrial_armazem
 * 2) Ferragens Totais (tabela unica normalizada)
 * Nao substitui industrial_armazem.pdf.
 */
export function buildFerragensTotaisPdf(
  project: FerragensTotaisProject,
  componentTypes: ComponentType[],
  catalogFerragens: Ferragem[],
  materials: MaterialIndustrial[] = []
): jsPDF {
  const meta = resolveIndustrialSectionPdfMeta("Ferragens Totais", project.projectName ?? "Projeto");
  const { materiaisChapas, ferragens: rawFerragens } = buildFerragensTotaisArmazemData(
    project,
    componentTypes,
    catalogFerragens,
    materials
  );

  const boxes = project.boxes ?? [];
  const projectName = project.projectName?.trim() || "Projeto";
  const cutlistItems = buildCutlistItemsForIndustrialExport({
    boxes,
    rules: project.rules,
    materialId: project.materialId,
    projectName,
    remates: project.remates ?? [],
    rodapes: project.rodapes ?? [],
    extractedPartsByBoxId: project.extractedPartsByBoxId,
  });

  const ferragens = normalizeFerragensTotaisForPdf({
    ferragens: rawFerragens,
    cutlistItems,
    boxes,
    rules: project.rules,
  });

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  let y = drawIndustrialSectionPdfHeader(doc, meta);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Materiais (Chapas)", 14, y);
  y += 5;

  const chapasBody = chapasRowsForFerragensTotaisPdf(materiaisChapas);
  drawIndustrialSectionTable(
    doc,
    y,
    HEAD_CHAPAS,
    chapasBody.length > 0 ? chapasBody : [["0", EM_DASH, EM_DASH]],
    { fontSize: 9 }
  );
  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 28;
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Ferragens Totais", 14, y);
  y += 5;

  drawIndustrialSectionTable(doc, y, HEAD_FER, toBody(ferragens), { fontSize: 9 });
  return doc;
}

/** Seccao legada para o PDF unificado — mantem formato anterior (nao alterar outros PDFs). */
export function appendFerragensTotaisSection(
  doc: jsPDF,
  project: Parameters<typeof buildFerragensTotaisPdf>[0],
  componentTypes: ComponentType[],
  catalogFerragens: Ferragem[]
): void {
  const meta = resolveIndustrialSectionPdfMeta(
    "Ferragens Totais \u2014 Resumo Industrial",
    project.projectName ?? "Projeto"
  );
  const { detalhe, porTipo } = buildFerragensTotaisPdfData(project, componentTypes, catalogFerragens);
  doc.addPage("a4", "portrait");
  let y = drawIndustrialSectionPdfHeader(doc, meta);
  drawIndustrialSectionTable(
    doc,
    y,
    [["Caixa", "Ferragem", "Qtd", "Material", "C\u00f3digo Industrial"]],
    detalhe,
    {
      fontSize: 9,
    }
  );
  y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  drawIndustrialSectionTable(doc, y + 8, [["Tipo / Ferragem", "Total"]], porTipo, { fontSize: 10 });
}
