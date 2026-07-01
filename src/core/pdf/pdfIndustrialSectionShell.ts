import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatIndustrialDesignDate } from "./pdfIndustrialListShell";
import { getCurrentProjectUser } from "../projects/currentUser";

const MARGIN = 14;
const GRID_COLOR: [number, number, number] = [0, 0, 0];
const FONT_SIZE = 11;

export type IndustrialSectionPdfMeta = {
  sectionTitle: string;
  projectName: string;
  companyName?: string;
  designer?: string;
  exportDate?: string;
  responsible?: string;
};

export function resolveIndustrialSectionPdfMeta(
  sectionTitle: string,
  projectName: string,
  overrides?: Partial<IndustrialSectionPdfMeta>
): IndustrialSectionPdfMeta {
  const user = getCurrentProjectUser();
  return {
    sectionTitle,
    projectName: projectName?.trim() || "Projeto",
    companyName: overrides?.companyName ?? "PIMO PRO",
    designer: overrides?.designer ?? (user.ownerName || "—"),
    exportDate: overrides?.exportDate ?? formatIndustrialDesignDate(),
    responsible: overrides?.responsible ?? "—",
  };
}

export function drawIndustrialSectionPdfHeader(doc: jsPDF, meta: IndustrialSectionPdfMeta): number {
  let y = MARGIN;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PIMO PRO", MARGIN, y);
  y += 7;

  doc.setFontSize(13);
  doc.text(meta.sectionTitle, MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZE);
  const line = (label: string, value: string) => {
    doc.text(`${label}: ${value}`, MARGIN, y);
    y += 5.2;
  };

  line("Empresa", meta.companyName ?? "PIMO PRO");
  line("Projeto", meta.projectName);
  line("Designer", meta.designer ?? "—");
  line("Data de exportação", meta.exportDate ?? formatIndustrialDesignDate());
  line("Responsável", meta.responsible ?? "—");
  y += 2;
  return y;
}

export function drawIndustrialSectionTable(
  doc: jsPDF,
  startY: number,
  head: string[][],
  body: string[][],
  options?: { fontSize?: number }
): void {
  const fontSize = options?.fontSize ?? FONT_SIZE;
  autoTable(doc, {
    head,
    body: body.length > 0 ? body : [["—", "Sem dados"]],
    startY,
    styles: {
      font: "helvetica",
      fontSize,
      textColor: [0, 0, 0],
      lineColor: GRID_COLOR,
      lineWidth: 0.12,
      cellPadding: 1.8,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineColor: GRID_COLOR,
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    margin: { left: MARGIN, right: MARGIN },
    theme: "grid",
  });
}

export function createIndustrialSectionPdf(
  meta: IndustrialSectionPdfMeta,
  head: string[][],
  body: string[][],
  options?: { fontSize?: number }
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const y = drawIndustrialSectionPdfHeader(doc, meta);
  drawIndustrialSectionTable(doc, y, head, body, options);
  return doc;
}

export function industrialSectionPdfFileName(
  projectNameOrSlug: string,
  suffix: string
): string {
  const safe =
    (projectNameOrSlug || "projeto")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s+/g, "_") || "projeto";
  return `${safe}_${suffix}.pdf`;
}
