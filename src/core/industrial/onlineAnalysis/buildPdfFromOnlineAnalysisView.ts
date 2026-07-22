/**
 * PDF industrial a partir da vista efetiva (overrides aplicados).
 */

import type jsPDF from "jspdf";
import type { IndustrialOnlineAnalysisView } from "./buildIndustrialOnlineAnalysisView";
import {
  createIndustrialSectionPdf,
  drawIndustrialSectionPdfHeader,
  drawIndustrialSectionTable,
  resolveIndustrialSectionPdfMeta,
} from "../../pdf/pdfIndustrialSectionShell";

export function buildPdfFromOnlineAnalysisView(view: IndustrialOnlineAnalysisView): jsPDF {
  const meta = resolveIndustrialSectionPdfMeta(view.label, view.projectName);
  const sections = view.sections.filter((s) => s.rows.length > 0);

  if (sections.length === 0) {
    return createIndustrialSectionPdf(meta, [["ù"]], [["Sem dados"]], { fontSize: 9 });
  }

  const first = sections[0];
  const doc = createIndustrialSectionPdf(
    meta,
    [first.columns.map((c) => c.label)],
    first.rows.map((r) => first.columns.map((c) => r.cells[c.key] ?? "ù")),
    { fontSize: 9 }
  );

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    doc.addPage("a4", "portrait");
    const sectionMeta = resolveIndustrialSectionPdfMeta(
      `${view.label} ù ${section.title}`,
      view.projectName
    );
    const y = drawIndustrialSectionPdfHeader(doc, sectionMeta);
    drawIndustrialSectionTable(
      doc,
      y,
      [section.columns.map((c) => c.label)],
      section.rows.map((r) => section.columns.map((c) => r.cells[c.key] ?? "ù")),
      { fontSize: 9 }
    );
  }

  return doc;
}
