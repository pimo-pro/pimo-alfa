import type { RulesConfig } from "../rules/rulesConfig";
import type { PanelDrillHole } from "../types";
import { getDivSepRules } from "./cavilhaRules";
import { resolveSeparadorBottomY } from "./coupling";
import {
  getDivSepInternalDims,
  resolveDivisorCenterX,
  resolveDivisorDimensions,
} from "./dimensions";
import type { DivisorItem, DivSepBoxLike } from "./types";

const SHELF_DIV_CLEARANCE_MM = 1;
const SHELF_GRID_STEP_MM = 32;

export type VerticalCompartment = {
  yMin: number;
  yMax: number;
};

function roundHoleMm(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Compartimentos verticais delimitados pelos SEP (mm absolutos na caixa). */
export function resolveVerticalCompartments(box: DivSepBoxLike): VerticalCompartment[] {
  const internal = getDivSepInternalDims(box);
  const yBottom = internal.espessura;
  const yTop = internal.espessura + internal.alturaInterna;
  const separadores = box.separadores ?? [];
  if (separadores.length === 0) {
    return [{ yMin: yBottom, yMax: yTop }];
  }

  const boundaries = [yBottom, ...separadores.map((s) => resolveSeparadorBottomY(box, s)), yTop]
    .map((y) => Math.round(y))
    .sort((a, b) => a - b);

  const zones: VerticalCompartment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const yMin = boundaries[i]!;
    const yMax = boundaries[i + 1]!;
    if (yMax - yMin > 80) zones.push({ yMin, yMax });
  }
  return zones.length > 0 ? zones : [{ yMin: yBottom, yMax: yTop }];
}

function calcShelfGridYs(
  yMin: number,
  yMax: number,
  rules: RulesConfig
): number[] {
  const cfg = rules?.furos?.tecnicos?.prateleira;
  if (!cfg?.enabled) return [];
  const margemTopo = cfg.margemTopo ?? 200;
  const margemBase = cfg.margemBase ?? 200;

  const zoneMin = yMin + margemBase;
  const zoneMax = yMax - margemTopo;
  if (zoneMax < zoneMin) return [];

  const ys: number[] = [];
  for (let y = zoneMin; y <= zoneMax + 0.001; y += SHELF_GRID_STEP_MM) {
    ys.push(roundHoleMm(y));
  }
  return ys;
}

function absoluteYToLateralPanelY(box: DivSepBoxLike, absoluteY: number): number {
  const totalHeight = Number(box.dimensoes.altura) || 0;
  return roundHoleMm(totalHeight - absoluteY);
}

function absoluteYToDivisorPanelY(divBottomY: number, divHeightMm: number, absoluteY: number): number {
  const divTopY = divBottomY + divHeightMm;
  return roundHoleMm(divTopY - absoluteY);
}

function dedupePanelDrillHoles(holes: PanelDrillHole[]): PanelDrillHole[] {
  const deduped = new Map<string, PanelDrillHole>();
  for (const hole of holes) {
    const key = [
      roundHoleMm(hole.x),
      roundHoleMm(hole.y),
      roundHoleMm(hole.diameter),
      roundHoleMm(hole.depth),
      hole.holeType ?? "",
      hole.face ?? "",
      hole.topDrillable === false ? "0" : "1",
    ].join("|");
    if (!deduped.has(key)) deduped.set(key, hole);
  }
  return [...deduped.values()];
}

export type DivShelfDrillingResult = {
  lateral_esquerda: PanelDrillHole[];
  lateral_direita: PanelDrillHole[];
  divisorio: Map<string, PanelDrillHole[]>;
};

export function buildDivShelfDrilling(
  box: DivSepBoxLike,
  panelIds: { divisores?: string[] } | undefined,
  rules: RulesConfig
): DivShelfDrillingResult | null {
  if (!getDivSepRules().enableShelfHoles) return null;

  const prateleiras = Math.max(0, Math.floor(box.prateleiras ?? 0));
  if (prateleiras <= 0) return null;
  const divisores = box.divisores ?? [];
  if (divisores.length === 0) return null;

  const cfg = rules?.furos?.tecnicos?.prateleira;
  if (!cfg?.enabled) return null;

  const internal = getDivSepInternalDims(box);
  const diametro = cfg.diametro ?? 5;
  const profundidade = cfg.profundidade ?? 13;
  const margemFrente = cfg.margemFrente ?? cfg.distanciaDaBorda ?? 60;
  const margemFundo = cfg.margemFundo ?? cfg.distanciaDaBorda ?? 60;
  const profundidadeLateral = internal.profundidadeInterna;
  const compartments = resolveVerticalCompartments(box);

  const lateral_esquerda: PanelDrillHole[] = [];
  const lateral_direita: PanelDrillHole[] = [];
  const divisorio = new Map<string, PanelDrillHole[]>();

  divisores.forEach((div, index) => {
    const lado = div.prateleiraLado ?? "direita";
    const panelId = panelIds?.divisores?.[index] ?? div.id;
    const divHoles: PanelDrillHole[] = [];
    const divDims = resolveDivisorDimensions(box, div);
    const divBottomY = internal.espessura;

    const lateralTipo = lado === "esquerda" ? "lateral_esquerda" : "lateral_direita";
    const lateralOut = lateralTipo === "lateral_esquerda" ? lateral_esquerda : lateral_direita;

    const xFrente = lateralTipo === "lateral_esquerda" ? profundidadeLateral - margemFrente : margemFrente;
    const xFundo = lateralTipo === "lateral_esquerda" ? margemFundo : profundidadeLateral - margemFundo;

    const divXFrente = margemFrente;
    const divXFundo = divDims.profundidadeMm - margemFundo;

    for (const zone of compartments) {
      const absoluteYs = calcShelfGridYs(zone.yMin, zone.yMax, rules);
      for (const absoluteY of absoluteYs) {
        const lateralY = absoluteYToLateralPanelY(box, absoluteY);
        const divisorY = absoluteYToDivisorPanelY(divBottomY, divDims.alturaMm, absoluteY);
        lateralOut.push({
          x: xFrente,
          y: lateralY,
          diameter: diametro,
          depth: profundidade,
          holeType: "prateleira",
          face: "B",
          topDrillable: true,
        });
        lateralOut.push({
          x: xFundo,
          y: lateralY,
          diameter: diametro,
          depth: profundidade,
          holeType: "prateleira",
          face: "B",
          topDrillable: true,
        });
        divHoles.push({
          x: divXFrente,
          y: divisorY,
          diameter: diametro,
          depth: profundidade,
          holeType: "prateleira",
          face: "B",
          topDrillable: true,
        });
        divHoles.push({
          x: divXFundo,
          y: divisorY,
          diameter: diametro,
          depth: profundidade,
          holeType: "prateleira",
          face: "B",
          topDrillable: true,
        });
      }
    }

    if (divHoles.length) divisorio.set(panelId, dedupePanelDrillHoles(divHoles));
  });

  if (!lateral_esquerda.length && !lateral_direita.length && divisorio.size === 0) return null;
  return {
    lateral_esquerda: dedupePanelDrillHoles(lateral_esquerda),
    lateral_direita: dedupePanelDrillHoles(lateral_direita),
    divisorio,
  };
}

/** Largura da prateleira no compartimento entre lateral e DIV (mm). */
export function resolveShelfWidthForDivSide(
  box: DivSepBoxLike,
  div: DivisorItem
): number {
  const internal = getDivSepInternalDims(box);
  const divCenterX = resolveDivisorCenterX(box, div);
  const divDims = resolveDivisorDimensions(box, div);
  const lado = div.prateleiraLado ?? "direita";
  const lateralInner = internal.espessura;
  const lateralOuter = internal.espessura + internal.larguraInterna;

  if (lado === "esquerda") {
    return Math.max(1, divCenterX - divDims.larguraMm / 2 - lateralInner - SHELF_DIV_CLEARANCE_MM);
  }
  return Math.max(1, lateralOuter - (divCenterX + divDims.larguraMm / 2) - SHELF_DIV_CLEARANCE_MM);
}

export function boxUsesDivShelfMode(box: DivSepBoxLike): boolean {
  return Math.max(0, Math.floor(box.prateleiras ?? 0)) > 0 && (box.divisores?.length ?? 0) > 0;
}
