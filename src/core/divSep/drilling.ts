import type { PanelDrillHole } from "../types";
import type { DivSepRules } from "../../admin/rules/divSepRules/rulesDefaults";
import { CORNER_FF_EDGE_DOWEL_DEPTH_MM } from "../cornerCabinet/cornerFixedFrontDowels";
import {
  calcularPosicoesCavilha,
  getCavilhaDepthMm,
  getCavilhaDiameterMm,
  getDivSepRules,
  getParafusoDistanceFromCavilhaMm,
} from "./cavilhaRules";
import { findSeparadorById } from "./coupling";
import {
  getDivSepInternalDims,
  resolveDivisorCenterX,
  resolveDivisorDimensions,
  resolveSeparadorCenterY,
  resolveSeparadorDimensions,
} from "./dimensions";
import type { DivisorItem, DivSepBoxLike, SeparadorItem } from "./types";

type HoleBucket = {
  separador: Map<string, PanelDrillHole[]>;
  divisorio: Map<string, PanelDrillHole[]>;
  lateral_esquerda: PanelDrillHole[];
  lateral_direita: PanelDrillHole[];
  cima: PanelDrillHole[];
  fundo: PanelDrillHole[];
};

export type DepthHolePositions = {
  cavilha: number[];
  parafuso: number[];
};

type TopBottomPanels = {
  includeCima: boolean;
  includeFundo: boolean;
};

function createHoleBucket(): HoleBucket {
  return {
    separador: new Map(),
    divisorio: new Map(),
    lateral_esquerda: [],
    lateral_direita: [],
    cima: [],
    fundo: [],
  };
}

function pushHole(
  out: PanelDrillHole[],
  x: number,
  y: number,
  diameter: number,
  depth: number,
  holeType: PanelDrillHole["holeType"],
  face: "A" | "B" = "B",
  topDrillable?: boolean
): void {
  out.push({ x, y, diameter, depth, holeType, face, topDrillable });
}

/** Posições ao longo da profundidade: cavilha 60/60 mm, parafuso 90/90 mm. */
export function calcDepthHolePositions(comprimento: number, rules?: DivSepRules): DepthHolePositions {
  const cavilha = calcularPosicoesCavilha(comprimento, rules);
  const dist = getParafusoDistanceFromCavilhaMm(rules ?? getDivSepRules());
  const parafuso = cavilha.map((pos) => {
    if (pos <= comprimento / 2) return pos + dist;
    return pos - dist;
  });
  return { cavilha, parafuso };
}

function mapDivCenterXToSepLocalX(box: DivSepBoxLike, sep: SeparadorItem, divCenterX: number): number {
  const internal = getDivSepInternalDims(box);
  const sepDims = resolveSeparadorDimensions(box, sep);
  const sepLeftX = internal.espessura + (internal.larguraInterna - sepDims.larguraMm) / 2;
  return divCenterX - sepLeftX;
}

function drillSeparadorEdgeHoles(
  sepHoles: PanelDrillHole[],
  panelLarguraMm: number,
  profundidadeMm: number,
  rules: DivSepRules
): void {
  const cavilhaD = getCavilhaDiameterMm(rules);
  const depthPos = calcDepthHolePositions(profundidadeMm, rules);
  for (const yPos of depthPos.cavilha) {
    pushHole(sepHoles, 0, yPos, cavilhaD, CORNER_FF_EDGE_DOWEL_DEPTH_MM, "cavilha", "B", false);
    pushHole(sepHoles, panelLarguraMm, yPos, cavilhaD, CORNER_FF_EDGE_DOWEL_DEPTH_MM, "cavilha", "B", false);
  }
}

function drillLateralAtSepHeight(
  bucket: HoleBucket,
  profundidadeMm: number,
  centerY: number,
  receptorThickness: number,
  rules: DivSepRules
): void {
  const cavilhaD = getCavilhaDiameterMm(rules);
  const faceCavilhaDepth = getCavilhaDepthMm(rules);
  const depthPos = calcDepthHolePositions(profundidadeMm, rules);
  for (const latX of depthPos.cavilha) {
    pushHole(bucket.lateral_esquerda, latX, centerY, cavilhaD, faceCavilhaDepth, "cavilha", "B", true);
    pushHole(bucket.lateral_direita, latX, centerY, cavilhaD, faceCavilhaDepth, "cavilha", "B", true);
  }
  for (const latX of depthPos.parafuso) {
    pushHole(bucket.lateral_esquerda, latX, centerY, 5, receptorThickness, "parafuso", "B", true);
    pushHole(bucket.lateral_direita, latX, centerY, 5, receptorThickness, "parafuso", "B", true);
  }
}

function drillSeparadorBottomFaceForDiv(
  sepHoles: PanelDrillHole[],
  sepLocalX: number,
  profundidadeMm: number,
  rules: DivSepRules
): void {
  const cavilhaD = getCavilhaDiameterMm(rules);
  const depthPos = calcDepthHolePositions(profundidadeMm, rules);
  for (const yPos of depthPos.cavilha) {
    pushHole(sepHoles, sepLocalX, yPos, cavilhaD, CORNER_FF_EDGE_DOWEL_DEPTH_MM, "cavilha", "B", true);
  }
}

function drillSeparador(
  bucket: HoleBucket,
  box: DivSepBoxLike,
  item: SeparadorItem,
  panelId: string,
  rules: DivSepRules,
  linkedDivs: DivisorItem[]
): void {
  const internal = getDivSepInternalDims(box);
  const dims = resolveSeparadorDimensions(box, item);
  const centerY = resolveSeparadorCenterY(box, item);
  const sepHoles: PanelDrillHole[] = [];
  const panelLarguraMm = item.larguraMm ?? dims.larguraMm;

  drillSeparadorEdgeHoles(sepHoles, panelLarguraMm, dims.profundidadeMm, rules);
  drillLateralAtSepHeight(bucket, dims.profundidadeMm, centerY, internal.espessura, rules);

  if (rules.enableDivSepCombinations) {
    for (const linkedDiv of linkedDivs) {
      const divCenterX = resolveDivisorCenterX(box, linkedDiv);
      const sepLocalX = mapDivCenterXToSepLocalX(box, item, divCenterX);
      if (sepLocalX >= 0 && sepLocalX <= panelLarguraMm) {
        drillSeparadorBottomFaceForDiv(sepHoles, sepLocalX, dims.profundidadeMm, rules);
      }
    }
  }

  bucket.separador.set(panelId, sepHoles);
}

function drillTopBottomForDiv(
  bucket: HoleBucket,
  box: DivSepBoxLike,
  item: DivisorItem,
  rules: DivSepRules,
  panels: TopBottomPanels
): void {
  const internal = getDivSepInternalDims(box);
  const dims = resolveDivisorDimensions(box, item);
  const centerX = resolveDivisorCenterX(box, item);
  const depthPos = calcDepthHolePositions(dims.profundidadeMm, rules);
  const cavilhaD = getCavilhaDiameterMm(rules);

  const targetPanels: PanelDrillHole[][] = [];
  if (panels.includeCima) targetPanels.push(bucket.cima);
  if (panels.includeFundo) targetPanels.push(bucket.fundo);

  for (const panelHoles of targetPanels) {
    for (const yPos of depthPos.cavilha) {
      pushHole(panelHoles, centerX, yPos, cavilhaD, CORNER_FF_EDGE_DOWEL_DEPTH_MM, "cavilha", "B", false);
    }
    for (const yPos of depthPos.parafuso) {
      pushHole(panelHoles, centerX, yPos, 5, internal.espessura, "parafuso", "B", false);
    }
  }
}

function resolveDivTopBottomPanels(item: DivisorItem, box: DivSepBoxLike, rules: DivSepRules): TopBottomPanels {
  const linked =
    rules.enableDivSepCombinations && Boolean(findSeparadorById(box, item.linkedSeparadorId));
  return {
    includeCima: !linked,
    includeFundo: true,
  };
}

function drillDivisor(
  bucket: HoleBucket,
  box: DivSepBoxLike,
  item: DivisorItem,
  rules: DivSepRules
): void {
  drillTopBottomForDiv(bucket, box, item, rules, resolveDivTopBottomPanels(item, box, rules));
}

export type DivSepDrillingResult = {
  getExtraHoles: (tipo: string, panelId?: string) => PanelDrillHole[];
  countFerragens: () => { cavilhas10: number; parafusos4x50: number };
};

function countHoleTypes(holes: PanelDrillHole[]): { cavilhas10: number; parafusos4x50: number } {
  let cavilhas10 = 0;
  let parafusos4x50 = 0;
  for (const h of holes) {
    if (h.holeType === "cavilha") cavilhas10 += 1;
    if (h.holeType === "parafuso") parafusos4x50 += 1;
  }
  return { cavilhas10, parafusos4x50 };
}

function buildSepToLinkedDivsMap(box: DivSepBoxLike, rules: DivSepRules): Map<string, DivisorItem[]> {
  const sepToLinkedDivs = new Map<string, DivisorItem[]>();
  if (!rules.enableDivSepCombinations) return sepToLinkedDivs;

  for (const div of box.divisores ?? []) {
    if (!div.linkedSeparadorId) continue;
    const existing = sepToLinkedDivs.get(div.linkedSeparadorId) ?? [];
    existing.push(div);
    sepToLinkedDivs.set(div.linkedSeparadorId, existing);
  }
  return sepToLinkedDivs;
}

export function buildDivSepDrilling(
  box: DivSepBoxLike,
  panelIds: { divisores?: string[]; separadores?: string[] } | undefined,
  rules?: DivSepRules
): DivSepDrillingResult {
  const cfg = rules ?? getDivSepRules();
  const bucket = createHoleBucket();

  const divisores = box.divisores ?? [];
  const separadores = box.separadores ?? [];
  const sepToLinkedDivs = buildSepToLinkedDivsMap(box, cfg);

  separadores.forEach((sep, i) => {
    const pid = panelIds?.separadores?.[i] ?? sep.id;
    const linkedDivs = sepToLinkedDivs.get(sep.id) ?? [];
    drillSeparador(bucket, box, sep, pid, cfg, linkedDivs);
  });

  divisores.forEach((div) => {
    drillDivisor(bucket, box, div, cfg);
  });

  const getExtraHoles = (tipo: string, panelId?: string): PanelDrillHole[] => {
    if (tipo === "separador" && panelId) return bucket.separador.get(panelId) ?? [];
    if (tipo === "divisorio" && panelId) return bucket.divisorio.get(panelId) ?? [];
    if (tipo === "lateral_esquerda") return bucket.lateral_esquerda;
    if (tipo === "lateral_direita") return bucket.lateral_direita;
    if (tipo === "cima") return bucket.cima;
    if (tipo === "fundo") return bucket.fundo;
    return [];
  };

  const countFerragens = (): { cavilhas10: number; parafusos4x50: number } => {
    const all: PanelDrillHole[] = [
      ...bucket.lateral_esquerda,
      ...bucket.lateral_direita,
      ...bucket.cima,
      ...bucket.fundo,
      ...Array.from(bucket.separador.values()).flat(),
      ...Array.from(bucket.divisorio.values()).flat(),
    ];
    return countHoleTypes(all);
  };

  return { getExtraHoles, countFerragens };
}

export function mergeDrillHoles(
  base: PanelDrillHole[] | undefined,
  extra: PanelDrillHole[]
): PanelDrillHole[] {
  if (!extra.length) return base ?? [];
  return [...(base ?? []), ...extra];
}
