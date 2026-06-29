/**
 * Módulo industrial built-in: Armário Superior 600×350×300 mm.
 */

import type { RulesConfig } from "../../rules/rulesConfig";
import { defaultRulesConfig } from "../../rules/rulesConfig";
import {
  addDesignPanel,
  createIndustrialDesignBox,
  getInnerDimensions,
  nextDesignId,
} from "../designModel";
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
import { applyAllIndustrialBaseDrillingRules } from "./industrialBaseDrilling";
import {
  INDUSTRIAL_UPPER_600_MODULE_ID,
  INDUSTRIAL_UPPER_600_MODULE_NOME,
  INDUSTRIAL_UPPER_SHELF_TECHNICAL_MARGINS,
} from "./industrialUpperConstants";

const OUTER = { widthMm: 600, heightMm: 350, depthMm: 300 };
const ESP = 19;
const MATERIAL = "mdf_branco";
const DOOR_GAP_MM = 2;

export type IndustrialUpperCutoutOptions = {
  /** Recorte na costa (ex.: passagem tubagem). */
  recorteTraseiro?: { widthMm: number; heightMm: number; xMm?: number; yMm?: number };
  /** Recorte superior na cima (iluminação LED). */
  recorteSuperiorIluminacao?: { widthMm: number; heightMm: number; xMm?: number };
};

export type BuildIndustrialUpper600Options = {
  includeShelf?: boolean;
  shelfHeightMm?: number;
  hingeSide?: "left" | "right";
  cutouts?: IndustrialUpperCutoutOptions;
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
  cutouts?: IndustrialUpperCutoutOptions
): IndustrialDesignBox {
  if (!cutouts) return box;

  const panels = box.panels.map((panel) => {
    const list: DesignPanelCutout[] = [...(panel.cutouts ?? [])];

    if (cutouts.recorteTraseiro && panel.tipo === "costa") {
      const w = cutouts.recorteTraseiro.widthMm;
      const h = cutouts.recorteTraseiro.heightMm;
      const x = cutouts.recorteTraseiro.xMm ?? (panel.widthMm - w) / 2;
      const y = cutouts.recorteTraseiro.yMm ?? (panel.heightMm - h) / 2;
      list.push(buildCutout("recorte_traseiro", x, y, w, h));
    }

    if (cutouts.recorteSuperiorIluminacao && panel.tipo === "cima") {
      const w = cutouts.recorteSuperiorIluminacao.widthMm;
      const h = cutouts.recorteSuperiorIluminacao.heightMm;
      const x = cutouts.recorteSuperiorIluminacao.xMm ?? (panel.widthMm - w) / 2;
      list.push(buildCutout("recorte_superior_iluminacao", x, panel.heightMm - h, w, h));
    }

    return list.length ? { ...panel, cutouts: list } : panel;
  });

  return { ...box, panels };
}

/** Constrói designBox completo com painéis, furos e recortes opcionais. */
export function buildIndustrialUpper600x350x300DesignBox(
  options: BuildIndustrialUpper600Options = {}
): IndustrialDesignBox {
  const includeShelf = options.includeShelf !== false;
  const inner = getInnerDimensions(
    createIndustrialDesignBox({
      outerWidthMm: OUTER.widthMm,
      outerHeightMm: OUTER.heightMm,
      outerDepthMm: OUTER.depthMm,
      espessuraMm: ESP,
    })
  );

  let box = createIndustrialDesignBox({
    id: INDUSTRIAL_UPPER_600_MODULE_ID,
    nome: INDUSTRIAL_UPPER_600_MODULE_NOME,
    outerWidthMm: OUTER.widthMm,
    outerHeightMm: OUTER.heightMm,
    outerDepthMm: OUTER.depthMm,
    espessuraMm: ESP,
    materialId: MATERIAL,
  });

  box = { ...box, designWorkspace: false };

  if (includeShelf) {
    const shelfY = options.shelfHeightMm ?? Math.round(inner.alturaInterna / 2);
    box = addDesignPanel(box, {
      tipo: "prateleira",
      widthMm: inner.larguraInterna,
      heightMm: inner.profundidadeInterna,
      thicknessMm: ESP,
      materialId: MATERIAL,
      positionMm: { x: ESP, y: shelfY, z: 10 },
    });
  }

  const doorWidth = inner.larguraInterna - 2 * DOOR_GAP_MM;
  const doorHeight = inner.alturaInterna - 2 * DOOR_GAP_MM;
  box = addDesignPanel(box, {
    id: `${box.id}:porta`,
    tipo: "frente",
    widthMm: doorWidth,
    heightMm: doorHeight,
    thicknessMm: ESP,
    materialId: MATERIAL,
    positionMm: {
      x: ESP + DOOR_GAP_MM,
      y: ESP + DOOR_GAP_MM,
      z: OUTER.depthMm - ESP,
    },
  });

  box = applyCutoutsToPanels(box, options.cutouts);

  box = applyAllIndustrialBaseDrillingRules(box, {
    hasShelf: includeShelf,
    hingeSide: options.hingeSide ?? "left",
    shelfTechnicalMargins: INDUSTRIAL_UPPER_SHELF_TECHNICAL_MARGINS,
  });

  const blocking = getBlockingIssues(validateIndustrialDesignBox(box));
  if (blocking.length > 0) {
    throw new Error(
      `Módulo industrial inválido: ${blocking.map((i) => i.message).join("; ")}`
    );
  }

  return box;
}

export function buildIndustrialUpper600ModelRecord(
  project?: DesignDrillExportProjectContext,
  rules?: RulesConfig
): CustomIndustrialModelRecord {
  const designBox = buildIndustrialUpper600x350x300DesignBox();
  const projectCtx: DesignDrillExportProjectContext = project ?? {
    projectName: "MODULO_INDUSTRIAL_UPPER",
    boxes: [],
    rules: rules ?? defaultRulesConfig,
  };

  const cutlistComPreco = buildCutListComPrecoFromDesignBox(designBox);
  const cutlist = cutlistComPreco.map(({ precoUnitario: _pu, precoTotal: _pt, ...item }) => item);
  const viewerMarkers = buildViewerDrillMarkersFromDesign(designBox);
  const drillExportFiles = buildDrillFilesFromDesignBox(designBox, projectCtx);
  const holeCount = designBox.panels.reduce((sum, p) => sum + p.drillHoles.length, 0);

  return {
    id: INDUSTRIAL_UPPER_600_MODULE_ID,
    nome: INDUSTRIAL_UPPER_600_MODULE_NOME,
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
      espessuraMm: ESP,
      materialId: MATERIAL,
      createdAt: new Date().toISOString(),
      cutlistItemCount: cutlist.length,
      txmlFileCount: drillExportFiles.length,
      moduleKind: "industrial-upper-600x350x300",
      categoriaCatalogo: "upper",
    },
  };
}

/** Regista o módulo no catálogo industrial (idempotente). */
export function registerIndustrialUpper600x350x300Module(): CustomIndustrialModelRecord {
  const existing = getBuiltinIndustrialModel(INDUSTRIAL_UPPER_600_MODULE_ID);
  if (existing) return existing;

  const record = buildIndustrialUpper600ModelRecord();
  registerBuiltinIndustrialModel(record);
  return record;
}
