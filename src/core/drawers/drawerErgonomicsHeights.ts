/**
 * Motor de alturas ergonómicas para gavetas (DIN / NKBA / zonas de cozinha).
 */

import { DRAWER_VERTICAL_GAP_MM } from "./drawerGeometryConstants";
import type { DrawerHeightMode } from "./drawerHeightModeTypes";

export const ERGONOMIC_MIN_DRAWER_HEIGHT_MM = 80;
export const ERGONOMIC_MAX_DRAWER_HEIGHT_MM = 350;

/** Zona de alcance confortável (mm acima do piso) — referência europeia. */
export const COMFORT_REACH_MIN_MM = 900;
export const COMFORT_REACH_MAX_MM = 1200;

export type ErgonomicHeightRules = {
  baseCabinetHeightMm?: number;
  drawerClearanceMm?: number;
};

export type KitchenZoneProfileId = "standard_eu" | "nkba_compact";

/** Perfil de zonas de cozinha (topo pequeno → base XL). */
export type KitchenZoneProfile = {
  id?: KitchenZoneProfileId;
  /** Fração da altura útil por zona [top-small, upper-mid, lower-mid, bottom-XL]. */
  zoneShares?: [number, number, number, number];
  /** Pesos opcionais por gaveta (topo→base); sobrepõe zoneShares se definido. */
  drawerWeights?: number[];
};

export const DEFAULT_KITCHEN_ZONE_PROFILE: KitchenZoneProfile = {
  id: "standard_eu",
  zoneShares: [0.14, 0.22, 0.3, 0.34],
};

export const NKBA_COMPACT_KITCHEN_ZONE_PROFILE: KitchenZoneProfile = {
  id: "nkba_compact",
  zoneShares: [0.16, 0.24, 0.28, 0.32],
};

export type ErgonomicDrawerHeightsInput = {
  drawerCount: number;
  usableHeightMm: number;
  mode: Extract<DrawerHeightMode, "ergonomic" | "kitchen_zones" | "auto">;
  minHeightMm?: number;
  maxHeightMm?: number;
  gapMm?: number;
  ergonomicsRules?: ErgonomicHeightRules;
  kitchenZoneProfile?: KitchenZoneProfile;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Pesos DIN-inspired — gavetas centrais maiores (zona 900–1200 mm). */
const ERGONOMIC_WEIGHTS_BY_COUNT: Record<number, number[]> = {
  1: [1],
  2: [0.38, 0.62],
  3: [0.17, 0.33, 0.5],
  4: [0.13, 0.21, 0.3, 0.36],
  5: [0.11, 0.17, 0.22, 0.25, 0.25],
};

function expandWeightsForCount(template: number[], count: number): number[] {
  if (count <= 0) return [];
  if (count === template.length) return [...template];
  if (count === 1) return [1];
  if (template.length === 0) return Array.from({ length: count }, () => 1 / count);

  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0 : index / (count - 1);
    const srcIndex = t * (template.length - 1);
    const lo = Math.floor(srcIndex);
    const hi = Math.min(template.length - 1, lo + 1);
    const frac = srcIndex - lo;
    return template[lo]! * (1 - frac) + template[hi]! * frac;
  });
}

function zoneIndexForDrawer(index: number, count: number): 0 | 1 | 2 | 3 {
  if (count <= 1) return 2;
  if (count === 2) return index === 0 ? 0 : 3;
  if (count === 3) return ([0, 1, 3] as const)[index] ?? 2;
  if (count === 4) return index as 0 | 1 | 2 | 3;
  const t = index / (count - 1);
  if (t <= 0.2) return 0;
  if (t <= 0.45) return 1;
  if (t <= 0.72) return 2;
  return 3;
}

function buildKitchenZoneWeights(count: number, profile: KitchenZoneProfile): number[] {
  if (profile.drawerWeights && profile.drawerWeights.length === count) {
    return [...profile.drawerWeights];
  }

  const shares = profile.zoneShares ?? DEFAULT_KITCHEN_ZONE_PROFILE.zoneShares!;
  const zoneCounts = [0, 0, 0, 0];
  const zoneForDrawer: number[] = [];

  for (let i = 0; i < count; i++) {
    const z = zoneIndexForDrawer(i, count);
    zoneForDrawer.push(z);
    zoneCounts[z]! += 1;
  }

  return zoneForDrawer.map((z) => {
    const drawersInZone = Math.max(1, zoneCounts[z]!);
    return shares[z]! / drawersInZone;
  });
}

function normalizeWeights(weights: number[]): number[] {
  const sum = weights.reduce((a, w) => a + w, 0);
  if (sum <= 0) return weights.map(() => 1 / weights.length);
  return weights.map((w) => w / sum);
}

function applyCabinetHeightBias(weights: number[], baseCabinetHeightMm?: number): number[] {
  if (!baseCabinetHeightMm || !Number.isFinite(baseCabinetHeightMm)) return weights;
  const ref = 720;
  const delta = clamp((baseCabinetHeightMm - ref) / ref, -0.15, 0.15);
  return weights.map((w, i) => {
    const isBottom = i === weights.length - 1;
    const isTop = i === 0;
    if (isBottom) return w * (1 + delta * 0.35);
    if (isTop) return w * (1 - delta * 0.15);
    return w * (1 + delta * 0.1);
  });
}

function resolveRawWeights(input: ErgonomicDrawerHeightsInput): number[] {
  const { drawerCount, mode, ergonomicsRules, kitchenZoneProfile } = input;
  const baseTemplate = ERGONOMIC_WEIGHTS_BY_COUNT[Math.min(5, Math.max(1, drawerCount))] ?? ERGONOMIC_WEIGHTS_BY_COUNT[5]!;
  const ergonomic = normalizeWeights(
    applyCabinetHeightBias(expandWeightsForCount(baseTemplate, drawerCount), ergonomicsRules?.baseCabinetHeightMm)
  );
  const kitchen = normalizeWeights(
    buildKitchenZoneWeights(drawerCount, kitchenZoneProfile ?? DEFAULT_KITCHEN_ZONE_PROFILE)
  );

  if (mode === "ergonomic") return ergonomic;
  if (mode === "kitchen_zones") return kitchen;

  return normalizeWeights(
    ergonomic.map((w, i) => w * 0.55 + (kitchen[i] ?? w) * 0.45)
  );
}

function clampAndFitHeights(
  rawHeights: number[],
  distributable: number,
  minHeight: number,
  maxHeight: number
): number[] {
  if (rawHeights.length === 0) return [];

  let heights = rawHeights.map((h) => h * distributable);
  heights = heights.map((h) => clamp(h, minHeight, maxHeight));

  const boostBottom = () => {
    if (heights.length === 0) return;
    const last = heights.length - 1;
    if (heights[last]! < minHeight) {
      heights[last] = minHeight;
    }
  };
  boostBottom();

  for (let pass = 0; pass < 8; pass++) {
    const sum = heights.reduce((a, h) => a + h, 0);
    const diff = distributable - sum;
    if (Math.abs(diff) < 0.5) break;

    const adjustable = heights.map((h, i) => ({
      i,
      roomUp: maxHeight - h,
      roomDown: h - minHeight,
      isBottom: i === heights.length - 1,
    }));

    if (diff > 0) {
      const order = adjustable
        .filter((a) => a.roomUp > 0.01)
        .sort((a, b) => (b.isBottom ? 1 : 0) - (a.isBottom ? 1 : 0));
      let remaining = diff;
      for (const slot of order) {
        if (remaining <= 0) break;
        const add = Math.min(slot.roomUp, remaining / order.length);
        heights[slot.i]! += add;
        remaining -= add;
      }
    } else {
      const order = adjustable
        .filter((a) => a.roomDown > 0.01 && !a.isBottom)
        .sort((a, b) => a.i - b.i);
      let remaining = -diff;
      for (const slot of order) {
        if (remaining <= 0) break;
        const sub = Math.min(slot.roomDown, remaining / order.length);
        heights[slot.i]! -= sub;
        remaining -= sub;
      }
    }
  }

  const sum = heights.reduce((a, h) => a + h, 0);
  const correction = distributable - sum;
  if (Math.abs(correction) > 0.01 && heights.length > 0) {
    const last = heights.length - 1;
    heights[last] = clamp(heights[last]! + correction, minHeight, maxHeight);
  }

  return heights;
}

/**
 * Calcula alturas de gavetas com base em ergonomia europeia e zonas de cozinha.
 */
export function calculateErgonomicDrawerHeights(input: ErgonomicDrawerHeightsInput): number[] {
  const count = Math.max(0, Math.floor(input.drawerCount));
  if (count === 0) return [];

  const gapMm = input.gapMm ?? DRAWER_VERTICAL_GAP_MM;
  const minH = input.minHeightMm ?? ERGONOMIC_MIN_DRAWER_HEIGHT_MM;
  const maxH = input.maxHeightMm ?? ERGONOMIC_MAX_DRAWER_HEIGHT_MM;
  const usable = Math.max(1, input.usableHeightMm);
  const gapTotal = Math.max(0, count - 1) * gapMm;
  const distributable = Math.max(count * minH, usable - gapTotal);
  const effectiveDistributable = Math.min(distributable, count * maxH);

  const weights = resolveRawWeights(input);
  return clampAndFitHeights(weights, effectiveDistributable, minH, maxH);
}

/** Estima o centro Y de cada gaveta (mm acima do piso) para validação de alcance. */
export function estimateDrawerCenterHeightsFromFloorMm(
  drawerHeights: number[],
  baseCabinetHeightMm: number,
  feetHeightMm = 0
): number[] {
  const gap = DRAWER_VERTICAL_GAP_MM;
  const base = feetHeightMm;
  let stack = base;
  return drawerHeights.map((h) => {
    const center = stack + h / 2;
    stack += h + gap;
    return Math.min(base + baseCabinetHeightMm, center);
  });
}
