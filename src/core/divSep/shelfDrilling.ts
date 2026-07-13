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

export type VerticalCompartment = {
  yMin: number;
  yMax: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
  const minFuros = cfg.minFurosPorColuna ?? 6;
  const maxFuros = cfg.maxFurosPorColuna ?? 40;

  const zoneMin = yMin + margemBase;
  const zoneMax = yMax - margemTopo;
  const zonaUtil = Math.max(0, zoneMax - zoneMin);
  if (zonaUtil <= 0) return [];

  let numFuros = clamp(Math.ceil(zonaUtil / 32), minFuros, maxFuros);
  const step = numFuros > 1 ? zonaUtil / (numFuros - 1) : zonaUtil;
  const stepClamped = clamp(step, 30, 50);
  if (numFuros > 1 && stepClamped !== step) {
    numFuros = clamp(Math.floor(zonaUtil / stepClamped) + 1, minFuros, maxFuros);
  }
  const finalStep = numFuros > 1 ? zonaUtil / (numFuros - 1) : zonaUtil;
  const ys: number[] = [];
  for (let i = 0; i < numFuros; i++) {
    ys.push(zoneMin + (numFuros > 1 ? i * finalStep : zonaUtil / 2));
  }
  return ys;
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

    const lateralTipo = lado === "esquerda" ? "lateral_esquerda" : "lateral_direita";
    const lateralOut = lateralTipo === "lateral_esquerda" ? lateral_esquerda : lateral_direita;

    const xFrente = lateralTipo === "lateral_esquerda" ? profundidadeLateral - margemFrente : margemFrente;
    const xFundo = lateralTipo === "lateral_esquerda" ? margemFundo : profundidadeLateral - margemFundo;

    const divXFrente = margemFrente;
    const divXFundo = divDims.profundidadeMm - margemFundo;

    for (const zone of compartments) {
      const ys = calcShelfGridYs(zone.yMin, zone.yMax, rules);
      for (const y of ys) {
        lateralOut.push({
          x: xFrente,
          y,
          diameter: diametro,
          depth: profundidade,
          holeType: "prateleira",
          face: "B",
          topDrillable: true,
        });
        lateralOut.push({
          x: xFundo,
          y,
          diameter: diametro,
          depth: profundidade,
          holeType: "prateleira",
          face: "B",
          topDrillable: true,
        });
        divHoles.push({
          x: divXFrente,
          y,
          diameter: diametro,
          depth: profundidade,
          holeType: "prateleira",
          face: "B",
          topDrillable: true,
        });
        divHoles.push({
          x: divXFundo,
          y,
          diameter: diametro,
          depth: profundidade,
          holeType: "prateleira",
          face: "B",
          topDrillable: true,
        });
      }
    }

    if (divHoles.length) divisorio.set(panelId, divHoles);
  });

  if (!lateral_esquerda.length && !lateral_direita.length && divisorio.size === 0) return null;
  return { lateral_esquerda, lateral_direita, divisorio };
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
