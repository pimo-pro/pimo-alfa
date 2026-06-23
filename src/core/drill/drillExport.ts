import type { CutListItemComPreco, PanelDrillHole } from "../types";
import type { BoxModule } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import { buildLocalQrPayload } from "../qrcode/qrcodeService";
import { resolveAuthoritativeLabelNumber } from "../qrcode/panelLabelNumber";
import { isLateralPanel } from "./lateralDowels";
import { getDrillBackDistance, getDrillFrontDistance } from "./drillConfig";
import { isDrawerPieceTipo } from "../../services/drawerCutlistAdapter";

const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

/** Sangria de ferramenta nos rasgos — alinhado com KDT industrial (BeginX=L+10, EndX=-10). */
const GROOVE_OVERCUT_MM = 10;
const PANEL_EDGE_EPS_MM = 0.5;

function resolveHorizontalHoleQuadrant(x: number, panelLength: number): 1 | 2 {
  if (Math.abs(x) <= PANEL_EDGE_EPS_MM) return 2;
  if (Math.abs(x - panelLength) <= PANEL_EDGE_EPS_MM) return 1;
  return 1;
}

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
  panelThickness: number,
  frontDist: number,
  backDist: number
): string {
  const z1 = fmt(panelThickness / 2);
  const y1Front = frontDist;
  const y1Back = panelWidth - backDist;
  const lines: string[] = [];

  lines.push(" <PANEL>");
  lines.push(`  <PanelLength>${fmt(panelLength)}</PanelLength>`);
  lines.push(`  <PanelWidth>${fmt(panelWidth)}</PanelWidth>`);
  lines.push(`  <PanelThickness>${fmt(panelThickness)}</PanelThickness>`);
  lines.push(" </PANEL>");

  // Quadrant 2 — borda esquerda (X1=0), 2 furos: frente e fundo
  for (const y1 of [y1Front, y1Back]) {
    lines.push(" <CAD>");
    lines.push("  <TypeNo>2</TypeNo>");
    lines.push("  <TypeName>Horizontal Hole</TypeName>");
    lines.push("  <X1>0.00</X1>");
    lines.push(`  <Y1>${fmt(y1)}</Y1>`);
    lines.push(`  <Z1>${z1}</Z1>`);
    lines.push("  <Quadrant>2</Quadrant>");
    lines.push("  <Depth>30.00</Depth>");
    lines.push("  <Diameter>10.00</Diameter>");
    lines.push("  <Enable>1</Enable>");
    lines.push(" </CAD>");
  }

  // Quadrant 1 — borda direita (X1=L), 2 furos: frente e fundo
  for (const y1 of [y1Front, y1Back]) {
    lines.push(" <CAD>");
    lines.push("  <TypeNo>2</TypeNo>");
    lines.push("  <TypeName>Horizontal Hole</TypeName>");
    lines.push(`  <X1>${fmt(panelLength)}</X1>`);
    lines.push(`  <Y1>${fmt(y1)}</Y1>`);
    lines.push(`  <Z1>${z1}</Z1>`);
    lines.push("  <Quadrant>1</Quadrant>");
    lines.push("  <Depth>30.00</Depth>");
    lines.push("  <Diameter>10.00</Diameter>");
    lines.push("  <Enable>1</Enable>");
    lines.push(" </CAD>");
  }

  const body = lines.join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<KDTPanelFormat>\n${body}\n</KDTPanelFormat>`;
}

function buildXmlFromDrillHoles(
  panelLength: number,
  panelWidth: number,
  panelThickness: number,
  holes: PanelDrillHole[]
): string {
  const lines: string[] = [];
  lines.push(" <PANEL>");
  lines.push(`  <PanelLength>${fmt(panelLength)}</PanelLength>`);
  lines.push(`  <PanelWidth>${fmt(panelWidth)}</PanelWidth>`);
  lines.push(`  <PanelThickness>${fmt(panelThickness)}</PanelThickness>`);
  lines.push(" </PANEL>");

  for (const hole of holes) {
    // TypeNo=3 — Vertical Line (rasgo de encaixe, schema KDT industrial)
    if (hole.holeSubtype === "groove") {
      const beginY = hole.y;
      const beginX = panelLength + GROOVE_OVERCUT_MM;
      const endX = -GROOVE_OVERCUT_MM;
      lines.push(" <CAD>");
      lines.push("  <TypeNo>3</TypeNo>");
      lines.push("  <TypeName>Vertical Line</TypeName>");
      lines.push(`  <BeginX>${fmt(beginX)}</BeginX>`);
      lines.push(`  <BeginY>${fmt(beginY)}</BeginY>`);
      lines.push(`  <EndX>${fmt(endX)}</EndX>`);
      lines.push(`  <EndY>${fmt(beginY)}</EndY>`);
      lines.push(`  <Width>${fmt(hole.grooveWidth ?? 0)}</Width>`);
      lines.push(`  <Depth>${fmt(hole.depth)}</Depth>`);
      lines.push("  <Enable>1</Enable>");
      lines.push(" </CAD>");
      continue;
    }

    const isVertical =
      hole.topDrillable === true ||
      hole.holeType === "corredica" ||
      hole.holeType === "parafuso" ||
      hole.holeType === "puxador" ||
      hole.holeType === "fixacao_metalica";
    if (isVertical) {
      lines.push(" <CAD>");
      lines.push("  <TypeNo>1</TypeNo>");
      lines.push("  <TypeName>Vertical Hole</TypeName>");
      lines.push(`  <X1>${fmt(hole.x)}</X1>`);
      lines.push(`  <Y1>${fmt(hole.y)}</Y1>`);
      lines.push("  <Z1>0.00</Z1>");
      lines.push(`  <Depth>${fmt(hole.depth)}</Depth>`);
      lines.push(`  <Diameter>${fmt(hole.diameter)}</Diameter>`);
      lines.push("  <Enable>1</Enable>");
      lines.push(" </CAD>");
      continue;
    }

    lines.push(" <CAD>");
    lines.push("  <TypeNo>2</TypeNo>");
    lines.push("  <TypeName>Horizontal Hole</TypeName>");
    lines.push(`  <X1>${fmt(hole.x)}</X1>`);
    lines.push(`  <Y1>${fmt(hole.y)}</Y1>`);
    lines.push(`  <Z1>${fmt(panelThickness / 2)}</Z1>`);
    lines.push(`  <Quadrant>${resolveHorizontalHoleQuadrant(hole.x, panelLength)}</Quadrant>`);
    lines.push(`  <Depth>${fmt(hole.depth)}</Depth>`);
    lines.push(`  <Diameter>${fmt(hole.diameter)}</Diameter>`);
    lines.push("  <Enable>1</Enable>");
    lines.push(" </CAD>");
  }

  const body = lines.join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<KDTPanelFormat>\n${body}\n</KDTPanelFormat>`;
}

/** XML estrutural de gaveta — exclui corrediça (mantida na cutlist / viewer). */
function drawerHolesForStructuralXml(holes: PanelDrillHole[]): PanelDrillHole[] {
  return holes.filter((h) => h.holeType !== "corredica");
}

function resolveDrawerPanelDimensions(item: CutListItemComPreco): {
  panelLength: number;
  panelWidth: number;
} | null {
  const largura = Number(item.dimensoes?.largura ?? 0);
  const altura = Number(item.dimensoes?.altura ?? 0);
  if (largura <= 0 || altura <= 0) return null;

  // KDT industrial: L = PanelLength (profundidade / largura), W = PanelWidth (altura).
  return { panelLength: largura, panelWidth: altura };
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
 * Gera um ficheiro XML por cada peça lateral do projecto e por cada peça de gaveta com furação.
 */
export function buildDrillFilesForProject(
  items: CutListItemComPreco[],
  project: ProjectContext
): DrillExportFile[] {
  const out: DrillExportFile[] = [];
  const frontDist = getDrillFrontDistance();
  const backDist = getDrillBackDistance();
  const usedNames = new Set<string>();

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const panelThickness = Number(item.espessura) || 19;

    let panelLength = 0;
    let panelWidth = 0;
    let xml: string | null = null;

    if (isLateralPanel(item)) {
      panelLength = item.dimensoes?.altura ?? 0;
      panelWidth = item.dimensoes?.largura ?? 0;
      if (panelLength <= 0 || panelWidth <= 0) continue;
      xml = buildXmlForLateral(panelLength, panelWidth, panelThickness, frontDist, backDist);
    } else if (isDrawerPieceTipo(item.tipo) && (item.drillHoles?.length ?? 0) > 0) {
      const dims = resolveDrawerPanelDimensions(item);
      if (!dims) continue;
      panelLength = dims.panelLength;
      panelWidth = dims.panelWidth;
      xml = buildXmlFromDrillHoles(
        panelLength,
        panelWidth,
        panelThickness,
        drawerHolesForStructuralXml(item.drillHoles!)
      );
    } else {
      continue;
    }

    const auth = resolveAuthoritativeLabelNumber(item);
    const industrialLabel = (item.metadata as { industrialLabel?: string } | undefined)?.industrialLabel;
    const code =
      industrialLabel?.trim() ||
      (auth != null
        ? item.shortCode ?? buildLocalQrPayload(item, project, auth)
        : item.shortCode ?? `${item.tipo ?? "piece"}-${item.id ?? String(idx)}`);
    let filenameBase = sanitizeFilename(code);
    let dedupe = 2;
    while (usedNames.has(filenameBase)) {
      filenameBase = sanitizeFilename(`${code}_${dedupe}`);
      dedupe += 1;
    }
    usedNames.add(filenameBase);

    out.push({
      filenameBase,
      partName: item.nome,
      thicknessMm: panelThickness,
      xml,
    });
  }

  return out;
}
