/**
 * Exportação industrial: DesignPanel → CutListItem, DesignDrillHole → PanelDrillHole → TXML.
 * SSOT: coordenadas e catálogo partilhados com o viewer via designDrillHoleToTechnical.
 */

import { buildDrillFilesForProject, type DrillExportFile } from "../drill/drillExport";
import type { PieceType } from "../drilling/drillingService";
import { drillFaceToPanelFace, isTopDrillable } from "../drilling/drillingService";
import type { RulesConfig } from "../rules/rulesConfig";
import type {
  BoxModule,
  CutListItem,
  CutListItemComPreco,
  DrillType,
  PanelDrillHole,
} from "../types";
import { isInternalLateral, isLeftLateral, isRightLateral } from "./cavilhaPairing";
import { designDrillHoleToTechnical } from "./designToViewer";
import type { DesignDrillHole, DesignPanel, IndustrialDesignBox } from "./types";

const INDUSTRIAL_PANEL_NOME: Record<string, string> = {
  cima: "Cima",
  fundo: "Fundo",
  lateral_esquerda: "Lateral esquerda",
  lateral_direita: "Lateral direita",
  lateral_interna: "Lateral interna",
  COSTA: "Costa",
  costa_L_a: "Costa L (perna larga)",
  costa_L_b: "Costa L (perna funda)",
  prateleira: "Prateleira",
  divisorio: "Divisório",
  porta: "Porta",
  frente_fixa: "Frente fixa",
  gaveta_lat_esq: "Gaveta lateral esquerda",
  gaveta_lat_dir: "Gaveta lateral direita",
  gaveta_fundo: "Gaveta fundo",
  gaveta_frente_ext: "Gaveta frente",
  gaveta_frente_int: "Gaveta frente interna",
  gaveta_traseira: "Gaveta traseira",
};

/** Tipo industrial da cutlist para um painel de design. */
export function resolveDesignPanelCutListTipo(panel: DesignPanel): string {
  switch (panel.tipo) {
    case "cima":
      return "cima";
    case "fundo":
      return "fundo";
    case "lateral":
      if (isInternalLateral(panel)) return "lateral_interna";
      if (isLeftLateral(panel)) return "lateral_esquerda";
      if (isRightLateral(panel)) return "lateral_direita";
      return "lateral_esquerda";
    case "costa":
      if (panel.id.includes("costa-a")) return "costa_L_a";
      if (panel.id.includes("costa-b")) return "costa_L_b";
      return "COSTA";
    case "prateleira":
      return "prateleira";
    case "divisoria":
      return "divisorio";
    case "frente":
      return "porta";
    case "frente_fixa":
      return "frente_fixa";
    case "gaveta_lat_esq":
    case "gaveta_lat_dir":
    case "gaveta_fundo":
    case "gaveta_frente_ext":
    case "gaveta_frente_int":
    case "gaveta_traseira":
      return panel.tipo;
    default:
      return panel.tipo;
  }
}

export function resolveDesignPanelPieceType(panel: DesignPanel): PieceType {
  return resolveDesignPanelCutListTipo(panel) as PieceType;
}

/**
 * Converte furo de design → PanelDrillHole (cutlist / TXML).
 * Reutiliza designDrillHoleToTechnical — mesma fonte que o viewer.
 */
export function designDrillHoleToPanelDrillHole(
  hole: DesignDrillHole,
  panel: DesignPanel
): PanelDrillHole {
  const technical = designDrillHoleToTechnical(hole, panel.tipo);
  const pieceType = resolveDesignPanelPieceType(panel);
  const holeType = technical.tipo as DrillType;
  const topByFace = isTopDrillable(technical.face);
  const topDrillable =
    topByFace ||
    holeType === "dobradica" ||
    holeType === "dobradica_fixacao" ||
    holeType === "dobradica_parafuso_uniao" ||
    holeType === "prateleira" ||
    holeType === "puxador" ||
    holeType === "fixacao_metalica";

  return {
    x: technical.x,
    y: technical.y,
    diameter: technical.diametro,
    depth: technical.profundidade,
    holeType,
    face: drillFaceToPanelFace(technical.face, pieceType),
    topDrillable,
  };
}

export function designDrillHolesToPanelDrillHoles(panel: DesignPanel): PanelDrillHole[] {
  return panel.drillHoles.map((h) => designDrillHoleToPanelDrillHole(h, panel));
}

/** DesignPanel → CutListItem com furos de fabricação. */
export function designPanelToCutListItem(
  panel: DesignPanel,
  box: IndustrialDesignBox
): CutListItem {
  const tipo = resolveDesignPanelCutListTipo(panel);
  const drillHoles = designDrillHolesToPanelDrillHoles(panel);

  return {
    id: panel.id,
    nome: INDUSTRIAL_PANEL_NOME[tipo] ?? tipo,
    tipo,
    quantidade: 1,
    dimensoes: {
      largura: panel.widthMm,
      altura: panel.heightMm,
      profundidade: panel.thicknessMm,
    },
    espessura: panel.thicknessMm,
    material: panel.materialId,
    materialId: panel.materialId,
    boxId: box.id,
    sourceType: "parametric",
    drillHoles: drillHoles.length > 0 ? drillHoles : undefined,
    metadata: {
      designWorkspace: box.designWorkspace !== false,
      designBoxId: box.id,
      cutouts: panel.cutouts,
    },
  };
}

export function buildCutListFromDesignBox(designBox: IndustrialDesignBox): CutListItem[] {
  return designBox.panels.map((panel) => designPanelToCutListItem(panel, designBox));
}

export function buildCutListComPrecoFromDesignBox(
  designBox: IndustrialDesignBox
): CutListItemComPreco[] {
  return buildCutListFromDesignBox(designBox).map((item) => ({
    ...item,
    precoUnitario: 0,
    precoTotal: 0,
  }));
}

export type DesignDrillExportProjectContext = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
};

/** Cutlist do design + TXML KDTPanelFormat via drillExport.ts. */
export function buildDrillFilesFromDesignBox(
  designBox: IndustrialDesignBox,
  project: DesignDrillExportProjectContext
): DrillExportFile[] {
  const items = buildCutListComPrecoFromDesignBox(designBox);
  return buildDrillFilesForProject(items, project);
}
