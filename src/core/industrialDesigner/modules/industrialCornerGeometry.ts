/**
 * Geometria partilhada — módulos de canto industrial (perfil L).
 */

import {
  CORNER_FIXED_FRONT_OVERSIZE_MM,
  type CornerCabinetConfig,
  type CornerSide,
} from "../../cornerCabinet/cornerCabinetRules";
import { computeCornerLayoutMm } from "../../cornerCabinet/cornerCabinetRules";
import { resolveCornerDoorGapSettings } from "../../cornerCabinet/cornerCabinetRules";
import { nextDesignId } from "../designModel";
import type { DesignPanel, IndustrialDesignBox, PanelConstraint } from "../types";

export const CORNER_INDUSTRIAL_ESP_MM = 19;
export const CORNER_INDUSTRIAL_BACK_MM = 10;
export const CORNER_INTERNAL_LATERAL_MM = 15;
export const CORNER_SHELF_DEPTH_RECESS_MM = 45;

export type CornerIndustrialOuter = {
  widthMm: number;
  heightMm: number;
  depthMm: number;
};

export type CornerIndustrialLayout = {
  outer: CornerIndustrialOuter;
  espMm: number;
  backMm: number;
  innerW: number;
  innerH: number;
  profInterna: number;
  shortLegDepthMm: number;
  cornerNotchWidthMm: number;
  cornerNotchDepthMm: number;
  costaLegAWmm: number;
  costaLegBWmm: number;
  shelfWidthMm: number;
  shelfDepthMm: number;
  fixedFrontWidthMm: number;
  fixedFrontHeightMm: number;
  doorWidthMm: number;
  doorHeightMm: number;
  internalLatX: number;
  shelfYMm: number;
  cornerSide: CornerSide;
};

const CORNER_COZINHA_CONFIG: CornerCabinetConfig = {
  style: "cozinha",
  fixedFrontWidthMm: 180,
  shelfDepthExtraRecessMm: 40,
  doorFrameVisualMm: 0,
  defaultSide: "right",
  layoutMode: "direita",
};

export function computeCornerIndustrialLayout(
  outer: CornerIndustrialOuter,
  options?: { shortLegDepthMm?: number; shelfHeightMm?: number; cornerSide?: CornerSide }
): CornerIndustrialLayout {
  const cornerSide = options?.cornerSide ?? "right";
  const espMm = CORNER_INDUSTRIAL_ESP_MM;
  const backMm = CORNER_INDUSTRIAL_BACK_MM;
  const innerW = outer.widthMm - 2 * espMm;
  const innerH = outer.heightMm - 2 * espMm;
  const profInterna = outer.depthMm - backMm - espMm;
  const shortLegDepthMm = options?.shortLegDepthMm ?? 420;
  const cornerNotchWidthMm =
    CORNER_COZINHA_CONFIG.fixedFrontWidthMm + CORNER_FIXED_FRONT_OVERSIZE_MM + CORNER_INTERNAL_LATERAL_MM;
  const cornerNotchDepthMm = shortLegDepthMm;
  const costaLegBWmm = shortLegDepthMm;
  const costaLegAWmm = Math.max(80, innerW - costaLegBWmm);
  const shelfWidthMm = outer.widthMm - 2 * espMm - 2;
  const shelfDepthMm = Math.max(80, profInterna - CORNER_SHELF_DEPTH_RECESS_MM);
  const internalLatX =
    cornerSide === "right"
      ? espMm + CORNER_COZINHA_CONFIG.fixedFrontWidthMm + CORNER_FIXED_FRONT_OVERSIZE_MM
      : outer.widthMm - espMm - cornerNotchWidthMm - shortLegDepthMm;

  const gaps = resolveCornerDoorGapSettings();
  const doorLayout = computeCornerLayoutMm({
    boxWidthMm: outer.widthMm,
    boxHeightMm: outer.heightMm,
    boxDepthMm: outer.depthMm,
    thicknessMm: espMm,
    side: cornerSide,
    config: { ...CORNER_COZINHA_CONFIG, defaultSide: cornerSide },
    gapVerticalMm: gaps.gapVerticalMm,
    gapHorizontalMm: gaps.gapHorizontalMm,
    doorFixedGapMm: gaps.doorFixedGapMm,
    doorPosZOffsetMm: gaps.doorPosZOffsetMm,
  });

  const shelfYMm = options?.shelfHeightMm ?? Math.round(innerH / 2);

  return {
    outer,
    espMm,
    backMm,
    innerW,
    innerH,
    profInterna,
    shortLegDepthMm,
    cornerNotchWidthMm,
    cornerNotchDepthMm,
    costaLegAWmm,
    costaLegBWmm,
    shelfWidthMm,
    shelfDepthMm,
    fixedFrontWidthMm: doorLayout.fixedFrontWidthMm,
    fixedFrontHeightMm: doorLayout.fixedFrontHeightMm,
    doorWidthMm: doorLayout.doorWidthMm,
    doorHeightMm: doorLayout.doorHeightMm,
    internalLatX,
    shelfYMm,
    cornerSide,
  };
}

function makePanel(
  boxId: string,
  tipo: DesignPanel["tipo"],
  suffix: string,
  widthMm: number,
  heightMm: number,
  thicknessMm: number,
  materialId: string,
  positionMm?: DesignPanel["positionMm"]
): DesignPanel {
  return {
    id: `${boxId}:${suffix}`,
    tipo,
    widthMm,
    heightMm,
    thicknessMm,
    materialId,
    drillHoles: [],
    positionMm,
  };
}

export type BuildCornerIndustrialPanelsInput = {
  boxId: string;
  nome: string;
  layout: CornerIndustrialLayout;
  materialId: string;
  includeShelf?: boolean;
};

function shelfCutoutForCorner(layout: CornerIndustrialLayout): DesignPanel["cutouts"] {
  const cutout = {
    id: nextDesignId("cutout"),
    kind: "recorte_prateleira_canto" as const,
    yMm: 0,
    widthMm: layout.cornerNotchWidthMm,
    heightMm: layout.cornerNotchDepthMm,
    xMm:
      layout.cornerSide === "right"
        ? 0
        : Math.max(0, layout.shelfWidthMm - layout.cornerNotchWidthMm),
  };
  return [cutout];
}

/** Monta painéis estruturais do canto direito (perfil L). */
export function buildCornerRightIndustrialPanels(
  input: BuildCornerIndustrialPanelsInput
): { panels: DesignPanel[]; constraints: PanelConstraint[] } {
  const { boxId, layout, materialId } = input;
  const includeShelf = input.includeShelf !== false;
  const { espMm, backMm, innerH, profInterna, outer } = layout;

  const panels: DesignPanel[] = [
    makePanel(boxId, "cima", "cima", outer.widthMm, profInterna, espMm, materialId),
    makePanel(boxId, "fundo", "fundo", outer.widthMm, profInterna, espMm, materialId),
    makePanel(boxId, "lateral", "lateral-ld", profInterna, innerH, espMm, materialId),
    makePanel(
      boxId,
      "lateral",
      "lateral-interna",
      layout.shortLegDepthMm,
      innerH,
      CORNER_INTERNAL_LATERAL_MM,
      materialId,
      { x: layout.internalLatX, y: espMm, z: backMm }
    ),
    makePanel(
      boxId,
      "costa",
      "costa-a",
      layout.costaLegAWmm,
      innerH,
      backMm,
      materialId,
      { x: espMm, y: espMm, z: 0 }
    ),
    makePanel(
      boxId,
      "costa",
      "costa-b",
      layout.costaLegBWmm,
      innerH,
      backMm,
      materialId,
      { x: espMm + layout.costaLegAWmm, y: espMm, z: 0 }
    ),
    makePanel(
      boxId,
      "frente_fixa",
      "frente-fixa",
      layout.fixedFrontWidthMm,
      layout.fixedFrontHeightMm,
      espMm,
      materialId,
      { x: espMm, y: CORNER_FIXED_FRONT_OVERSIZE_MM / 2, z: outer.depthMm / 2 - espMm / 2 }
    ),
    makePanel(
      boxId,
      "frente",
      "porta",
      layout.doorWidthMm,
      layout.doorHeightMm,
      espMm,
      materialId,
      {
        x: outer.widthMm - espMm - layout.doorWidthMm - (resolveCornerDoorGapSettings().gapHorizontalMm ?? 0),
        y: espMm + (resolveCornerDoorGapSettings().gapVerticalMm ?? 0),
        z: outer.depthMm - espMm,
      }
    ),
  ];

  if (includeShelf) {
    panels.push({
      id: `${boxId}:prateleira`,
      tipo: "prateleira",
      widthMm: layout.shelfWidthMm,
      heightMm: layout.shelfDepthMm,
      thicknessMm: espMm,
      materialId,
      drillHoles: [],
      positionMm: { x: espMm, y: layout.shelfYMm, z: backMm },
      cutouts: shelfCutoutForCorner(layout),
    });
  }

  const cima = panels.find((p) => p.id.endsWith(":cima"))!;
  const fundo = panels.find((p) => p.id.endsWith(":fundo"))!;
  const lateralLd = panels.find((p) => p.id.endsWith(":lateral-ld"))!;
  const lateralInterna = panels.find((p) => p.id.endsWith(":lateral-interna"))!;

  const constraints: PanelConstraint[] = [
    { id: nextDesignId("constraint"), panelAId: cima.id, panelBId: lateralLd.id, tipo: "encaixe_cavilha" },
    { id: nextDesignId("constraint"), panelAId: cima.id, panelBId: lateralInterna.id, tipo: "encaixe_cavilha" },
    { id: nextDesignId("constraint"), panelAId: fundo.id, panelBId: lateralLd.id, tipo: "encaixe_cavilha" },
    { id: nextDesignId("constraint"), panelAId: fundo.id, panelBId: lateralInterna.id, tipo: "encaixe_cavilha" },
  ];

  return { panels, constraints };
}

/** Monta painéis estruturais do canto esquerda (espelho do direita). */
export function buildCornerLeftIndustrialPanels(
  input: BuildCornerIndustrialPanelsInput
): { panels: DesignPanel[]; constraints: PanelConstraint[] } {
  const { boxId, layout, materialId } = input;
  const includeShelf = input.includeShelf !== false;
  const { espMm, backMm, innerH, profInterna, outer } = layout;
  const gaps = resolveCornerDoorGapSettings();
  const gapH = gaps.gapHorizontalMm ?? 0;
  const gapV = gaps.gapVerticalMm ?? 0;

  const costaBX = espMm;
  const costaAX = espMm + layout.costaLegBWmm;

  const panels: DesignPanel[] = [
    makePanel(boxId, "cima", "cima", outer.widthMm, profInterna, espMm, materialId),
    makePanel(boxId, "fundo", "fundo", outer.widthMm, profInterna, espMm, materialId),
    makePanel(boxId, "lateral", "lateral-le", profInterna, innerH, espMm, materialId),
    makePanel(
      boxId,
      "lateral",
      "lateral-interna",
      layout.shortLegDepthMm,
      innerH,
      CORNER_INTERNAL_LATERAL_MM,
      materialId,
      { x: layout.internalLatX, y: espMm, z: backMm }
    ),
    makePanel(
      boxId,
      "costa",
      "costa-b",
      layout.costaLegBWmm,
      innerH,
      backMm,
      materialId,
      { x: costaBX, y: espMm, z: 0 }
    ),
    makePanel(
      boxId,
      "costa",
      "costa-a",
      layout.costaLegAWmm,
      innerH,
      backMm,
      materialId,
      { x: costaAX, y: espMm, z: 0 }
    ),
    makePanel(
      boxId,
      "frente_fixa",
      "frente-fixa",
      layout.fixedFrontWidthMm,
      layout.fixedFrontHeightMm,
      espMm,
      materialId,
      {
        x: outer.widthMm - espMm - layout.fixedFrontWidthMm,
        y: CORNER_FIXED_FRONT_OVERSIZE_MM / 2,
        z: outer.depthMm / 2 - espMm / 2,
      }
    ),
    makePanel(
      boxId,
      "frente",
      "porta",
      layout.doorWidthMm,
      layout.doorHeightMm,
      espMm,
      materialId,
      {
        x: espMm + gapH,
        y: espMm + gapV,
        z: outer.depthMm - espMm,
      }
    ),
  ];

  if (includeShelf) {
    panels.push({
      id: `${boxId}:prateleira`,
      tipo: "prateleira",
      widthMm: layout.shelfWidthMm,
      heightMm: layout.shelfDepthMm,
      thicknessMm: espMm,
      materialId,
      drillHoles: [],
      positionMm: { x: espMm, y: layout.shelfYMm, z: backMm },
      cutouts: shelfCutoutForCorner(layout),
    });
  }

  const cima = panels.find((p) => p.id.endsWith(":cima"))!;
  const fundo = panels.find((p) => p.id.endsWith(":fundo"))!;
  const lateralLe = panels.find((p) => p.id.endsWith(":lateral-le"))!;
  const lateralInterna = panels.find((p) => p.id.endsWith(":lateral-interna"))!;

  const constraints: PanelConstraint[] = [
    { id: nextDesignId("constraint"), panelAId: cima.id, panelBId: lateralLe.id, tipo: "encaixe_cavilha" },
    { id: nextDesignId("constraint"), panelAId: cima.id, panelBId: lateralInterna.id, tipo: "encaixe_cavilha" },
    { id: nextDesignId("constraint"), panelAId: fundo.id, panelBId: lateralLe.id, tipo: "encaixe_cavilha" },
    { id: nextDesignId("constraint"), panelAId: fundo.id, panelBId: lateralInterna.id, tipo: "encaixe_cavilha" },
  ];

  return { panels, constraints };
}

export function createCornerIndustrialDesignBox(
  boxId: string,
  nome: string,
  outer: CornerIndustrialOuter,
  panels: DesignPanel[],
  constraints: PanelConstraint[],
  materialId: string
): IndustrialDesignBox {
  return {
    id: boxId,
    nome,
    outerWidthMm: outer.widthMm,
    outerHeightMm: outer.heightMm,
    outerDepthMm: outer.depthMm,
    espessuraMm: CORNER_INDUSTRIAL_ESP_MM,
    materialId,
    panels,
    constraints,
    designWorkspace: false,
  };
}
