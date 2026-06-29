/**
 * Módulo industrial built-in: Armário Canto Direita 900×720×600 mm.
 */

import type { RulesConfig } from "../../rules/rulesConfig";
import { defaultRulesConfig } from "../../rules/rulesConfig";
import {
  buildCutListComPrecoFromDesignBox,
  buildDrillFilesFromDesignBox,
  type DesignDrillExportProjectContext,
} from "../designToCutlist";
import { buildViewerDrillMarkersFromDesign } from "../designToViewer";
import { getBlockingIssues, validateIndustrialDesignBox } from "../geometryValidation";
import type { CustomIndustrialModelRecord } from "../industrialCatalogTypes";
import {
  getBuiltinIndustrialModel,
  registerBuiltinIndustrialModel,
} from "../staticIndustrialRegistry";
import type { DesignPanelCutout, IndustrialDesignBox } from "../types";
import { nextDesignId } from "../designModel";
import {
  applyAllIndustrialCornerDrillingRules,
  stripFixedFrontHingeHoles,
} from "./industrialCornerDrilling";
import {
  buildCornerRightIndustrialPanels,
  computeCornerIndustrialLayout,
  createCornerIndustrialDesignBox,
  type CornerIndustrialOuter,
} from "./industrialCornerGeometry";
import {
  INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID,
  INDUSTRIAL_CORNER_RIGHT_900_MODULE_NOME,
  INDUSTRIAL_CORNER_SHELF_TECHNICAL_MARGINS,
} from "./industrialCornerRightConstants";

const OUTER: CornerIndustrialOuter = { widthMm: 900, heightMm: 720, depthMm: 600 };
const MATERIAL = "mdf_branco";

export type IndustrialCornerCutoutOptions = {
  recorteTraseiroL?: { widthMm: number; heightMm: number; xMm?: number; yMm?: number; leg?: "a" | "b" };
  recorteInferiorRodape?: { widthMm: number; heightMm: number; xMm?: number };
};

export type BuildIndustrialCornerRight900Options = {
  includeShelf?: boolean;
  shelfHeightMm?: number;
  shortLegDepthMm?: number;
  cutouts?: IndustrialCornerCutoutOptions;
};

function buildCutout(
  kind: DesignPanelCutout["kind"],
  xMm: number,
  yMm: number,
  widthMm: number,
  heightMm: number
): DesignPanelCutout {
  return { id: nextDesignId("cutout"), kind, xMm, yMm, widthMm, heightMm };
}

function applyCutoutsToPanels(
  box: IndustrialDesignBox,
  cutouts?: IndustrialCornerCutoutOptions
): IndustrialDesignBox {
  if (!cutouts) return box;

  const panels = box.panels.map((panel) => {
    const list: DesignPanelCutout[] = [...(panel.cutouts ?? [])];

    if (cutouts.recorteTraseiroL && panel.id.endsWith(":costa-a") && cutouts.recorteTraseiroL.leg !== "b") {
      const w = cutouts.recorteTraseiroL.widthMm;
      const h = cutouts.recorteTraseiroL.heightMm;
      const x = cutouts.recorteTraseiroL.xMm ?? (panel.widthMm - w) / 2;
      const y = cutouts.recorteTraseiroL.yMm ?? (panel.heightMm - h) / 2;
      list.push(buildCutout("recorte_traseiro_L", x, y, w, h));
    }

    if (cutouts.recorteTraseiroL && panel.id.endsWith(":costa-b") && cutouts.recorteTraseiroL.leg === "b") {
      const w = cutouts.recorteTraseiroL.widthMm;
      const h = cutouts.recorteTraseiroL.heightMm;
      const x = cutouts.recorteTraseiroL.xMm ?? (panel.widthMm - w) / 2;
      const y = cutouts.recorteTraseiroL.yMm ?? (panel.heightMm - h) / 2;
      list.push(buildCutout("recorte_traseiro_L", x, y, w, h));
    }

    if (cutouts.recorteInferiorRodape && panel.tipo === "fundo") {
      const w = cutouts.recorteInferiorRodape.widthMm;
      const h = cutouts.recorteInferiorRodape.heightMm;
      const x = cutouts.recorteInferiorRodape.xMm ?? (panel.widthMm - w) / 2;
      list.push(buildCutout("recorte_inferior_rodape", x, 0, w, h));
    }

    return list.length ? { ...panel, cutouts: list } : panel;
  });

  return { ...box, panels };
}

export function buildIndustrialCornerRight900x720x600DesignBox(
  options: BuildIndustrialCornerRight900Options = {}
): IndustrialDesignBox {
  const layout = computeCornerIndustrialLayout(OUTER, {
    shortLegDepthMm: options.shortLegDepthMm,
    shelfHeightMm: options.shelfHeightMm,
    cornerSide: "right",
  });

  const { panels, constraints } = buildCornerRightIndustrialPanels({
    boxId: INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID,
    nome: INDUSTRIAL_CORNER_RIGHT_900_MODULE_NOME,
    layout,
    materialId: MATERIAL,
    includeShelf: options.includeShelf !== false,
  });

  let box = createCornerIndustrialDesignBox(
    INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID,
    INDUSTRIAL_CORNER_RIGHT_900_MODULE_NOME,
    OUTER,
    panels,
    constraints,
    MATERIAL
  );

  box = applyCutoutsToPanels(box, options.cutouts);

  box = applyAllIndustrialCornerDrillingRules(box, {
    hasShelf: options.includeShelf !== false,
    hingeSide: "right",
    shelfTechnicalMargins: INDUSTRIAL_CORNER_SHELF_TECHNICAL_MARGINS,
    layout,
    cornerSide: "right",
  });

  box = stripFixedFrontHingeHoles(box);

  const blocking = getBlockingIssues(validateIndustrialDesignBox(box));
  if (blocking.length > 0) {
    throw new Error(
      `Módulo canto industrial inválido: ${blocking.map((i) => i.message).join("; ")}`
    );
  }

  return box;
}

export function buildIndustrialCornerRight900ModelRecord(
  project?: DesignDrillExportProjectContext,
  rules?: RulesConfig
): CustomIndustrialModelRecord {
  const designBox = buildIndustrialCornerRight900x720x600DesignBox();
  const projectCtx: DesignDrillExportProjectContext = project ?? {
    projectName: "MODULO_INDUSTRIAL_CANTO_DIREITA",
    boxes: [],
    rules: rules ?? defaultRulesConfig,
  };

  const cutlistComPreco = buildCutListComPrecoFromDesignBox(designBox);
  const cutlist = cutlistComPreco.map(({ precoUnitario: _pu, precoTotal: _pt, ...item }) => item);
  const viewerMarkers = buildViewerDrillMarkersFromDesign(designBox);
  const drillExportFiles = buildDrillFilesFromDesignBox(designBox, projectCtx);
  const holeCount = designBox.panels.reduce((sum, p) => sum + p.drillHoles.length, 0);

  return {
    id: INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID,
    nome: INDUSTRIAL_CORNER_RIGHT_900_MODULE_NOME,
    tipo: "industrial-designer",
    designWorkspace: false,
    widthMm: OUTER.widthMm,
    heightMm: OUTER.heightMm,
    depthMm: OUTER.depthMm,
    designBox: structuredClone(designBox),
    cutlist,
    cutlistComPreco,
    drillExportFiles,
    viewerMarkers,
    metadata: {
      designWorkspace: false,
      tipo: "industrial-designer",
      sourceBoxId: designBox.id,
      panelCount: designBox.panels.length,
      holeCount,
      espessuraMm: designBox.espessuraMm,
      materialId: MATERIAL,
      createdAt: new Date().toISOString(),
      cutlistItemCount: cutlist.length,
      txmlFileCount: drillExportFiles.length,
      moduleKind: "industrial-corner-right-900x720x600",
      categoriaCatalogo: "corner",
      cornerSide: "right",
    },
  };
}

export function registerIndustrialCornerRight900x720x600Module(): CustomIndustrialModelRecord {
  const existing = getBuiltinIndustrialModel(INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID);
  if (existing) return existing;

  const record = buildIndustrialCornerRight900ModelRecord();
  registerBuiltinIndustrialModel(record);
  return record;
}
