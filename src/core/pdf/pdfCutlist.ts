/**
 * PDF Lista de Corte — layout industrial partilhado (A4 landscape, linhas compactas).
 * Colunas: Caixa, Peça, Qtd, L×A×P, Borda, Limpeza, Montagem, Verificação, OBSERVAÇÕES, No ETQ.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import { buildGlobalQrCutlistMerged } from "../manufacturing/cutlistFromBoxes";
import { resolveIndustrialPieceRef } from "../cutlayout/cutLayoutProPieceNaming";
import {
  buildIndustrialListPiecesPerSheet,
  resolveIndustrialListNqr,
} from "./industrialListQr";
import { assertIndustrialOutputAuthorized } from "../industrial/industrialOutputGuard";
import type { PieceObservacoesStore } from "../observacoes/observacoesTypes";
import {
  formatObservacoesForPdf,
  resolveObservacoesForCutListItem,
} from "../observacoes/ObservacoesService";
import { getCurrentProjectUser } from "../projects/currentUser";
import {
  PDF_INDUSTRIAL_ETQ_COL_WIDTH,
  PDF_INDUSTRIAL_HEADER_COLOR,
  PDF_INDUSTRIAL_MARGIN,
  PDF_INDUSTRIAL_PAGE_W,
  PDF_INDUSTRIAL_QTD_COL_WIDTH,
  PDF_INDUSTRIAL_ROW_ALT,
  PDF_INDUSTRIAL_ROW_MIN_H,
  drawIndustrialOperationalDatesBlock,
  drawIndustrialPdfFooter,
  drawIndustrialPdfTitleHeader,
  drawIndustrialProjectInfoBlock,
  drawIndustrialSectionTitle,
  formatIndustrialDesignDate,
  getIndustrialAutoTableMargins,
  getIndustrialAutoTableStyles,
  getIndustrialHeadStyles,
} from "./pdfIndustrialListShell";

export type ProjectForPdf = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
  materialId?: string;
  extractedPartsByBoxId?: Record<string, Record<string, CutListItemComPreco[]>>;
  settings?: unknown;
  precomputedItems?: CutListItemComPreco[];
  pieceObservacoes?: PieceObservacoesStore;
};

function getFullCutlist(project: ProjectForPdf): Array<CutListItemComPreco & { boxNome: string; tipoBorda?: string }> {
  const boxById = new Map(project.boxes.map((b) => [b.id, b]));

  if (project.precomputedItems && project.precomputedItems.length > 0) {
    return project.precomputedItems.map((p) => {
      const box = boxById.get(p.boxId ?? "");
      return {
        ...p,
        boxNome: box?.nome ?? p.boxId ?? "—",
        tipoBorda: box?.tipoBorda,
      };
    });
  }

  const merged = buildGlobalQrCutlistMerged(
    project.boxes,
    project.rules,
    project.materialId,
    project.projectName,
    project.extractedPartsByBoxId
  );

  return merged.map((p) => {
    const box = boxById.get(p.boxId ?? "");
    return {
      ...p,
      boxNome: box?.nome ?? p.boxId ?? "—",
      tipoBorda: box?.tipoBorda,
    };
  });
}

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
 * Tabela cutlist detalhada — mesmo shell visual do PDF técnico.
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
    "No ETQ",
  ];
  const qrCtx = {
    projectName: project.projectName,
    boxes: project.boxes,
    rules: project.rules,
  };
  const piecesPerSheet = buildIndustrialListPiecesPerSheet(parts);

  const body = parts.map((p, index0) => {
    let bordaFita: string;
    if (p.espessura === 10) {
      bordaFita = "—";
    } else {
      const raw = p.tipoBorda ?? "todos os lados";
      if (raw === "reta" && isCozinhaContext(project, p)) {
        bordaFita = "TODAS";
      } else {
        bordaFita = raw;
      }
    }
    const refPeca = resolveIndustrialPieceRef(p, p.boxNome, project.projectName);
    const nQr = resolveIndustrialListNqr(p, qrCtx, piecesPerSheet, index0);
    const obsText = formatObservacoesForPdf(
      resolveObservacoesForCutListItem(p, {
        pieceObservacoes: project.pieceObservacoes,
      })
    );
    return [
      p.boxNome ?? "—",
      refPeca,
      String(p.quantidade),
      `${p.dimensoes.largura}×${p.dimensoes.altura}×${p.dimensoes.profundidade}`,
      bordaFita,
      "",
      "",
      "",
      obsText,
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
    theme: "grid",
    showHead: "everyPage",
    rowPageBreak: "avoid",
    didParseCell: (data) => {
      if (data.section === "head") {
        data.cell.styles.fillColor = PDF_INDUSTRIAL_HEADER_COLOR;
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 7;
      }
      if (data.section === "body") {
        data.cell.styles.minCellHeight = PDF_INDUSTRIAL_ROW_MIN_H;
        data.cell.styles.overflow = "hidden";
        if (data.column.index === 9) {
          data.cell.styles.cellWidth = PDF_INDUSTRIAL_ETQ_COL_WIDTH;
        }
        if (data.row.index % 2 === 0) {
          data.cell.styles.fillColor = [255, 255, 255];
        } else {
          data.cell.styles.fillColor = PDF_INDUSTRIAL_ROW_ALT;
        }
      }
    },
    styles: getIndustrialAutoTableStyles(),
    headStyles: getIndustrialHeadStyles(),
    margin: getIndustrialAutoTableMargins(),
    columnStyles: {
      0: { cellWidth: 22, overflow: "hidden" },
      1: { cellWidth: 32, overflow: "hidden" },
      2: { cellWidth: PDF_INDUSTRIAL_QTD_COL_WIDTH, halign: "center" },
      3: { cellWidth: 24, halign: "right" },
      4: { cellWidth: 16, overflow: "hidden" },
      5: { cellWidth: 11, halign: "center" },
      6: { cellWidth: 11, halign: "center" },
      7: { cellWidth: 13, halign: "center" },
      8: { cellWidth: 36, overflow: "hidden" },
      9: { cellWidth: PDF_INDUSTRIAL_ETQ_COL_WIDTH, overflow: "hidden", halign: "center" },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
  return finalY;
}

function buildCutlistPdfSync(project: ProjectForPdf, existingDoc?: jsPDF): jsPDF {
  assertIndustrialOutputAuthorized("pdf-cutlist");
  const doc = existingDoc ?? new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  if (existingDoc) {
    existingDoc.addPage("a4", "landscape");
  }

  const dataHoje = formatIndustrialDesignDate();
  const designer = getCurrentProjectUser().ownerName || "—";
  const parts = getFullCutlist(project);
  const totalPecas = parts.reduce((s, p) => s + p.quantidade, 0);

  let y = drawIndustrialPdfTitleHeader(doc, { designer, designDate: dataHoje });

  const blockW = PDF_INDUSTRIAL_PAGE_W - PDF_INDUSTRIAL_MARGIN * 2;
  const blockX = PDF_INDUSTRIAL_MARGIN;
  const c1x = blockX + 4;
  const c2x = blockX + blockW / 2 + 4;

  const { nextY, totalPiecesLabelPos } = drawIndustrialProjectInfoBlock(doc, y, {
    projectName: project.projectName || "Projeto",
    acabamento: "—",
    boxCount: project.boxes.length,
    totalPieces: totalPecas,
  });
  y = nextY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(String(totalPecas), totalPiecesLabelPos.x, totalPiecesLabelPos.y);

  y = drawIndustrialOperationalDatesBlock(doc, blockX, y, blockW, c1x, c2x) + 2;
  y = drawIndustrialSectionTitle(doc, y, "Lista de Corte — Detalhada");

  renderCutlistTable(doc, parts, project, y);
  drawIndustrialPdfFooter(doc, dataHoje, parts.length, totalPecas);

  return doc;
}

export async function buildCutlistPdf(project: ProjectForPdf, existingDoc?: jsPDF): Promise<jsPDF> {
  return Promise.resolve(buildCutlistPdfSync(project, existingDoc));
}
