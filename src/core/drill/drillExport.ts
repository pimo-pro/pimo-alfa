/**
 * Exportação DRILL: gera ficheiros XML por peça para furos laterais de cavilha.
 * Não altera TCN/Nesting. Estrutura de saída: /drill/XML/<qrCode>.xml.
 * Modelo de faces: apenas furos com holeType "cavilha" e topDrillable === false (face B / lateral),
 * conforme docs/matriz-faces-A-B-FINAL.md. Não usa PanelFace na exportação.
 */

import type { CutListItemComPreco } from "../types";
import type { BoxModule } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import { buildLocalQrPayload } from "../qrcode/qrcodeService";

const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

/**
 * Cada furo lateral de cavilha é exportado como furo vertical.
 * X1 segue o comprimento da peça (PanelLength).
 * Y1 usa o sistema da máquina: topo = T/2, fundo = PanelWidth - T/2.
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

  for (const h of holes) {
    const y1 = h.y === 0 ? panelThickness / 2 : panelWidth - panelThickness / 2;
    lines.push("<CAD>");
    lines.push("  <TypeNo>1</TypeNo>");
    lines.push("  <TypeName>Vertical Hole</TypeName>");
    lines.push(`  <X1>${fmt(h.x)}</X1>`);
    lines.push(`  <Y1>${fmt(y1)}</Y1>`);
    lines.push(`  <Depth>${fmt(h.depth)}</Depth>`);
    lines.push(`  <Diameter>${fmt(h.diameter)}</Diameter>`);
    lines.push("  <Enable>1</Enable>");
    lines.push("</CAD>");
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
    const seenXY = new Set<string>();
    const uniqueCavilhas = lateralCavilhas.filter((h) => {
      const keyX = Math.round(h.x * 10) / 10;
      const keyY = Math.round(h.y * 10) / 10;
      const key = `${keyX}|${keyY}`;
      if (seenXY.has(key)) return false;
      seenXY.add(key);
      return true;
    });
    if (uniqueCavilhas.length === 0) continue;

    const pieceNumber = Number(item.pieceNumber ?? 0) || idx + 1;
    const code =
      item.shortCode ??
      buildLocalQrPayload(item, project, pieceNumber);
    const filenameBase = sanitizeFilename(code);

    const panelLength = item.dimensoes?.altura ?? 0;
    const panelWidth = item.dimensoes?.largura ?? 0;
    const panelThickness = Number(item.espessura) || 0;

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
