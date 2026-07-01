import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProjectIndustrialFerragens } from "../industriais/buildIndustrialFerragensForProject";
import { formatIndustrialDesignDate } from "./pdfIndustrialListShell";

const MARGIN = 14;
const FONT_SIZE = 11;
const LINE_HEIGHT_FACTOR = 1.2;
const GRID_COLOR: [number, number, number] = [0, 0, 0];

function formatGeneratedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatIndustrialDesignDate();
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function buildFerragensIndustriaisPdf(data: ProjectIndustrialFerragens): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = MARGIN;

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Ferragens Industriais — Resumo Geral", MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZE);
  const lineStep = (FONT_SIZE * LINE_HEIGHT_FACTOR * 25.4) / 72;
  doc.text(`Projeto: ${data.projectName}`, MARGIN, y);
  y += lineStep;
  doc.text(`Código: ${data.projectCode}`, MARGIN, y);
  y += lineStep;
  doc.text(`Data: ${formatGeneratedDate(data.generatedAt)}`, MARGIN, y);
  y += lineStep * 1.2;

  const head = [
    ["Caixa", "Peça", "Ferragem", "Qtd", "Material", "Código Industrial", "ShortCode", "Observações"],
  ];
  const body =
    data.rows.length > 0
      ? data.rows.map((r) => [
          r.caixa,
          r.peca,
          r.ferragem,
          String(r.qtd),
          r.material,
          r.codigoIndustrial,
          r.shortCode,
          r.observacoes,
        ])
      : [["—", "—", "Sem ferragens", "0", "—", "—", "—", "—"]];

  autoTable(doc, {
    head,
    body,
    startY: y,
    styles: {
      font: "helvetica",
      fontSize: FONT_SIZE,
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

  return doc;
}
