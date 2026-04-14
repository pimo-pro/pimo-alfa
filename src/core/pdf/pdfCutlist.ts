/**
 * PDF Lista de Corte — tabela de peças para corte (cutlistFromBoxes, modelo FINAL).
 * Colunas: Caixa, Peça, Qtd, L×A×P, Borda (fita), Limpeza, Montagem, Verificação, OBSERVAÇÕES, N.º QR.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import { buildGlobalQrCutlistMerged } from "../manufacturing/cutlistFromBoxes";
import { buildLocalQrPayload } from "../qrcode/qrcodeService";
import { formatNqrCell, resolveAuthoritativeLabelNumber } from "../qrcode/panelLabelNumber";

export type ProjectForPdf = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
  materialId?: string;
  extractedPartsByBoxId?: Record<string, Record<string, CutListItemComPreco[]>>;
  settings?: unknown;
  /** Itens pré-calculados com numeração global (modo fabricação em massa). */
  precomputedItems?: CutListItemComPreco[];
};

const MARGIN = 14;
const HEADER_COLOR: [number, number, number] = [15, 23, 42];

function getFullCutlist(project: ProjectForPdf): Array<CutListItemComPreco & { boxNome: string; tipoBorda?: string }> {
  const boxById = new Map(project.boxes.map((b) => [b.id, b]));

  // Modo fabricação em massa: usar itens pré-calculados com numeração global
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
 * Renderiza tabela de lista de corte.
 * Ordem: Caixa, Peça, Qtd, L×A×P, Borda (fita), Limpeza, Montagem, Verificação, OBSERVAÇÕES, N.º QR.
 * Borda: 10 mm → "—"; cozinha + reta → "TODAS"; demais → tipoBorda ou "todos os lados".
 * N.º QR: código da etiqueta (mesmo padrão das etiquetas), com quebra de linha.
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
    "N.º QR",
  ];
  const body = parts.map((p) => {
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
    const ctx = { projectName: project.projectName, boxes: project.boxes, rules: project.rules };
    const auth = resolveAuthoritativeLabelNumber(p);
    const nQr =
      auth != null
        ? formatNqrCell(p.shortCode, buildLocalQrPayload(p, ctx, auth))
        : formatNqrCell(
            p.shortCode,
            p.shortCode && p.shortCode !== "ERR" ? p.shortCode : "—"
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
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [160, 160, 160],
      lineWidth: 0.12,
    },
    headStyles: {
      fillColor: HEADER_COLOR,
      fontSize: 7,
      lineColor: [160, 160, 160],
      lineWidth: 0.12,
    },
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

function buildCutlistPdfSync(project: ProjectForPdf, existingDoc?: jsPDF): jsPDF {
  const doc = existingDoc ?? new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  if (existingDoc) {
    existingDoc.addPage("a4", "landscape");
  }

  let y = MARGIN;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Lista de Corte", MARGIN, y);
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
  y += 9;

  const parts = getFullCutlist(project);
  y = renderCutlistTable(doc, parts, project, y);

  return doc;
}

/**
 * Gera PDF de lista de corte (cutlistFromBoxes). API async para compatibilidade com fluxo atual.
 * @param existingDoc Se fornecido, adiciona as páginas ao documento existente.
 */
export async function buildCutlistPdf(project: ProjectForPdf, existingDoc?: jsPDF): Promise<jsPDF> {
  return Promise.resolve(buildCutlistPdfSync(project, existingDoc));
}
