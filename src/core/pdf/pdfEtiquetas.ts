import jsPDF from "jspdf";
import qrcode from "qrcode-generator";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import { cutlistComPrecoFromBoxes } from "../manufacturing/cutlistFromBoxes";

export type ProjectForEtiquetasPdf = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
  materialId?: string;
  extractedPartsByBoxId?: Record<string, Record<string, CutListItemComPreco[]>>;
};

type LabelItem = CutListItemComPreco & {
  boxNome?: string;
  pieceName?: string;
};

function getCutlistWithMetadata(project: ProjectForEtiquetasPdf): LabelItem[] {
  const parametric = cutlistComPrecoFromBoxes(
    project.boxes,
    project.rules,
    project.materialId,
    project.projectName
  );
  const boxById = new Map(project.boxes.map((b) => [b.id, b]));
  const merged: LabelItem[] = parametric.map((p) => ({
    ...p,
    boxNome: boxById.get(p.boxId ?? "")?.nome ?? p.boxId ?? "—",
    pieceName: p.nome,
  }));

  const extractedByBox = project.extractedPartsByBoxId ?? {};
  for (const box of project.boxes) {
    const byModel = extractedByBox[box.id];
    if (!byModel) continue;
    const extracted = Object.values(byModel).flat();
    for (const p of extracted) {
      merged.push({
        ...p,
        boxNome: box.nome ?? box.id,
        pieceName: p.nome,
      });
    }
  }
  return merged;
}

function orderByCutLayoutPro(items: LabelItem[]): LabelItem[] {
  // Requisito: não recalcular layout; apenas consumir ordem já existente da cutlist final.
  return items;
}

function drawQrFromCode(doc: jsPDF, code: string, x: number, y: number, size: number) {
  const qr = qrcode(0, "M");
  qr.addData(code);
  qr.make();
  const count = qr.getModuleCount();
  const moduleSize = size / Math.max(1, count);
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(0, 0, 0);
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!qr.isDark(r, c)) continue;
      doc.rect(x + c * moduleSize, y + r * moduleSize, moduleSize, moduleSize, "F");
    }
  }
}

function renderEtiquetaPage(doc: jsPDF, item: LabelItem, project: ProjectForEtiquetasPdf) {
  const cfg = project.rules.etiqueta;
  const width = cfg.larguraMm;
  const height = cfg.alturaMm;
  const margin = cfg.margemInternaMm;
  const borderMm = Math.max(0.1, cfg.bordaPx * 0.264583);
  const qrSize = Math.max(12, cfg.tamanhoQr);
  const bodySize = Math.max(6, cfg.tamanhoTexto);

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(borderMm);
  doc.rect(0.5, 0.5, width - 1, height - 1);

  let y = margin + 2;
  doc.setTextColor(10, 10, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  if (cfg.mostrarLogo) {
    doc.text("pi", margin, y);
  }

  const ref = `${project.projectName || "PROJETO"}_${item.boxNome ?? item.boxId ?? "BOX"}_${item.pieceName ?? item.nome}`;
  const refX = cfg.mostrarLogo ? margin + 8 : margin;
  const refMaxW = width - refX - margin;
  if (cfg.mostrarReferencia) {
    const refLines = doc.splitTextToSize(ref.toUpperCase(), refMaxW);
    doc.text(refLines.slice(0, 2), refX, y);
    y += refLines.length > 1 ? 6 : 3.5;
  }

  const qrX = margin;
  const qrY = y + 1.5;
  const shortCode = item.shortCode ?? `N${item.pieceNumber ?? "-"}`;
  drawQrFromCode(doc, shortCode, qrX, qrY, qrSize);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(bodySize + 1);
  doc.text(shortCode, qrX, qrY + qrSize + 4.2);

  let rightY = qrY + 1;
  const rightX = qrX + qrSize + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(bodySize);
  if (cfg.mostrarMaterial) {
    doc.text(`MAT: ${(item.material ?? "-").toUpperCase()}`, rightX, rightY);
    rightY += 4.2;
  }
  if (cfg.mostrarDimensoes) {
    doc.text(
      `LxAxE: ${Math.round(item.dimensoes.largura)}x${Math.round(item.dimensoes.altura)}x${Math.round(item.espessura)}`,
      rightX,
      rightY
    );
    rightY += 4.2;
  }
  doc.setFont("helvetica", "bold");
  doc.text(`N${item.pieceNumber ?? "-"}`, rightX, rightY);
}

export function buildEtiquetasPdf(project: ProjectForEtiquetasPdf): jsPDF {
  const cfg = project.rules.etiqueta;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [cfg.larguraMm, cfg.alturaMm],
  });

  const ordered = orderByCutLayoutPro(getCutlistWithMetadata(project));
  ordered.forEach((item, idx) => {
    if (idx > 0) doc.addPage([cfg.larguraMm, cfg.alturaMm], "landscape");
    renderEtiquetaPage(doc, item, project);
  });
  return doc;
}
