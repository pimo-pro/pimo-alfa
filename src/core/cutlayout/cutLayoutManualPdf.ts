/**
 * PDF "Layout de Corte manual" ù leitura do mesmo SSOT/nesting do Layout PRO,
 * com cotagem e simbologia para trabalho de marceneiro (sem alterar motores industriais).
 */

import jsPDF from "jspdf";
import type { CutPlacement, SheetResult } from "./cutLayoutTypes";
import { holeLocalToSheetOffsetMm } from "./layoutCoordinateSystem";
import { holesForPdf } from "./cutLayoutPdf";
import { buildV5BottomStripIndustrialName } from "../etiquetas/industrialDisplayName";
import { assertIndustrialOutputAuthorized } from "../industrial/industrialOutputGuard";
import {
  drawLogoIndustrialInBox,
  loadLogoIndustrialDataUrl,
  LOGO_INDUSTRIAL_SIZE_MM,
} from "../pdf/logoIndustrialPublic";
import { resolveAuthoritativeLabelNumber } from "../qrcode/panelLabelNumber";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 8;
const INNER_W = PAGE_W - MARGIN * 2;

const COLOR_CAVILHA: [number, number, number] = [180, 20, 20];
const COLOR_PRATELEIRA: [number, number, number] = [20, 140, 60];
const COLOR_FIXACAO: [number, number, number] = [30, 80, 180];
const COLOR_PASSANTE: [number, number, number] = [40, 40, 40];
const COLOR_OUTRO: [number, number, number] = [100, 100, 100];
const COLOR_RASGO: [number, number, number] = [160, 100, 20];
const BRAND_RED: [number, number, number] = [139, 0, 0];

export type ManualHoleKind = "cavilha" | "prateleira" | "fixacao" | "passante" | "outro";

export type CutLayoutManualSheetInput = {
  sheetResult: SheetResult;
  /** Pasta/bucket (ex.: MDF_BRANCO_19MM) ù sù para cabeùalho. */
  bucket?: string;
};

export type CutLayoutManualPdfOptions = {
  projectName?: string;
  industrialProjectName?: string;
  boxNomeById?: Readonly<Record<string, string>> | ReadonlyMap<string, string>;
  nestingTopRightOrigin?: boolean;
};

type PdfHole = NonNullable<CutPlacement["drillHoles"]>[number];
type ManualHoleView = {
  sx: number;
  sy: number;
  diameter: number;
  depth: number;
  kind: ManualHoleKind;
};

type InnerContour = { x_mm: number; y_mm: number; largura_mm: number; altura_mm: number };

/** Classificaùùo local sù para o PDF manual ù nùo altera SSOT. */
export function classifyManualHole(
  h: { diameter: number; depth: number; holeType?: string; topDrillable?: boolean },
  pieceThicknessMm?: number
): ManualHoleKind {
  const tipo = String(h.holeType ?? "").toLowerCase();
  const d = Number(h.diameter) || 0;
  const depth = Number(h.depth) || 0;
  const thick = Number(pieceThicknessMm) || 0;

  if (thick > 0 && depth >= thick - 0.6) return "passante";
  if (tipo.includes("cavilha") || (d >= 9.5 && d <= 10.5 && depth >= 10 && depth <= 35)) {
    return "cavilha";
  }
  if (tipo.includes("prateleira") || (d >= 4.5 && d <= 5.5)) return "prateleira";
  if (
    tipo.includes("parafuso") ||
    tipo.includes("fixacao") ||
    tipo.includes("minifix") ||
    tipo.includes("dobradica") ||
    (d >= 5.8 && d <= 8.5)
  ) {
    return "fixacao";
  }
  return "outro";
}

function colorForKind(kind: ManualHoleKind): [number, number, number] {
  switch (kind) {
    case "cavilha":
      return COLOR_CAVILHA;
    case "prateleira":
      return COLOR_PRATELEIRA;
    case "fixacao":
      return COLOR_FIXACAO;
    case "passante":
      return COLOR_PASSANTE;
    default:
      return COLOR_OUTRO;
  }
}

function resolveBoxNome(
  boxId: string | undefined,
  boxNomeById?: CutLayoutManualPdfOptions["boxNomeById"]
): string {
  const id = String(boxId ?? "").trim();
  if (!id || !boxNomeById) return id || "ù";
  if (boxNomeById instanceof Map) return boxNomeById.get(id)?.trim() || id;
  return String(boxNomeById[id] ?? "").trim() || id;
}

function formatPieceName(pl: CutPlacement, options: CutLayoutManualPdfOptions): string {
  const project =
    (options.industrialProjectName ?? options.projectName ?? "Projeto").trim() || "Projeto";
  const projectClean = project.includes(" ù ")
    ? project.slice(0, project.indexOf(" ù ")).trim() || project
    : project;
  const boxNome = resolveBoxNome(pl.boxId, options.boxNomeById);
  const nomeIndustrial = String(pl.partName ?? "").trim() || "peca";
  return buildV5BottomStripIndustrialName(projectClean, boxNome, nomeIndustrial);
}

function normalizedRotation(rotacao: number | undefined): number {
  return ((rotacao ?? 0) % 360 + 360) % 360;
}

function pdfDisplayHoleOffset(pl: CutPlacement, h: PdfHole): { sx: number; sy: number } {
  return holeLocalToSheetOffsetMm(
    h.x,
    h.y,
    normalizedRotation(pl.rotacao),
    pl.largura_mm,
    pl.altura_mm
  );
}

function holesForManual(pl: CutPlacement, sheet: SheetResult["sheet"]): ManualHoleView[] {
  const raw = holesForPdf(pl, sheet, false);
  const thick = pl.espessura_mm ?? sheet.espessura_mm;
  return raw.map((h) => {
    const off = pdfDisplayHoleOffset(pl, h);
    return {
      sx: off.sx,
      sy: off.sy,
      diameter: Number(h.diameter) || 0,
      depth: Number(h.depth) || 0,
      kind: classifyManualHole(h, thick),
    };
  });
}

function contoursForManual(pl: CutPlacement): InnerContour[] {
  const ext = pl as CutPlacement & { originalInnerContours?: InnerContour[] };
  return ext.originalInnerContours ?? pl.innerContours ?? [];
}

function formatDatePt(): string {
  return new Date().toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function drawLegend(doc: jsPDF, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text("Legenda (trabalho manual)", MARGIN, y);
  y += 4;
  const items: Array<{ color: [number, number, number]; label: string; passante?: boolean }> = [
    { color: COLOR_CAVILHA, label: "Cavilha (ù10, prof. tip. 13) ù vermelho" },
    { color: COLOR_PRATELEIRA, label: "Prateleira (ù5) ù verde" },
    { color: COLOR_FIXACAO, label: "Fixaùùo / parafuso ù azul" },
    { color: COLOR_PASSANTE, label: "Passante ù sùmbolo X", passante: true },
    { color: COLOR_RASGO, label: "Rasgo / fresagem ù retùngulo ùmbar" },
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  for (const it of items) {
    doc.setFillColor(...it.color);
    doc.setDrawColor(...it.color);
    if (it.passante) {
      doc.setLineWidth(0.35);
      doc.line(MARGIN, y - 1.2, MARGIN + 3.2, y + 1.2);
      doc.line(MARGIN + 3.2, y - 1.2, MARGIN, y + 1.2);
    } else {
      doc.circle(MARGIN + 1.6, y, 1.2, "FD");
    }
    doc.setTextColor(30, 30, 30);
    doc.text(it.label, MARGIN + 5.5, y + 0.8);
    y += 4.2;
  }
  return y + 1;
}

function drawHoleSymbol(
  doc: jsPDF,
  cx: number,
  cy: number,
  rMm: number,
  kind: ManualHoleKind
): void {
  const color = colorForKind(kind);
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  doc.setLineWidth(0.25);
  if (kind === "passante") {
    const arm = Math.max(0.8, rMm * 1.4);
    doc.line(cx - arm, cy - arm, cx + arm, cy + arm);
    doc.line(cx + arm, cy - arm, cx - arm, cy + arm);
    doc.circle(cx, cy, Math.max(0.4, rMm * 0.55), "S");
    return;
  }
  if (kind === "fixacao") {
    doc.circle(cx, cy, Math.max(0.35, rMm), "S");
    doc.circle(cx, cy, Math.max(0.2, rMm * 0.45), "F");
    return;
  }
  doc.circle(cx, cy, Math.max(0.3, rMm), "FD");
}

/** Cotas inteligentes: bordas + espaùamento mùdio por fila horizontal. */
function drawSmartCotas(
  doc: jsPDF,
  holes: ManualHoleView[],
  rx: number,
  ry: number,
  scale: number,
  pieceW: number
): void {
  if (holes.length === 0) return;
  const byRow = new Map<string, ManualHoleView[]>();
  for (const h of holes) {
    const key = `${h.kind}_${Math.round(h.sy / 2) * 2}`;
    const list = byRow.get(key) ?? [];
    list.push(h);
    byRow.set(key, list);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(60, 60, 60);
  doc.setDrawColor(90, 90, 90);
  doc.setLineWidth(0.12);

  for (const group of byRow.values()) {
    if (group.length === 0) continue;
    group.sort((a, b) => a.sx - b.sx);
    const y = group[0].sy;
    const first = group[0];
    const last = group[group.length - 1];

    // Borda esquerda ? 1.ù furo
    const x0 = rx;
    const x1 = rx + first.sx * scale;
    const cy = ry + y * scale - 2.2;
    if (first.sx > 2) {
      doc.line(x0, cy, x1, cy);
      doc.text(`${Math.round(first.sx)}`, (x0 + x1) / 2, cy - 0.6, { align: "center" });
    }
    // ùltimo furo ? borda direita
    const x2 = rx + last.sx * scale;
    const x3 = rx + pieceW * scale;
    if (pieceW - last.sx > 2) {
      doc.line(x2, cy + 1.6, x3, cy + 1.6);
      doc.text(`${Math.round(pieceW - last.sx)}`, (x2 + x3) / 2, cy + 1.2, { align: "center" });
    }

    if (group.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < group.length; i++) gaps.push(group[i].sx - group[i - 1].sx);
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      if (avg > 1) {
        const mid = (group[0].sx + group[1].sx) / 2;
        doc.text(`e=${Math.round(avg)}`, rx + mid * scale, ry + y * scale + 3.4, {
          align: "center",
        });
      }
    } else {
      doc.text(`${Math.round(first.sy)} top`, rx + first.sx * scale + 2.2, ry + first.sy * scale - 1.2);
      doc.text(
        `D${Math.round(first.diameter)} p${Math.round(first.depth)}`,
        rx + first.sx * scale + 2.2,
        ry + first.sy * scale + 2.2
      );
    }
  }
}

function drawManualPieceDetail(
  doc: jsPDF,
  pl: CutPlacement,
  sheet: SheetResult["sheet"],
  box: { x: number; y: number; w: number; h: number },
  options: CutLayoutManualPdfOptions
): void {
  const name = formatPieceName(pl, options);
  const num = String(
    resolveAuthoritativeLabelNumber(pl) ?? pl.shortCode ?? pl.pieceNumber ?? "ù"
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 15, 15);
  const title = `#${num}  ${name}`;
  doc.text(doc.splitTextToSize(title, box.w).slice(0, 2), box.x, box.y + 3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    `${Math.round(pl.largura_mm)}ù${Math.round(pl.altura_mm)}ù${Math.round(pl.espessura_mm ?? sheet.espessura_mm)} mm`,
    box.x,
    box.y + 9
  );

  const drawAreaY = box.y + 12;
  const drawAreaH = box.h - 14;
  const drawAreaW = box.w;
  const forceLandscape = pl.altura_mm > pl.largura_mm;
  const geoW = forceLandscape ? pl.altura_mm : pl.largura_mm;
  const geoH = forceLandscape ? pl.largura_mm : pl.altura_mm;
  const scale = Math.min(drawAreaW / Math.max(geoW, 1), drawAreaH / Math.max(geoH, 1)) * 0.92;
  const rw = geoW * scale;
  const rh = geoH * scale;
  const rx = box.x + (drawAreaW - rw) / 2;
  const ry = drawAreaY + (drawAreaH - rh) / 2;

  doc.setFillColor(250, 248, 245);
  doc.rect(rx, ry, rw, rh, "F");
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(rx, ry, rw, rh, "S");

  const mapPoint = (sx: number, sy: number): { x: number; y: number } => {
    if (!forceLandscape) return { x: rx + sx * scale, y: ry + sy * scale };
    // 90ù CW visual
    return {
      x: rx + sy * scale,
      y: ry + (pl.largura_mm - sx) * scale,
    };
  };

  const holes = holesForManual(pl, sheet);
  for (const h of holes) {
    const p = mapPoint(h.sx, h.sy);
    const r = Math.max(0.35, (h.diameter / 2) * scale);
    drawHoleSymbol(doc, p.x, p.y, r, h.kind);
  }

  const contours = contoursForManual(pl);
  doc.setDrawColor(...COLOR_RASGO);
  doc.setFillColor(255, 230, 200);
  doc.setLineWidth(0.35);
  for (const c of contours) {
    const p0 = mapPoint(c.x_mm, c.y_mm);
    const p1 = mapPoint(c.x_mm + c.largura_mm, c.y_mm + c.altura_mm);
    const x = Math.min(p0.x, p1.x);
    const y = Math.min(p0.y, p1.y);
    const w = Math.abs(p1.x - p0.x);
    const h = Math.abs(p1.y - p0.y);
    doc.rect(x, y, Math.max(0.4, w), Math.max(0.4, h), "FD");
    doc.setFontSize(5);
    doc.setTextColor(...COLOR_RASGO);
    doc.text(
      `${Math.round(c.largura_mm)}ù${Math.round(c.altura_mm)}`,
      x + 0.5,
      y - 0.5
    );
  }

  // Cotas no espaùo nùo-rodado (evita ambiguidade); se landscape, cotas no espaùo geoW/geoH
  if (!forceLandscape) {
    drawSmartCotas(doc, holes, rx, ry, scale, pl.largura_mm);
  } else {
    const mapped = holes.map((h) => ({
      ...h,
      sx: h.sy,
      sy: pl.largura_mm - h.sx,
    }));
    drawSmartCotas(doc, mapped, rx, ry, scale, pl.altura_mm);
  }
}

function drawManualSheetDiagram(
  doc: jsPDF,
  sheetResult: SheetResult,
  originY: number,
  maxH: number,
  topRightOrigin: boolean
): number {
  const { sheet, placements } = sheetResult;
  const scale = Math.min(INNER_W / sheet.largura_mm, maxH / sheet.altura_mm);
  const drawW = sheet.largura_mm * scale;
  const drawH = sheet.altura_mm * scale;
  const originX = MARGIN + (INNER_W - drawW) / 2;

  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.rect(originX, originY, drawW, drawH);

  for (const pl of placements) {
    const px =
      originX +
      (topRightOrigin ? sheet.largura_mm - pl.x_mm - pl.largura_mm : pl.x_mm) * scale;
    const py = originY + pl.y_mm * scale;
    const pw = pl.largura_mm * scale;
    const ph = pl.altura_mm * scale;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BRAND_RED);
    doc.setLineWidth(0.25);
    doc.rect(px, py, pw, ph, "FD");

    const holes = holesForManual(pl, sheet);
    for (const h of holes) {
      const hx = px + h.sx * scale;
      const hy = py + h.sy * scale;
      const r = Math.max(0.25, Math.min(1.2, (h.diameter / 2) * scale * 0.9));
      drawHoleSymbol(doc, hx, hy, r, h.kind);
    }

    for (const c of contoursForManual(pl)) {
      doc.setDrawColor(...COLOR_RASGO);
      doc.setLineWidth(0.2);
      doc.rect(
        px + c.x_mm * scale,
        py + c.y_mm * scale,
        Math.max(0.3, c.largura_mm * scale),
        Math.max(0.3, c.altura_mm * scale),
        "S"
      );
    }

    const num = String(
      resolveAuthoritativeLabelNumber(pl) ?? pl.shortCode ?? pl.pieceNumber ?? "ù"
    );
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_RED);
    const fs = Math.max(4, Math.min(ph * 0.45, pw * 0.35, 10));
    doc.setFontSize(fs);
    doc.text(num, px + pw / 2, py + ph / 2 + fs * 0.28, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  return originY + drawH + 3;
}

function drawSheetHeader(
  doc: jsPDF,
  sheetResult: SheetResult,
  sheetIndex: number,
  totalSheets: number,
  options: CutLayoutManualPdfOptions,
  bucket: string | undefined,
  logoDataUrl: string | null
): number {
  const { sheet } = sheetResult;
  const project = (options.projectName ?? "Projeto").trim() || "Projeto";
  const y0 = MARGIN;
  drawLogoIndustrialInBox(doc, logoDataUrl, MARGIN, y0, LOGO_INDUSTRIAL_SIZE_MM, BRAND_RED);
  const tx = MARGIN + LOGO_INDUSTRIAL_SIZE_MM + 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 15, 15);
  doc.text("Layout de Corte manual", tx, y0 + 5);
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(project, INNER_W - 40).slice(0, 1) as string[], tx, y0 + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  const mat = sheet.materialName ?? sheet.materialId ?? "ù";
  doc.text(
    `Chapa ${sheetIndex}/${totalSheets}${bucket ? ` ù ${bucket}` : ""} ù ${mat} ù ${Math.round(sheet.espessura_mm)} mm ù ${formatDatePt()}`,
    tx,
    y0 + 17
  );
  doc.setTextColor(0, 0, 0);
  return y0 + 22;
}

/**
 * Gera um ùnico PDF com todas as chapas (todas as espessuras/materiais).
 * Apenas leitura do nesting/SSOT ù sem alterar CNC/DRILL/Cutlist.
 */
export async function buildCutLayoutManualPdf(
  sheets: CutLayoutManualSheetInput[],
  options?: CutLayoutManualPdfOptions
): Promise<jsPDF> {
  assertIndustrialOutputAuthorized("pdf-layout-manual");
  const opts: CutLayoutManualPdfOptions = options ?? {};
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logoDataUrl = await loadLogoIndustrialDataUrl();
  const list = sheets.filter((s) => s?.sheetResult?.placements?.length);
  if (list.length === 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Layout de Corte manual ù sem peùas", MARGIN, MARGIN + 10);
    return doc;
  }

  let globalSheetIndex = 0;
  for (const entry of list) {
    if (globalSheetIndex > 0) doc.addPage("a4", "portrait");
    globalSheetIndex += 1;
    const sheetResult = entry.sheetResult;
    let y = drawSheetHeader(
      doc,
      sheetResult,
      globalSheetIndex,
      list.length,
      opts,
      entry.bucket,
      logoDataUrl
    );
    y = drawLegend(doc, y + 2);
    const maxDiagramH = Math.min(95, PAGE_H - y - MARGIN - 8);
    y = drawManualSheetDiagram(
      doc,
      sheetResult,
      y,
      maxDiagramH,
      Boolean(opts.nestingTopRightOrigin)
    );

    // Detalhe das peùas (2 por pùgina)
    const placements = sheetResult.placements;
    const perPage = 2;
    for (let i = 0; i < placements.length; i += perPage) {
      doc.addPage("a4", "portrait");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(
        `Chapa ${globalSheetIndex} ù Detalhe manual (${i + 1}ù${Math.min(i + perPage, placements.length)}/${placements.length})`,
        MARGIN,
        MARGIN + 4
      );
      const usableH = PAGE_H - MARGIN * 2 - 10;
      const cardH = usableH / perPage - 2;
      for (let k = 0; k < perPage; k++) {
        const pl = placements[i + k];
        if (!pl) break;
        drawManualPieceDetail(
          doc,
          pl,
          sheetResult.sheet,
          {
            x: MARGIN,
            y: MARGIN + 8 + k * (cardH + 2),
            w: INNER_W,
            h: cardH,
          },
          opts
        );
      }
    }
  }

  return doc;
}

/** Nome de ficheiro canùnico do PDF manual (ùnico para o projeto). */
export function cutLayoutManualPdfFileName(): string {
  return "Layout_de_Corte_manual.pdf";
}
