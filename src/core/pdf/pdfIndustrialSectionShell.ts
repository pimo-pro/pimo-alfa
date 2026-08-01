import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatIndustrialDesignDate } from "./pdfIndustrialListShell";
import { resolveIndustrialPdfAttribution } from "./industrialPdfAttribution";
import {
  drawLogoIndustrialInBox,
  getCachedLogoIndustrialDataUrl,
  LOGO_INDUSTRIAL_SIZE_MM,
} from "./logoIndustrialPublic";
import { getIndustrialLiveProject } from "../industrial/onlineAnalysis/industrialLiveProjectStore";
import {
  resolveEmpresaExecutora,
  resolveProjectDesigner,
} from "../projects/projectMeta";

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
  const attribution = resolveIndustrialPdfAttribution();
  const liveState = getIndustrialLiveProject()?.state;
  const liveCompany = liveState ? resolveEmpresaExecutora(liveState) : undefined;
  const liveDesigner = liveState?.designer?.trim()
    ? resolveProjectDesigner(liveState)
    : undefined;
  return {
    sectionTitle,
    projectName: projectName?.trim() || "Projeto",
    companyName: overrides?.companyName ?? liveCompany ?? "PIMO PRO",
    designer: overrides?.designer ?? liveDesigner ?? attribution.designer,
    exportDate: overrides?.exportDate ?? formatIndustrialDesignDate(),
    responsible: overrides?.responsible ?? attribution.responsible,
  };
}

function resolveLogoDataUrl(options?: { logoDataUrl?: string | null }): string | null {
  if (options?.logoDataUrl !== undefined) return options.logoDataUrl;
  return getCachedLogoIndustrialDataUrl();
}

/** Cabeçalho industrial: logo 10×10 mm + PIMO PRO + meta. */
export function drawIndustrialSectionPdfHeader(
  doc: jsPDF,
  meta: IndustrialSectionPdfMeta,
  options?: { logoDataUrl?: string | null; showLogo?: boolean }
): number {
  let y = MARGIN;
  doc.setTextColor(0, 0, 0);

  const logoDataUrl = resolveLogoDataUrl(options);
  const showLogo = options?.showLogo !== false;
  const logoSize = LOGO_INDUSTRIAL_SIZE_MM;

  if (showLogo) {
    drawLogoIndustrialInBox(doc, logoDataUrl, MARGIN, y, logoSize);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PIMO PRO", MARGIN + logoSize + 2, y + logoSize * 0.65);
    y += logoSize + 4;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PIMO PRO", MARGIN, y);
    y += 7;
  }

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

/** Cabeçalho compacto — logo industrial + PIMO PRO + título. */
export function drawIndustrialSectionPdfBrandOnly(
  doc: jsPDF,
  sectionTitle: string,
  options?: { logoDataUrl?: string | null }
): number {
  let y = MARGIN;
  doc.setTextColor(0, 0, 0);
  const logoDataUrl = resolveLogoDataUrl(options);
  const logoSize = LOGO_INDUSTRIAL_SIZE_MM;
  drawLogoIndustrialInBox(doc, logoDataUrl, MARGIN, y, logoSize);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PIMO PRO", MARGIN + logoSize + 2, y + logoSize * 0.65);
  y += logoSize + 3;
  doc.setFontSize(12);
  doc.text(sectionTitle, MARGIN, y);
  y += 8;
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
  options?: { fontSize?: number; logoDataUrl?: string | null }
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const y = drawIndustrialSectionPdfHeader(doc, meta, { logoDataUrl: options?.logoDataUrl });
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
