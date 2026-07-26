/**
 * catalog.ts — Catalogo oficial dos 4 sistemas europeus (Modelo B).
 *
 * Specs industriais fornecidas para esta fase (SSOT Modelo B).
 * Nao reutiliza drawerMetalBoxCatalog do Modelo A (alturas diferentes).
 */

import type {
  DrawerEuropeanModel,
  DrawerHolePattern,
  EuropeanDrawerSystemId,
} from "./types";
import { HETTICH_RUNNER_LENGTHS_MM } from "./measures/hettichRunners";

function depthRange(minMm: number, maxMm: number, extras: number[] = []): number[] {
  const step = 50;
  const set = new Set<number>(extras);
  // Inclui o minimo exacto e depois passos de 50 a partir do multiplo conveniente.
  set.add(minMm);
  const start = Math.ceil(minMm / step) * step;
  for (let d = start; d <= maxMm; d += step) set.add(d);
  if (maxMm % step !== 0) set.add(maxMm);
  return Array.from(set).sort((a, b) => a - b);
}

function holePattern(partial: Partial<DrawerHolePattern> & Pick<DrawerHolePattern, "bottomGapMm" | "lateralOffsetMm">): DrawerHolePattern {
  return {
    setbackFrontMm: 37,
    systemPitchMm: 32,
    runnerHoleDiameterMm: 5,
    runnerHoleDepthMm: 12,
    frontFixDiameterMm: 5,
    frontFixDepthMm: 12,
    ...partial,
  };
}

const ASSEMBLY_BASE = {
  order: [
    "1. Fixar corrediças Hettich nas laterais do módulo (sistema 32 mm)",
    "2. Montar laterais 16 mm + costa 16 mm + fundo 10 mm",
    "3. Fixar frente interna (se dual) / frente externa (material independente)",
    "4. Regular Soft-Close / Push-Open",
  ],
  toleranceMm: 0.5,
  frontGapMm: 1,
  softCloseSupported: true,
  pushOpenSupported: true,
};

export const BLUM_LEGRABOX: DrawerEuropeanModel = {
  id: "blum-legrabox",
  brand: "Blum",
  displayName: "Blum Legrabox",
  heights: [
    { code: "N", heightMm: 66, label: "N — 66 mm" },
    { code: "M", heightMm: 90, label: "M — 90 mm" },
    { code: "K", heightMm: 128, label: "K — 128 mm" },
    { code: "F", heightMm: 185, label: "F — 185 mm" },
    { code: "H", heightMm: 241, label: "H — 241 mm" },
  ],
  depthsMm: depthRange(300, 600, [300]),
  depthProfile: { nominalMm: 500, minMm: 300, maxMm: 600, stepMm: 50 },
  side: { clearanceMm: 7, wallThicknessMm: 16, runnerFamily: "Blum Movento / Legrabox" },
  holePattern: holePattern({ bottomGapMm: 12.5, lateralOffsetMm: 10 }),
  assembly: {
    ...ASSEMBLY_BASE,
    warnings: [
      "Modelo B: largura externa = caixa interna ? 14 mm (folga 7+7)",
      "Corrediças Hettich 300–600; corpo = corrediça ? 10 mm",
      "Setback frontal 37 mm; bottom gap 12.5 mm; sistema 32 mm",
    ],
  },
  recommendedFrontThicknessMm: 19,
  recommendedBottomThicknessMm: 10,
  notes: "Soft-Close e Push-Open suportados.",
};

export const BLUM_TANDEMBOX_ANTARO: DrawerEuropeanModel = {
  id: "blum-tandembox-antaro",
  brand: "Blum",
  displayName: "Blum TandemBox Antaro",
  heights: [
    { code: "D", heightMm: 68, label: "D — 68 mm" },
    { code: "M", heightMm: 83, label: "M — 83 mm" },
    { code: "K", heightMm: 115, label: "K — 115 mm" },
    { code: "C", heightMm: 167, label: "C — 167 mm" },
    { code: "F", heightMm: 199, label: "F — 199 mm" },
  ],
  depthsMm: depthRange(300, 600, [300]),
  depthProfile: { nominalMm: 500, minMm: 300, maxMm: 600, stepMm: 50 },
  side: { clearanceMm: 7, wallThicknessMm: 16, runnerFamily: "Blum Tandem / Antaro" },
  holePattern: holePattern({ bottomGapMm: 12.5, lateralOffsetMm: 0 }),
  assembly: {
    ...ASSEMBLY_BASE,
    warnings: [
      "Modelo B: largura externa = caixa interna ? 14 mm (folga 7+7)",
      "Corrediças Hettich 300–600; corpo = corrediça ? 10 mm",
    ],
  },
  recommendedFrontThicknessMm: 19,
  recommendedBottomThicknessMm: 10,
  notes: "Soft-Close e Push-Open suportados.",
};

export const HETTICH_INNOTECH_ATIRA: DrawerEuropeanModel = {
  id: "hettich-innotech-atira",
  brand: "Hettich",
  displayName: "Hettich InnoTech Atira",
  heights: [
    { code: "", heightMm: 70, label: "70 mm" },
    { code: "", heightMm: 144, label: "144 mm" },
    { code: "", heightMm: 176, label: "176 mm" },
    { code: "", heightMm: 208, label: "208 mm" },
  ],
  depthsMm: depthRange(300, 600, [300]),
  depthProfile: { nominalMm: 500, minMm: 300, maxMm: 600, stepMm: 50 },
  side: { clearanceMm: 7, wallThicknessMm: 16, runnerFamily: "Hettich InnoTech Atira" },
  holePattern: holePattern({ bottomGapMm: 12, lateralOffsetMm: 0 }),
  assembly: {
    ...ASSEMBLY_BASE,
    warnings: [
      "Modelo B: largura externa = caixa interna ? 14 mm (folga 7+7)",
      "Corrediças Hettich 300–600; corpo = corrediça ? 10 mm",
    ],
  },
  recommendedFrontThicknessMm: 19,
  recommendedBottomThicknessMm: 10,
  notes: "Soft-Close e Push-Open suportados.",
};

export const GRASS_NOVA_PRO_SCALA: DrawerEuropeanModel = {
  id: "grass-nova-pro-scala",
  brand: "Grass",
  displayName: "Grass Nova Pro Scala",
  heights: [
    { code: "", heightMm: 63, label: "63 mm" },
    { code: "", heightMm: 90, label: "90 mm" },
    { code: "", heightMm: 186, label: "186 mm" },
    { code: "", heightMm: 250, label: "250 mm" },
  ],
  depthsMm: depthRange(300, 600, [300]),
  depthProfile: { nominalMm: 500, minMm: 300, maxMm: 600, stepMm: 50 },
  side: { clearanceMm: 7, wallThicknessMm: 16, runnerFamily: "Grass Nova Pro Scala" },
  holePattern: holePattern({ bottomGapMm: 12.5, lateralOffsetMm: 0 }),
  assembly: {
    ...ASSEMBLY_BASE,
    warnings: [
      "Modelo B: largura externa = caixa interna ? 14 mm (folga 7+7)",
      "Corrediças Hettich 300–600; corpo = corrediça ? 10 mm",
    ],
  },
  recommendedFrontThicknessMm: 19,
  recommendedBottomThicknessMm: 10,
  notes: "Soft-Close e Push-Open suportados.",
};

/** Catalogo completo — ordem estavel para UI. */
export const EUROPEAN_DRAWER_SYSTEMS: readonly DrawerEuropeanModel[] = [
  BLUM_LEGRABOX,
  BLUM_TANDEMBOX_ANTARO,
  HETTICH_INNOTECH_ATIRA,
  GRASS_NOVA_PRO_SCALA,
] as const;

const BY_ID: Record<EuropeanDrawerSystemId, DrawerEuropeanModel> = {
  "blum-legrabox": BLUM_LEGRABOX,
  "blum-tandembox-antaro": BLUM_TANDEMBOX_ANTARO,
  "hettich-innotech-atira": HETTICH_INNOTECH_ATIRA,
  "grass-nova-pro-scala": GRASS_NOVA_PRO_SCALA,
};

export function getEuropeanDrawerModel(id: EuropeanDrawerSystemId): DrawerEuropeanModel {
  return BY_ID[id];
}

export function listEuropeanDrawerModels(): readonly DrawerEuropeanModel[] {
  return EUROPEAN_DRAWER_SYSTEMS;
}

export function findNearestDepthMm(_model: DrawerEuropeanModel, depthMm: number): number {
  const list = [...HETTICH_RUNNER_LENGTHS_MM];
  if (list.length === 0) return depthMm;
  let best = list[0]!;
  let bestDist = Math.abs(best - depthMm);
  for (const d of list) {
    const dist = Math.abs(d - depthMm);
    if (dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return best;
}

export function findHeightProfile(model: DrawerEuropeanModel, heightMm: number) {
  const exact = model.heights.find((h) => h.heightMm === heightMm);
  if (exact) return exact;
  let best = model.heights[0]!;
  let bestDist = Math.abs(best.heightMm - heightMm);
  for (const h of model.heights) {
    const dist = Math.abs(h.heightMm - heightMm);
    if (dist < bestDist) {
      best = h;
      bestDist = dist;
    }
  }
  return best;
}
