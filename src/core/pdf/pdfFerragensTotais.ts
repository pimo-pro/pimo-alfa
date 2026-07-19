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

/** Placeholder manual — unica adicao visual pedida na coluna Data. */
const DATE_PLACEHOLDER = "__/__/__";

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
  | "ferragemOrla"
  | "orlaPresets"
>;

/**
 * Design original (b303113) ampliado apenas com colunas pedidas:
 * Chapas: + Data
 * Ferragens: Preco → Preco total
 * Formatação: fontSize 9, espacamento original, celulas vazias "" (nao "—").
 */
const HEAD_CHAPAS = [
  ["Material", "Ref", "Medida", "Quantidade total", "Pre\u00e7o", "Data", "Respons\u00e1vel", "Coloprador"],
];
const HEAD_FER = [
  [
    "Material / Ferragem",
    "Ref",
    "Medida",
    "Quantidade total",
    "Pre\u00e7o total",
    "Respons\u00e1vel",
    "Coloprador",
  ],
];

function formatPrecoCell(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return `${Number(value).toFixed(2)}\u20ac`;
}

/** Linhas Materiais (Chapas) — design original + coluna Data. */
export function chapasRowsForFerragensTotaisPdf(materiaisChapas: FerragensTotaisArmazemRow[]): string[][] {
  return materiaisChapas.map((r) => [
    r.material,
    r.ref,
    r.medida,
    String(r.quantidade),
    formatPrecoCell(r.preco),
    DATE_PLACEHOLDER,
    "",
    "",
  ]);
}

/** Linhas Ferragens Totais — design original; Preço total preenchido quando existir. */
export function ferragensRowsForFerragensTotaisPdf(
  rows: Array<{ material: string; ref: string; medida: string; quantidade: number; preco?: number }>
): string[][] {
  return rows.map((r) => {
    const precoTotal =
      r.preco != null && Number.isFinite(r.preco) ? r.preco * r.quantidade : undefined;
    const isMetros = /^\d+([.,]\d+)?\s*m$/i.test(String(r.medida ?? "").trim());
    const qty = isMetros
      ? Number(r.quantidade).toFixed(2)
      : Number.isFinite(r.quantidade) && !Number.isInteger(r.quantidade)
        ? r.quantidade.toFixed(2)
        : String(r.quantidade);
    return [
      r.material,
      r.ref,
      r.medida,
      qty,
      formatPrecoCell(precoTotal),
      "",
      "",
    ];
  });
}

/**
 * PDF industrial ferragens_totais — landscape, totais agregados (chapas + ferragens).
 * Design original intacto; apenas colunas Data / Preço total adicionadas.
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
    ferragemOrla: project.ferragemOrla,
    orlaPresets: project.orlaPresets,
    projectMaterialId: project.materialId,
  });

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  let y = drawIndustrialSectionPdfHeader(doc, meta);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Materiais (Chapas)", 14, y);
  y += 5;

  drawIndustrialSectionTable(doc, y, HEAD_CHAPAS, chapasRowsForFerragensTotaisPdf(materiaisChapas), {
    fontSize: 9,
  });
  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Ferragens Totais", 14, y);
  y += 5;

  drawIndustrialSectionTable(doc, y, HEAD_FER, ferragensRowsForFerragensTotaisPdf(ferragens), {
    fontSize: 9,
  });
  return doc;
}

/** Secção legada para o PDF unificado — mantém formato anterior (não alterar outros PDFs). */
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
    { fontSize: 9 }
  );
  y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  drawIndustrialSectionTable(doc, y + 8, [["Tipo / Ferragem", "Total"]], porTipo, { fontSize: 10 });
}
