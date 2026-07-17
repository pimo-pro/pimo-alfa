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
/** Altura mínima (mm) da zona acima do SEP para eventual activação futura de prateleiras. */
export const MIN_ABOVE_SEP_SHELF_HEIGHT_MM = 500;

export type VerticalCompartment = {
  yMin: number;
  yMax: number;
  /** Zona utilizável para prateleiras curtas (LAT+DIV). Acima do SEP superior = false por omissão. */
  shelfEnabled: boolean;
};

const MIN_SHELF_COMPARTMENT_HEIGHT_MM = 80;

function compartmentHasDivSupport(
  zone: VerticalCompartment,
  divBottomY: number,
  divTopY: number
): boolean {
  if (!zone.shelfEnabled) return false;
  const effectiveYMin = Math.max(zone.yMin, divBottomY);
  const effectiveYMax = Math.min(zone.yMax, divTopY);
  return effectiveYMax - effectiveYMin > MIN_SHELF_COMPARTMENT_HEIGHT_MM;
}

function resolveEffectiveShelfBounds(
  zone: VerticalCompartment,
  divBottomY: number,
  divTopY: number
): { yMin: number; yMax: number } | null {
  if (!compartmentHasDivSupport(zone, divBottomY, divTopY)) return null;
  return {
    yMin: Math.max(zone.yMin, divBottomY),
    yMax: Math.min(zone.yMax, divTopY),
  };
}

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
    return [{ yMin: yBottom, yMax: yTop, shelfEnabled: true }];
  }

  const boundaries = [yBottom, ...separadores.map((s) => resolveSeparadorBottomY(box, s)), yTop]
    .map((y) => Math.round(y))
    .sort((a, b) => a - b);

  const zones: VerticalCompartment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const yMin = boundaries[i]!;
    const yMax = boundaries[i + 1]!;
    if (yMax - yMin <= MIN_SHELF_COMPARTMENT_HEIGHT_MM) continue;
    const isTopZoneAboveSeparador = i === boundaries.length - 2;
    zones.push({
      yMin,
      yMax,
      // Acima do SEP: desactivado (prateleiras só no compartimento LAT+DIV+SEP).
      // Altura < 500 mm acima do SEP nunca activa prateleiras industriais.
      shelfEnabled: !isTopZoneAboveSeparador,
    });
  }
  return zones.length > 0 ? zones : [{ yMin: yBottom, yMax: yTop, shelfEnabled: true }];
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
  const espessura = Math.max(0, Number(box.espessura) || 0);
  // Convenção industrial (cutlist / TCN / SEP na LAT): Y desde a base do painel.
  // Laterais inset (entre CIMA e FUNDO): base do painel = espessura (topo do FUNDO).
  // Antes: alturaCaixa − absoluteY (Y desde o topo) → CNC lia como base → furos demasiado altos / sobre SEP.
  return roundHoleMm(absoluteY - espessura);
}

function absoluteYToDivisorPanelY(divBottomY: number, _divHeightMm: number, absoluteY: number): number {
  // Mesma convenção industrial que a LAT: Y desde a base do painel.
  // LAT e DIV partilham a base (topo do FUNDO = espessura) → mesmo absoluteY ⇒ mesmo Y local.
  // Antes: divTop − absoluteY (desde o topo) → na chapa os Y não coincidiam com a LAT.
  void _divHeightMm;
  return roundHoleMm(absoluteY - divBottomY);
}

/** ID do painel DIV alinhado com `getArrayPanelId` em boxManufacturing. */
function resolveDivisorShelfPanelId(
  panelIds: { divisores?: string[] } | undefined,
  index: number
): string {
  const fromBox = panelIds?.divisores?.[index];
  if (typeof fromBox === "string" && fromBox.length > 0) return fromBox;
  return `divisorio-${index + 1}`;
}

/**
 * Face do DIV virada para o compartimento das prateleiras.
 * direita = face A (lado direito do DIV); esquerda = face B (lado esquerdo).
 */
function resolveDivisorShelfFace(lado: "esquerda" | "direita"): "A" | "B" {
  return lado === "direita" ? "A" : "B";
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
    const panelId = resolveDivisorShelfPanelId(panelIds, index);
    const divFace = resolveDivisorShelfFace(lado);
    const divHoles: PanelDrillHole[] = [];
    const divDims = resolveDivisorDimensions(box, div);
    const divBottomY = internal.espessura;
    const divTopY = divBottomY + divDims.alturaMm;

    const lateralTipo = lado === "esquerda" ? "lateral_esquerda" : "lateral_direita";
    const lateralOut = lateralTipo === "lateral_esquerda" ? lateral_esquerda : lateral_direita;

    const xFrente = lateralTipo === "lateral_esquerda" ? profundidadeLateral - margemFrente : margemFrente;
    const xFundo = lateralTipo === "lateral_esquerda" ? margemFundo : profundidadeLateral - margemFundo;

    const divXFrente = margemFrente;
    const divXFundo = divDims.profundidadeMm - margemFundo;

    for (const zone of compartments) {
      // Clamp só no Y útil (LAT+DIV); nunca desactiva o lado do DIV num compartimento válido.
      const shelfBounds = resolveEffectiveShelfBounds(zone, divBottomY, divTopY);
      if (!shelfBounds) continue;
      const absoluteYs = calcShelfGridYs(shelfBounds.yMin, shelfBounds.yMax, rules);
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
        // Mesma grelha absoluta Y → Y local do DIV; face = lado das prateleiras.
        divHoles.push({
          x: divXFrente,
          y: divisorY,
          diameter: diametro,
          depth: profundidade,
          holeType: "prateleira",
          face: divFace,
          topDrillable: true,
        });
        divHoles.push({
          x: divXFundo,
          y: divisorY,
          diameter: diametro,
          depth: profundidade,
          holeType: "prateleira",
          face: divFace,
          topDrillable: true,
        });
      }
    }

    if (divHoles.length) {
      const deduped = dedupePanelDrillHoles(divHoles);
      divisorio.set(panelId, deduped);
      // Alias para caixas que ainda referenciam o id do item DIV.
      if (div.id && div.id !== panelId) divisorio.set(div.id, deduped);
    }
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

/**
 * Zonas industriais onde cada DIV pode receber prateleiras (shelfEnabled + apoio LAT+DIV).
 * Nunca inclui a zona acima do SEP.
 */
export function resolveDivShelfPlacementZones(
  box: DivSepBoxLike,
  div: DivisorItem
): VerticalCompartment[] {
  const internal = getDivSepInternalDims(box);
  const divDims = resolveDivisorDimensions(box, div);
  const divBottomY = internal.espessura;
  const divTopY = divBottomY + divDims.alturaMm;

  const sepBottoms = (box.separadores ?? [])
    .map((s) => resolveSeparadorBottomY(box, s))
    .filter((y) => Number.isFinite(y) && y > 0);
  const highestSepBottom = sepBottoms.length > 0 ? Math.max(...sepBottoms) : null;

  return resolveVerticalCompartments(box).filter((zone) => {
    if (!zone.shelfEnabled) return false;
    // Cinto de segurança: qualquer zona que comece no SEP ou acima fica excluída.
    if (highestSepBottom != null && zone.yMin >= highestSepBottom - 0.5) return false;
    // Zona acima do SEP superior nunca é válida (mesmo se shelfEnabled falhar).
    if (highestSepBottom != null && zone.yMax > highestSepBottom + 0.5 && zone.yMin >= highestSepBottom - 0.5) {
      return false;
    }
    return resolveEffectiveShelfBounds(zone, divBottomY, divTopY) != null;
  });
}

/** Compartimento principal LAT+DIV+SEP (mais baixo entre as zonas válidas). */
export function resolvePrimaryDivShelfPlacementZone(
  box: DivSepBoxLike,
  div: DivisorItem
): VerticalCompartment | null {
  const zones = resolveDivShelfPlacementZones(box, div);
  if (zones.length === 0) return null;
  return zones.reduce((best, zone) => (zone.yMin < best.yMin ? zone : best));
}

/**
 * Centros Y absolutos (mm, origem = base da caixa) das N prateleiras industriais.
 * Exactamente N, todos dentro da zona LAT+DIV+SEP — nenhum acima do SEP.
 */
export function resolveDivShelfAbsoluteCenterYs(
  box: DivSepBoxLike,
  div: DivisorItem,
  count: number
): number[] {
  const n = Math.max(0, Math.floor(count));
  const zone = resolvePrimaryDivShelfPlacementZone(box, div);
  if (!zone || n < 1) return [];
  const spacing = (zone.yMax - zone.yMin) / (n + 1);
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    ys.push(roundHoleMm(zone.yMin + spacing * (i + 1)));
  }
  return ys;
}

/**
 * Número exacto de painéis prateleira no modo DIV.
 * Exactamente N por DIV com pelo menos um compartimento válido (LAT+DIV+SEP) —
 * nunca N × zonas (evita duplicar acima do SEP).
 */
export function countDivShelfPanels(box: DivSepBoxLike): number {
  const n = Math.max(0, Math.floor(box.prateleiras ?? 0));
  if (n <= 0) return 0;
  const divisores = box.divisores ?? [];
  if (divisores.length === 0) return n;
  let total = 0;
  for (const div of divisores) {
    if (resolvePrimaryDivShelfPlacementZone(box, div) != null) total += n;
  }
  return total;
}
