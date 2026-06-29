/**
 * Converte modelo de design industrial → marcadores de furo do Viewer.
 */

import type { DrillFace, DrillPanelKey, TechnicalDrillHole, ViewerDrillMarkersByPanel } from "../types";
import { getHoleTypeById } from "../drill/holeCatalog";
import { isInternalLateral, isLeftLateral } from "./cavilhaPairing";
import type { DesignDrillHole, DesignPanel, DesignPanelTipo, IndustrialDesignBox } from "./types";

const EMPTY_MARKERS: ViewerDrillMarkersByPanel = {
  cima: [],
  fundo: [],
  lateral_esquerda: [],
  lateral_direita: [],
  porta: [],
};

const PANEL_TIPO_TO_DRILL_FACE: Record<DesignPanelTipo, DrillFace> = {
  cima: "cima",
  fundo: "fundo",
  lateral: "esquerda",
  frente: "frente",
  frente_fixa: "frente",
  costa: "tras",
  prateleira: "fundo",
  divisoria: "frente",
  gaveta_lat_esq: "direita",
  gaveta_lat_dir: "esquerda",
  gaveta_fundo: "cima",
  gaveta_frente_ext: "frente",
  gaveta_frente_int: "tras",
  gaveta_traseira: "frente",
};

function resolveDrillPanelKey(panel: DesignPanel): DrillPanelKey | "frente_fixa" | null {
  if (panel.tipo === "cima") return "cima";
  if (panel.tipo === "fundo") return "fundo";
  if (panel.tipo === "lateral") {
    if (isInternalLateral(panel)) return "lateral_esquerda";
    if (isLeftLateral(panel)) return "lateral_esquerda";
    return "lateral_direita";
  }
  if (panel.tipo === "frente") return "porta";
  if (panel.tipo === "frente_fixa") return "frente_fixa";
  if (panel.tipo === "costa") return null;
  return null;
}

export function designDrillHoleToTechnical(
  hole: DesignDrillHole,
  panelTipo: DesignPanelTipo
): TechnicalDrillHole {
  const catalog = getHoleTypeById(hole.holeTypeId);
  return {
    x: hole.xMm,
    y: hole.yMm,
    diametro: catalog.diametroMm,
    profundidade: catalog.profundidadeMm,
    tipo: catalog.drillType,
    face: hole.drillFace ?? PANEL_TIPO_TO_DRILL_FACE[panelTipo],
  };
}

export function buildViewerDrillMarkersFromDesign(
  designBox: IndustrialDesignBox | null | undefined
): ViewerDrillMarkersByPanel {
  if (!designBox?.panels?.length) return { ...EMPTY_MARKERS };

  const result: ViewerDrillMarkersByPanel = {
    cima: [],
    fundo: [],
    lateral_esquerda: [],
    lateral_direita: [],
    porta: [],
    portaPerDoor: [],
  };

  designBox.panels.forEach((panel) => {
    if (!panel.drillHoles.length) return;
    const key = resolveDrillPanelKey(panel);
    if (!key) return;

    const technical = panel.drillHoles.map((h) => designDrillHoleToTechnical(h, panel.tipo));
    if (key === "porta") {
      result.porta = [...(result.porta ?? []), ...technical];
      result.portaPerDoor = [...(result.portaPerDoor ?? []), technical];
    } else if (key === "frente_fixa") {
      result.frente_fixa = [...(result.frente_fixa ?? []), ...technical];
    } else if (key in result && Array.isArray(result[key as DrillPanelKey])) {
      result[key as DrillPanelKey] = [...result[key as DrillPanelKey], ...technical];
    }
  });

  return result;
}

/** Mescla marcadores do design com marcadores existentes da cutlist. */
export function mergeViewerDrillMarkers(
  base: ViewerDrillMarkersByPanel | undefined,
  design: ViewerDrillMarkersByPanel
): ViewerDrillMarkersByPanel {
  const b = base ?? EMPTY_MARKERS;
  return {
    cima: [...b.cima, ...design.cima],
    fundo: [...b.fundo, ...design.fundo],
    lateral_esquerda: [...b.lateral_esquerda, ...design.lateral_esquerda],
    lateral_direita: [...b.lateral_direita, ...design.lateral_direita],
    porta: [...b.porta, ...design.porta],
    portaPerDoor: [...(b.portaPerDoor ?? []), ...(design.portaPerDoor ?? [])],
    frente_fixa: [...(b.frente_fixa ?? []), ...(design.frente_fixa ?? [])],
  };
}
