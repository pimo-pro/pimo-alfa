/**
 * PDF Cutlist — tabela de peças para corte (cutlistFromBoxes, modelo FINAL).
 * Colunas: Caixa, Peça, Qtd, L×A×P, Borda (fita), Limpeza, Montagem, Verificação, OBSERVAÇÕES, N QR.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import qrcode from "qrcode-generator";
import type { BoxModule, CutListItemComPreco, TechnicalDrillHole } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import { cutlistComPrecoFromBoxes } from "../manufacturing/cutlistFromBoxes";
import { buildLocalQrPayload } from "../qrcode/qrcodeService";

export type ProjectForPdf = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
  materialId?: string;
  extractedPartsByBoxId?: Record<string, Record<string, CutListItemComPreco[]>>;
  settings?: unknown;
};

const MARGIN = 14;
const HEADER_COLOR: [number, number, number] = [15, 23, 42];

function getFullCutlist(project: ProjectForPdf): Array<CutListItemComPreco & { boxNome: string; tipoBorda?: string }> {
  const parametric = cutlistComPrecoFromBoxes(
    project.boxes,
    project.rules,
    project.materialId,
    project.projectName
  );
  const boxById = new Map(project.boxes.map((b) => [b.id, b]));

  const rows: Array<CutListItemComPreco & { boxNome: string; tipoBorda?: string }> = parametric.map((p) => {
    const box = boxById.get(p.boxId ?? "");
    return {
      ...p,
      boxNome: box?.nome ?? p.boxId ?? "—",
      tipoBorda: box?.tipoBorda,
    };
  });

  const extractedByBox = project.extractedPartsByBoxId ?? {};
  for (const box of project.boxes) {
    const byModel = extractedByBox[box.id];
    if (!byModel) continue;
    const extracted = Object.values(byModel).flat();
    for (const p of extracted) {
      rows.push({
        ...p,
        boxNome: box.nome ?? box.id,
        tipoBorda: box.tipoBorda,
      });
    }
  }

  return rows;
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

function renderQrLayer(
  doc: jsPDF,
  parts: Array<CutListItemComPreco & { boxNome?: string; tipoBorda?: string }>,
  project: ProjectForPdf
) {
  const withQr = parts.filter((p) => Number.isFinite(p.pieceNumber) && (p.pieceNumber ?? 0) > 0);
  if (withQr.length === 0) return;
  doc.addPage("a4", "landscape");
  let y = MARGIN;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Cutlist - QR Codes por Peça", MARGIN, y);
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Mesmo código das etiquetas (projeto / caixa / peça / número).", MARGIN, y);
  y += 8;

  const pageW = doc.internal.pageSize.getWidth();
  const cardW = (pageW - MARGIN * 2 - 12) / 3;
  const cardH = 42;
  const qrSize = Math.max(10, project.rules.qrcode.tamanhoQr);
  const textSize = Math.max(6, Math.min(10, project.rules.qrcode.tamanhoTexto));
  let col = 0;
  let rowY = y;

  for (let i = 0; i < withQr.length; i++) {
    const p = withQr[i];
    const x = MARGIN + col * (cardW + 6);
    doc.setDrawColor(180, 180, 180);
    doc.rect(x, rowY, cardW, cardH);
    doc.setFontSize(8);
    doc.text(`${p.boxNome ?? "—"} · ${p.nome}`, x + 2, rowY + 4);
    doc.text(`${p.dimensoes.largura}x${p.dimensoes.altura} mm`, x + 2, rowY + 8);

    const qrX = x + 2;
    const qrY = rowY + 10;
    const pieceNumber = Number(p.pieceNumber ?? 0);
    const qrPayload = buildLocalQrPayload(
      p,
      { projectName: project.projectName, boxes: project.boxes, rules: project.rules },
      pieceNumber
    );
    drawQrFromCode(doc, qrPayload, qrX, qrY, qrSize);

    if (project.rules.qrcode.mostrarTextoAbaixoQr) {
      doc.setFontSize(Math.min(5, textSize));
      doc.setFont("helvetica", "normal");
      doc.text(qrPayload, qrX + qrSize + 2, qrY + 6, { maxWidth: cardW - qrSize - 6 });
    }

    col += 1;
    if (col > 2) {
      col = 0;
      rowY += cardH + 6;
      if (rowY + cardH > doc.internal.pageSize.getHeight() - MARGIN) {
        doc.addPage("a4", "landscape");
        rowY = MARGIN + 10;
      }
    }
  }
}

/** Detecta se o contexto (projeto/caixa/peça) é de cozinha para regra da coluna Borda. */
function isCozinhaContext(
  project: ProjectForPdf,
  p: CutListItemComPreco & { boxNome?: string; tipoBorda?: string }
): boolean {
  const proj = (project.projectName ?? "").toLowerCase();
  const boxNome = (p.boxNome ?? "").toLowerCase();
  const material = (p.material ?? "").toLowerCase();
  return proj.includes("cozinha") || boxNome.includes("cozinha") || material.includes("cozinha");
}

/**
 * Renderiza tabela de cutlist.
 * Ordem: Caixa, Peça, Qtd, L×A×P, Borda (fita), Limpeza, Montagem, Verificação, OBSERVAÇÕES, N QR.
 * Borda: 10 mm → "—"; cozinha + reta → "ALL"; demais → tipoBorda ou "todos os lados".
 * N QR: código da etiqueta (mesmo padrão das etiquetas), com quebra de linha.
 */
export function renderCutlistTable(
  doc: jsPDF,
  parts: Array<CutListItemComPreco & { boxNome?: string; tipoBorda?: string }>,
  project: ProjectForPdf,
  startY: number
): number {
  const head = [
    "Caixa",
    "Peça",
    "Qtd",
    "L×A×P (mm)",
    "Borda (fita)",
    "Limpeza",
    "Montagem",
    "Verificação",
    "OBSERVAÇÕES",
    "N QR",
  ];
  const body = parts.map((p, idx) => {
    let bordaFita: string;
    if (p.espessura === 10) {
      bordaFita = "—";
    } else {
      const raw = p.tipoBorda ?? "todos os lados";
      if (raw === "reta" && isCozinhaContext(project, p)) {
        bordaFita = "ALL";
      } else {
        bordaFita = raw;
      }
    }
    const pieceNumber = Number(p.pieceNumber ?? 0) || idx + 1;
    const nQr = buildLocalQrPayload(
      p,
      { projectName: project.projectName, boxes: project.boxes, rules: project.rules },
      pieceNumber
    );
    return [
      p.boxNome ?? "—",
      p.nome,
      String(p.quantidade),
      `${p.dimensoes.largura}×${p.dimensoes.altura}×${p.dimensoes.profundidade}`,
      bordaFita,
      "",
      "",
      "",
      "",
      nQr,
    ];
  });

  if (body.length === 0) {
    body.push(["Nenhuma peça", "—", "—", "—", "—", "—", "—", "—", "—", "—"]);
  }

  autoTable(doc, {
    head: [head],
    body,
    startY,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: HEADER_COLOR, fontSize: 7 },
    margin: { left: MARGIN, right: MARGIN },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 32 },
      2: { cellWidth: 10 },
      3: { cellWidth: 28 },
      4: { cellWidth: 18 },
      5: { cellWidth: 14 },
      6: { cellWidth: 14 },
      7: { cellWidth: 16 },
      8: { cellWidth: 22 },
      9: { cellWidth: 70, overflow: "linebreak", cellPadding: 1.5 },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
  return finalY;
}

type HoleLike = { x: number; y: number; diametro: number; profundidade: number };

function getHolesForPart(part: CutListItemComPreco): HoleLike[] {
  const drillHoles = part.drillHoles ?? [];
  if (drillHoles.length > 0) {
    return drillHoles.map((h) => ({
      x: h.x,
      y: h.y,
      diametro: h.diameter,
      profundidade: h.depth,
    }));
  }
  const technicalHoles = (part as CutListItemComPreco & { furacoesTecnicas?: TechnicalDrillHole[] }).furacoesTecnicas ?? [];
  if (technicalHoles.length > 0) {
    return technicalHoles.map((h) => ({
      x: h.x,
      y: h.y,
      diametro: h.diametro,
      profundidade: h.profundidade,
    }));
  }
  const furacoes = (part as CutListItemComPreco & { furacoes?: HoleLike[] }).furacoes ?? [];
  return furacoes;
}

function drawFurosForPart(
  doc: jsPDF,
  part: CutListItemComPreco,
  startX: number,
  startY: number,
  drawW: number,
  drawH: number
) {
  const holes = getHolesForPart(part);
  if (holes.length === 0) return;
  const scale = Math.min(
    drawW / Math.max(1, part.dimensoes.largura),
    drawH / Math.max(1, part.dimensoes.altura)
  );
  const pieceW = part.dimensoes.largura * scale;
  const pieceH = part.dimensoes.altura * scale;
  const offsetX = startX + (drawW - pieceW) / 2;
  const offsetY = startY + (drawH - pieceH) / 2;
  doc.setDrawColor(34, 34, 34);
  doc.setFillColor(248, 250, 252);
  doc.rect(offsetX, offsetY, pieceW, pieceH, "FD");
  doc.setDrawColor(30, 64, 175);
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(7);
  const arrowX = offsetX + Math.max(6, pieceW - 10);
  const arrowY = Math.max(startY + 4, offsetY - 2);
  doc.line(arrowX, arrowY + 4, arrowX, arrowY);
  doc.line(arrowX, arrowY, arrowX - 1.2, arrowY + 1.2);
  doc.line(arrowX, arrowY, arrowX + 1.2, arrowY + 1.2);
  doc.text("Topo", arrowX - 7, arrowY - 0.5);
  for (const h of holes) {
    const radiusMm = Math.max(0.3, h.diametro / 2);
    const hx = Math.min(Math.max(h.x, radiusMm), Math.max(radiusMm, part.dimensoes.largura - radiusMm));
    const hy = Math.min(Math.max(h.y, radiusMm), Math.max(radiusMm, part.dimensoes.altura - radiusMm));
    const cx = offsetX + hx * scale;
    const cy = offsetY + hy * scale;
    const r = Math.max(0.45, radiusMm * scale);
    doc.circle(cx, cy, r);
    const dLeft = hx;
    const dRight = Math.max(0, part.dimensoes.largura - hx);
    const dTop = hy;
    const dBottom = Math.max(0, part.dimensoes.altura - hy);
    const depthLabel = Number.isFinite(h.profundidade) ? ` · P:${h.profundidade}` : "";
    doc.text(
      `Ø${h.diametro}${depthLabel}  E:${Math.round(dLeft)} D:${Math.round(dRight)} T:${Math.round(dTop)} B:${Math.round(dBottom)}`,
      Math.min(startX + drawW - 2, cx + r + 1.2),
      Math.max(startY + 2, cy - r - 0.8),
      { align: "right" }
    );
  }
}

function renderFurosLayer(
  doc: jsPDF,
  parts: Array<CutListItemComPreco & { boxNome?: string; tipoBorda?: string }>,
  startY: number
) {
  const withHoles = parts.filter((p) => {
    if ((p.drillHoles?.length ?? 0) > 0) return true;
    if (((p as CutListItemComPreco & { furacoesTecnicas?: unknown[] }).furacoesTecnicas?.length ?? 0) > 0) return true;
    if (((p as CutListItemComPreco & { furacoes?: unknown[] }).furacoes?.length ?? 0) > 0) return true;
    return false;
  });
  if (withHoles.length === 0) return;
  doc.addPage("a4", "landscape");
  let y = startY;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Cutlist - Camada de Furos", MARGIN, y);
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Furação Técnica: círculos em escala real da peça e cotas às bordas.", MARGIN, y);
  y += 8;

  const pageW = doc.internal.pageSize.getWidth();
  const cardW = (pageW - MARGIN * 2 - 8) / 2;
  const cardH = 55;
  let col = 0;
  let rowY = y;
  for (let i = 0; i < withHoles.length; i++) {
    const p = withHoles[i];
    const x = MARGIN + col * (cardW + 8);
    doc.setDrawColor(180, 180, 180);
    doc.rect(x, rowY, cardW, cardH);
    doc.setFontSize(8);
    doc.text(`${p.boxNome ?? "—"} · ${p.nome}`, x + 2, rowY + 4);
    doc.text(
      `${p.dimensoes.largura}x${p.dimensoes.altura} mm · orientação de referência 0º`,
      x + 2,
      rowY + 8
    );
    const drawX = x + 4;
    const drawY = rowY + 12;
    const drawW = cardW - 8;
    const drawH = cardH - 16;
    doc.setDrawColor(120, 120, 120);
    doc.rect(drawX, drawY, drawW, drawH);
    drawFurosForPart(doc, p, drawX, drawY, drawW, drawH);

    col += 1;
    if (col > 1) {
      col = 0;
      rowY += cardH + 6;
      if (rowY + cardH > doc.internal.pageSize.getHeight() - MARGIN) {
        doc.addPage("a4", "landscape");
        rowY = MARGIN + 10;
      }
    }
  }
}

function buildCutlistPdfSync(project: ProjectForPdf, existingDoc?: jsPDF): jsPDF {
  const doc = existingDoc ?? new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  if (existingDoc) {
    existingDoc.addPage("a4", "landscape");
  }

  let y = MARGIN;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Cutlist", MARGIN, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Projeto: ${project.projectName || "Projeto"}`, MARGIN, y);
  y += 6;

  doc.setFontSize(9);
  doc.text(
    `Data: ${new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
    MARGIN,
    y
  );
  y += 12;

  const parts = getFullCutlist(project);
  y = renderCutlistTable(doc, parts, project, y);
  renderFurosLayer(doc, parts, MARGIN);
  renderQrLayer(doc, parts, project);

  return doc;
}

/**
 * Gera PDF de cutlist (cutlistFromBoxes). API async para compatibilidade com fluxo atual.
 * @param existingDoc Se fornecido, adiciona as páginas ao documento existente.
 */
export async function buildCutlistPdf(project: ProjectForPdf, existingDoc?: jsPDF): Promise<jsPDF> {
  return Promise.resolve(buildCutlistPdfSync(project, existingDoc));
}
