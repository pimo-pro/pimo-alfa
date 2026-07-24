/**
 * P3.7/P3.8 — Secao PDF — Financeiro pecas (A4 landscape).
 */

import type jsPDF from "jspdf";
import type { ProjectState } from "../../context/projectTypes";
import type { MaterialIndustrial } from "../manufacturing/materials";
import type { IndustrialPieceEditsStore } from "../industrial/industrialPieceEditsTypes";
import {
  buildFinanceiroPecasPdfRows,
  financeiroPecasPdfHead,
  type FinanceiroPecasBuildInput,
} from "../financeiro/financeiroPecasBuilder";
import {
  drawIndustrialSectionPdfHeader,
  drawIndustrialSectionTable,
  resolveIndustrialSectionPdfMeta,
} from "./pdfIndustrialSectionShell";

export type FinanceiroPecasPdfProject = Pick<
  ProjectState,
  | "boxes"
  | "rules"
  | "materialId"
  | "projectName"
  | "remates"
  | "rodapes"
  | "extractedPartsByBoxId"
  | "ferragemOrla"
  | "orlaPresets"
> &
  Partial<
    Pick<
      ProjectState,
      "financeiroOverrides" | "financeiroAdminSettings" | "orlaPieces" | "orlaJuntoPairs"
    >
  > & {
    industrialPieceEdits?: IndustrialPieceEditsStore;
  };

function toBuildInput(project: FinanceiroPecasPdfProject): FinanceiroPecasBuildInput {
  return {
    boxes: project.boxes,
    rules: project.rules,
    materialId: project.materialId,
    projectName: project.projectName,
    remates: project.remates,
    rodapes: project.rodapes,
    extractedPartsByBoxId: project.extractedPartsByBoxId,
    industrialPieceEdits: project.industrialPieceEdits,
    ferragemOrla: project.ferragemOrla,
    financeiroOverrides: project.financeiroOverrides,
    financeiroAdminSettings: project.financeiroAdminSettings,
    orlaPieces: project.orlaPieces,
    orlaPresets: project.orlaPresets,
    orlaJuntoPairs: project.orlaJuntoPairs,
  };
}

const SECTION_TITLE = "Financeiro pe\u00e7as";

/** Pagina landscape standalone (ou apos cabecalho ja desenhado). */
export function appendFinanceiroPecasSection(
  doc: jsPDF,
  project: FinanceiroPecasPdfProject,
  materials: MaterialIndustrial[],
  showPrices: boolean
): void {
  const projectName = project.projectName?.trim() || "Projeto";
  const meta = resolveIndustrialSectionPdfMeta(SECTION_TITLE, projectName);
  const head = [financeiroPecasPdfHead(showPrices)];
  const body = buildFinanceiroPecasPdfRows(toBuildInput(project), materials, showPrices);

  doc.addPage("a4", "landscape");
  const y = drawIndustrialSectionPdfHeader(doc, meta);
  drawIndustrialSectionTable(doc, y, head, body, { fontSize: 7 });
}

/** Desenha a secao na mesma pagina se houver espaco; senao nova pagina. */
export function drawFinanceiroPecasSectionOnDoc(
  doc: jsPDF,
  startY: number,
  project: FinanceiroPecasPdfProject,
  materials: MaterialIndustrial[],
  showPrices: boolean
): number {
  const head = [financeiroPecasPdfHead(showPrices)];
  const body = buildFinanceiroPecasPdfRows(toBuildInput(project), materials, showPrices);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(SECTION_TITLE, 14, startY);
  const y = startY + 5;
  drawIndustrialSectionTable(doc, y, head, body, { fontSize: 7 });
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
}
