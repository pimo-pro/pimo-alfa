/**
 * Exportação DRILL: gera ficheiros XML por peça para furos laterais de cavilha.
 * Não altera TCN/Nesting. Estrutura de saída: /drill/XML/<qrCode>.xml.
 */

import type { CutListItemComPreco } from "../types";
import type { BoxModule } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import { buildLocalQrPayload } from "../qrcode/qrcodeService";

const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

/**
 * Cada peça lateral tem furação dos dois lados: 2 furos na borda esquerda (Quadrant=2) e
 * 2 na borda direita (Quadrant=1), nas mesmas posições Y1. Total 4 furos, sempre de fora para dentro, X1=0.
 */
function buildXmlContent(
  panelLength: number,
  panelWidth: number,
  panelThickness: number,
  holes: Array<{ x: number; y: number; diameter: number; depth: number }>
): string {
  const lines: string[] = [];
  lines.push("<PANEL>");
  lines.push(`  <PanelLength>${fmt(panelLength)}</PanelLength>`);
  lines.push(`  <PanelWidth>${fmt(panelWidth)}</PanelWidth>`);
  lines.push(`  <PanelThickness>${fmt(panelThickness)}</PanelThickness>`);
  lines.push("</PANEL>");

  const z1 = panelThickness / 2;
  for (const h of holes) {
    const y1 = fmt(h.x);
    for (const quadrant of [2, 1] as const) {
      lines.push("<CAD>");
      lines.push("  <TypeNo>2</TypeNo>");
      lines.push("  <TypeName>Horizontal Hole</TypeName>");
      lines.push(`  <Quadrant>${quadrant}</Quadrant>`);
      lines.push(`  <Z1>${fmt(z1)}</Z1>`);
      lines.push("  <X1>0.00</X1>");
      lines.push(`  <Y1>${y1}</Y1>`);
      lines.push(`  <Depth>${fmt(h.depth)}</Depth>`);
      lines.push(`  <Diameter>${fmt(h.diameter)}</Diameter>`);
      lines.push("  <Enable>1</Enable>");
      lines.push("</CAD>");
    }
  }
  const body = lines.join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<KDTPanelFormat>\n${body}\n</KDTPanelFormat>`;
}

/** Sanitiza identificador para nome de ficheiro. */
function sanitizeFilename(code: string): string {
  return code.replace(/[^\p{L}\p{N}_-]/gu, "_").slice(0, 64) || "piece";
}

export type DrillExportFile = {
  filenameBase: string;
  partName: string;
  thicknessMm: number;
  xml: string;
};

type ProjectContext = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
};

/**
 * Gera ficheiros DRILL (XML) para todas as peças que tenham furos laterais de cavilha.
 * Usa shortCode ou buildLocalQrPayload como identificador da peça.
 */
export function buildDrillFilesForProject(
  items: CutListItemComPreco[],
  project: ProjectContext
): DrillExportFile[] {
  const out: DrillExportFile[] = [];
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const lateralCavilhas = (item.drillHoles ?? []).filter(
      (h) => h.holeType === "cavilha" && h.topDrillable === false
    );
    const seenY = new Set<number>();
    const uniqueCavilhas = lateralCavilhas.filter((h) => {
      const key = Math.round(h.x * 10) / 10;
      if (seenY.has(key)) return false;
      seenY.add(key);
      return true;
    });
    if (uniqueCavilhas.length === 0) continue;

    const pieceNumber = Number(item.pieceNumber ?? 0) || idx + 1;
    const code =
      item.shortCode ??
      buildLocalQrPayload(item, project, pieceNumber);
    const filenameBase = sanitizeFilename(code);

    const panelLength = item.dimensoes?.largura ?? 0;
    const panelWidth = item.dimensoes?.altura ?? 0;
    const panelThickness = Number(item.espessura ?? item.dimensoes?.profundidade) || 0;

    const holes = uniqueCavilhas.map((h) => ({
      x: h.x,
      y: h.y,
      diameter: h.diameter,
      depth: h.depth,
    }));

    out.push({
      filenameBase,
      partName: item.nome,
      thicknessMm: panelThickness,
      xml: buildXmlContent(panelLength, panelWidth, panelThickness, holes),
    });
  }
  return out;
}
