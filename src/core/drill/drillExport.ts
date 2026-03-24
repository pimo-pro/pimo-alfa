import type { CutListItemComPreco } from "../types";
import type { BoxModule } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import { buildLocalQrPayload } from "../qrcode/qrcodeService";
import { calcLateralDowelHoles, isLateralPanel } from "./lateralDowels";

const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

function sanitizeFilename(code: string): string {
  return code.replace(/[^\p{L}\p{N}_-]/gu, "_").slice(0, 64) || "piece";
}

/**
 * Gera XML KDTPanelFormat para uma peça lateral.
 * Sistema de coordenadas da máquina:
 *   - Origem = canto superior direito
 *   - X+ = vai para a esquerda (ao longo do comprimento PanelLength)
 *   - Y+ = vai para baixo (ao longo da largura PanelWidth)
 *   - TypeNo=1 = Vertical Hole (perfura de cima para baixo)
 *   - X1 = posição ao longo do comprimento
 *   - Y1 = edge "top" → espessura/2 | edge "bottom" → PanelWidth - espessura/2
 */
function buildXmlForLateral(
  panelLength: number,
  panelWidth: number,
  panelThickness: number
): string {
  const holes = calcLateralDowelHoles(panelLength);
  const lines: string[] = [];

  lines.push(" <PANEL>");
  lines.push(`  <PanelLength>${fmt(panelLength)}</PanelLength>`);
  lines.push(`  <PanelWidth>${fmt(panelWidth)}</PanelWidth>`);
  lines.push(`  <PanelThickness>${fmt(panelThickness)}</PanelThickness>`);
  lines.push(" </PANEL>");

  for (const h of holes) {
    const x1 = h.x;
    const y1 = h.edge === "top" ? panelThickness / 2 : panelWidth - panelThickness / 2;

    lines.push("<CAD>");
    lines.push("  <TypeNo>1</TypeNo>");
    lines.push("  <TypeName>Vertical Hole</TypeName>");
    lines.push(`  <X1>${fmt(x1)}</X1>`);
    lines.push(`  <Y1>${fmt(y1)}</Y1>`);
    lines.push(`  <Depth>${fmt(h.depth)}</Depth>`);
    lines.push(`  <Diameter>${fmt(h.diameter)}</Diameter>`);
    lines.push("  <Enable>1</Enable>");
    lines.push("</CAD>");
  }

  const body = lines.join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<KDTPanelFormat>\n${body}\n</KDTPanelFormat>`;
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
 * Gera um ficheiro XML por cada peça lateral do projecto.
 * panelLength = dimensoes.altura (comprimento da lateral)
 * panelWidth  = dimensoes.largura (largura/profundidade da lateral)
 */
export function buildDrillFilesForProject(
  items: CutListItemComPreco[],
  project: ProjectContext
): DrillExportFile[] {
  const out: DrillExportFile[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (!isLateralPanel(item)) continue;

    const panelLength = item.dimensoes?.altura ?? 0;
    const panelWidth = item.dimensoes?.largura ?? 0;
    const panelThickness = Number(item.espessura) || 19;

    if (panelLength <= 0 || panelWidth <= 0) continue;

    const pieceNumber = Number(item.pieceNumber ?? 0) || idx + 1;
    const code = item.shortCode ?? buildLocalQrPayload(item, project, pieceNumber);
    const filenameBase = sanitizeFilename(code);

    out.push({
      filenameBase,
      partName: item.nome,
      thicknessMm: panelThickness,
      xml: buildXmlForLateral(panelLength, panelWidth, panelThickness),
    });
  }

  return out;
}
