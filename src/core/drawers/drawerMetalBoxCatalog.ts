/**
 * Catálogo industrial de caixas metálicas (Blum / Hettich / Grass).
 */

import type { DrawerMetalBoxType, DrawerSlideType } from "../settings/settingsSchema";

export type MetalBoxFrontHoleTemplate = {
  xFromLeft: number;
  yFromTop: number;
  diametro: number;
  profundidade: number;
};

export type DrawerMetalBoxProfile = {
  id: string;
  catalogType: DrawerMetalBoxType;
  brand: "Blum" | "Hettich" | "Grass" | "Hafele" | "Genérica";
  nome: string;
  series?: string;
  allowedHeightsMm: number[];
  compatibleDepthsMm: number[];
  recommendedFrontThicknessMm: number;
  slideOffsetFrontMm: number;
  slideOffsetRearMm: number;
  bodyRecessMm: number;
  defaultSlideType: DrawerSlideType;
  frontHoles: MetalBoxFrontHoleTemplate[];
  fixationCount: number;
};

const LEGRABOX_DEPTHS = [270, 300, 350, 400, 450, 500, 550, 600, 650];
const STANDARD_DEPTHS = [350, 400, 450, 500, 550, 600];
const HETTICH_DEPTHS = [300, 350, 400, 450, 500, 550, 600];

/** Furos típicos de fixação frente ↔ caixa metálica (face traseira da frente). */
function standardFrontHoles(): MetalBoxFrontHoleTemplate[] {
  return [
    { xFromLeft: 37, yFromTop: 0, diametro: 5, profundidade: 12 },
    { xFromLeft: -37, yFromTop: 0, diametro: 5, profundidade: 12 },
  ];
}

function profile(
  partial: Omit<DrawerMetalBoxProfile, "frontHoles" | "fixationCount"> & {
    frontHoles?: MetalBoxFrontHoleTemplate[];
  }
): DrawerMetalBoxProfile {
  const defaultHeight = partial.allowedHeightsMm[Math.floor(partial.allowedHeightsMm.length / 2)] ?? 128;
  const holes = partial.frontHoles ?? standardFrontHoles();
  return {
    ...partial,
    frontHoles: holes,
    fixationCount: holes.length,
  };
}

export const DRAWER_METAL_BOX_PROFILES: DrawerMetalBoxProfile[] = [
  profile({
    id: "blum_legrabox",
    catalogType: "Blum Legrabox",
    brand: "Blum",
    nome: "Blum Legrabox (C/M/F)",
    series: "C/M/F",
    allowedHeightsMm: [83, 96, 128, 177, 224],
    compatibleDepthsMm: LEGRABOX_DEPTHS,
    recommendedFrontThicknessMm: 19,
    slideOffsetFrontMm: 37,
    slideOffsetRearMm: 37,
    bodyRecessMm: 70,
    defaultSlideType: "Blum Movento",
  }),
  profile({
    id: "blum_antaro",
    catalogType: "Blum Antaro",
    brand: "Blum",
    nome: "Blum Antaro",
    allowedHeightsMm: [83, 96, 128, 177, 224],
    compatibleDepthsMm: LEGRABOX_DEPTHS,
    recommendedFrontThicknessMm: 19,
    slideOffsetFrontMm: 37,
    slideOffsetRearMm: 37,
    bodyRecessMm: 70,
    defaultSlideType: "Blum Movento",
  }),
  profile({
    id: "blum_matabox",
    catalogType: "Blum Metabox",
    brand: "Blum",
    nome: "Blum Metabox",
    allowedHeightsMm: [54, 84, 106, 118, 142],
    compatibleDepthsMm: [270, 300, 350, 400, 450, 500],
    recommendedFrontThicknessMm: 19,
    slideOffsetFrontMm: 32,
    slideOffsetRearMm: 32,
    bodyRecessMm: 65,
    defaultSlideType: "Blum Tandem",
  }),
  profile({
    id: "hettich_innotech",
    catalogType: "Hettich InnoTech",
    brand: "Hettich",
    nome: "Hettich InnoTech",
    allowedHeightsMm: [90, 120, 150, 180],
    compatibleDepthsMm: HETTICH_DEPTHS,
    recommendedFrontThicknessMm: 19,
    slideOffsetFrontMm: 37,
    slideOffsetRearMm: 37,
    bodyRecessMm: 70,
    defaultSlideType: "Hettich InnoTech",
  }),
  profile({
    id: "hettich_arcitech",
    catalogType: "Hettich ArciTech",
    brand: "Hettich",
    nome: "Hettich ArciTech",
    allowedHeightsMm: [83, 96, 128, 160, 182],
    compatibleDepthsMm: HETTICH_DEPTHS,
    recommendedFrontThicknessMm: 19,
    slideOffsetFrontMm: 37,
    slideOffsetRearMm: 37,
    bodyRecessMm: 70,
    defaultSlideType: "Hettich ArciTech",
  }),
  profile({
    id: "hettich_avantech",
    catalogType: "Hettich AvanTech",
    brand: "Hettich",
    nome: "Hettich AvanTech",
    allowedHeightsMm: [83, 96, 128, 160, 182],
    compatibleDepthsMm: HETTICH_DEPTHS,
    recommendedFrontThicknessMm: 19,
    slideOffsetFrontMm: 37,
    slideOffsetRearMm: 37,
    bodyRecessMm: 70,
    defaultSlideType: "Hettich InnoTech",
  }),
  profile({
    id: "grass_nova_pro",
    catalogType: "Grass Nova Pro",
    brand: "Grass",
    nome: "Grass Nova Pro",
    allowedHeightsMm: [83, 96, 128, 177],
    compatibleDepthsMm: STANDARD_DEPTHS,
    recommendedFrontThicknessMm: 19,
    slideOffsetFrontMm: 37,
    slideOffsetRearMm: 37,
    bodyRecessMm: 68,
    defaultSlideType: "Genérica",
  }),
  profile({
    id: "grass_vionaro",
    catalogType: "Grass Vionaro",
    brand: "Grass",
    nome: "Grass Vionaro",
    allowedHeightsMm: [96, 128, 177, 224],
    compatibleDepthsMm: STANDARD_DEPTHS,
    recommendedFrontThicknessMm: 19,
    slideOffsetFrontMm: 37,
    slideOffsetRearMm: 37,
    bodyRecessMm: 68,
    defaultSlideType: "Genérica",
  }),
  profile({
    id: "hafele_alto",
    catalogType: "Hafele Alto",
    brand: "Hafele",
    nome: "Hafele Alto",
    allowedHeightsMm: [96, 128, 160],
    compatibleDepthsMm: STANDARD_DEPTHS,
    recommendedFrontThicknessMm: 19,
    slideOffsetFrontMm: 37,
    slideOffsetRearMm: 37,
    bodyRecessMm: 70,
    defaultSlideType: "Hafele Matrix",
  }),
  profile({
    id: "generica",
    catalogType: "Genérica",
    brand: "Genérica",
    nome: "Caixa metálica genérica",
    allowedHeightsMm: [83, 96, 128, 177],
    compatibleDepthsMm: STANDARD_DEPTHS,
    recommendedFrontThicknessMm: 19,
    slideOffsetFrontMm: 37,
    slideOffsetRearMm: 37,
    bodyRecessMm: 70,
    defaultSlideType: "Genérica",
  }),
];

const ALL_METAL_TYPES: DrawerMetalBoxType[] = [
  "Nenhuma",
  "Blum Legrabox",
  "Blum Antaro",
  "Blum Metabox",
  "Hettich InnoTech",
  "Hettich ArciTech",
  "Hettich AvanTech",
  "Grass Nova Pro",
  "Grass Vionaro",
  "Hafele Alto",
  "Genérica",
];

export function normalizeDrawerMetalBoxType(value?: string | null): DrawerMetalBoxType {
  const v = value ?? "Nenhuma";
  return (ALL_METAL_TYPES as string[]).includes(v) ? (v as DrawerMetalBoxType) : "Nenhuma";
}

export function isMetalBoxCatalogType(value?: string | null): boolean {
  return normalizeDrawerMetalBoxType(value) !== "Nenhuma";
}

export function findMetalBoxProfileById(id: string | null | undefined): DrawerMetalBoxProfile | null {
  if (!id) return null;
  return DRAWER_METAL_BOX_PROFILES.find((p) => p.id === id) ?? null;
}

export function listMetalBoxProfilesForType(
  catalogType: DrawerMetalBoxType
): DrawerMetalBoxProfile[] {
  if (catalogType === "Nenhuma") return [];
  return DRAWER_METAL_BOX_PROFILES.filter((p) => p.catalogType === catalogType);
}

export function resolveMetalBoxProfile(
  metalBoxType?: string | null,
  profileId?: string | null,
  heightMm?: number | null
): DrawerMetalBoxProfile | null {
  const type = normalizeDrawerMetalBoxType(metalBoxType);
  if (type === "Nenhuma") return null;

  const byId = findMetalBoxProfileById(profileId);
  const base = byId ?? listMetalBoxProfilesForType(type)[0] ?? null;
  if (!base) return null;

  if (heightMm == null || !Number.isFinite(heightMm)) return base;
  return base;
}

export function resolveMetalBoxHeightMm(
  profile: DrawerMetalBoxProfile,
  preferredMm?: number | null
): number {
  const allowed = profile.allowedHeightsMm;
  if (!preferredMm || !Number.isFinite(preferredMm)) {
    return allowed[Math.floor(allowed.length / 2)] ?? allowed[0] ?? 128;
  }
  return allowed.reduce((best, h) =>
    Math.abs(h - preferredMm) < Math.abs(best - preferredMm) ? h : best
  );
}

/** Y dos furos alinhado ao centro da zona metálica (caixa alinhada à base da frente). */
export function resolveMetalBoxHoleY(metalHeightMm: number, templateY?: number): number {
  const bottomInset = 9;
  if (templateY != null && templateY > 0 && templateY < metalHeightMm + bottomInset + 20) {
    return Math.round(metalHeightMm - templateY);
  }
  return Math.round(metalHeightMm / 2);
}

export function resolveMetalBoxFrontHoleYOnPanel(
  panelHeightMm: number,
  metalHeightMm: number
): number {
  const bottomInset = 9;
  return Math.max(20, panelHeightMm - bottomInset - metalHeightMm / 2);
}

export function pickCompatibleMetalDepth(
  profile: DrawerMetalBoxProfile,
  preferredMm: number
): number {
  const depths = profile.compatibleDepthsMm;
  const fitting = depths.filter((d) => d <= preferredMm);
  return fitting.length > 0 ? fitting[fitting.length - 1]! : depths[0] ?? preferredMm;
}
