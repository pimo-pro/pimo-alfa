/**
 * Módulo industrial built-in: Armário Base 600×720×500 mm.
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
  INDUSTRIAL_BASE_600_MODULE_ID,
  INDUSTRIAL_BASE_600_MODULE_NOME,
} from "./industrialBaseConstants";

const OUTER = { widthMm: 600, heightMm: 720, depthMm: 500 };
const ESP = 19;
const MATERIAL = "mdf_branco";
const DOOR_GAP_MM = 2;

export type IndustrialBaseCutoutOptions = {
  /** Recorte na costa (ex.: passagem tubagem). */
  recorteTraseiro?: { widthMm: number; heightMm: number; xMm?: number; yMm?: number };
  /** Recorte inferior no fundo (rodapé). */
  recorteInferiorRodape?: { widthMm: number; heightMm: number; xMm?: number };
  /** Recorte superior na cima (iluminação). */
  recorteSuperiorIluminacao?: { widthMm: number; heightMm: number; xMm?: number };
};

export type BuildIndustrialBase600Options = {
  includeShelf?: boolean;
  shelfHeightMm?: number;
  hingeSide?: "left" | "right";
  cutouts?: IndustrialBaseCutoutOptions;
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
  cutouts?: IndustrialBaseCutoutOptions
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

    if (cutouts.recorteInferiorRodape && panel.tipo === "fundo") {
      const w = cutouts.recorteInferiorRodape.widthMm;
      const h = cutouts.recorteInferiorRodape.heightMm;
      const x = cutouts.recorteInferiorRodape.xMm ?? (panel.widthMm - w) / 2;
      list.push(buildCutout("recorte_inferior_rodape", x, 0, w, h));
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
export function buildIndustrialBase600x720x500DesignBox(
  options: BuildIndustrialBase600Options = {}
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
    id: INDUSTRIAL_BASE_600_MODULE_ID,
    nome: INDUSTRIAL_BASE_600_MODULE_NOME,
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
  });

  const blocking = getBlockingIssues(validateIndustrialDesignBox(box));
  if (blocking.length > 0) {
    throw new Error(
      `Módulo industrial inválido: ${blocking.map((i) => i.message).join("; ")}`
    );
  }

  return box;
}

export function buildIndustrialBase600ModelRecord(
  project?: DesignDrillExportProjectContext,
  rules?: RulesConfig
): CustomIndustrialModelRecord {
  const designBox = buildIndustrialBase600x720x500DesignBox();
  const projectCtx: DesignDrillExportProjectContext = project ?? {
    projectName: "MODULO_INDUSTRIAL_BASE",
    boxes: [],
    rules: rules ?? defaultRulesConfig,
  };

  const cutlistComPreco = buildCutListComPrecoFromDesignBox(designBox);
  const cutlist = cutlistComPreco.map(({ precoUnitario: _pu, precoTotal: _pt, ...item }) => item);
  const viewerMarkers = buildViewerDrillMarkersFromDesign(designBox);
  const drillExportFiles = buildDrillFilesFromDesignBox(designBox, projectCtx);
  const holeCount = designBox.panels.reduce((sum, p) => sum + p.drillHoles.length, 0);

  return {
    id: INDUSTRIAL_BASE_600_MODULE_ID,
    nome: INDUSTRIAL_BASE_600_MODULE_NOME,
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
      moduleKind: "industrial-base-600x720x500",
    },
  };
}

/** Regista o módulo no catálogo industrial (idempotente). */
export function registerIndustrialBase600x720x500Module(): CustomIndustrialModelRecord {
  const existing = getBuiltinIndustrialModel(INDUSTRIAL_BASE_600_MODULE_ID);
  if (existing) return existing;

  const record = buildIndustrialBase600ModelRecord();
  registerBuiltinIndustrialModel(record);
  return record;
}
