import type { OrlaPreset } from "./orlaTypes";
import { orlaEurMFromCentral } from "../pricing/centralPricingConfig";

function buildDefaultOrlaPresets(): OrlaPreset[] {
  const pvcBranco = orlaEurMFromCentral("PVC_BRANCO_1") ?? 0.53;
  const pvcCarvalho = orlaEurMFromCentral("PVC_CARVALHO_1") ?? 0.65;
  return [
    {
      id: "branco_pvc_08_23mm",
      nome: "Branco PVC 0.8×23 mm",
      tipo: "PVC",
      espessuraMm: 0.8,
      larguraMm: 23,
      cor: "#f4f4f2",
      precoPorMetro: pvcBranco,
    },
    {
      id: "branco_pvc_08_20mm",
      nome: "Branco PVC 0.8×20 mm",
      tipo: "PVC",
      espessuraMm: 0.8,
      larguraMm: 20,
      cor: "#f4f4f2",
      precoPorMetro: pvcBranco,
    },
    {
      id: "branco_pvc_08_45mm",
      nome: "Branco PVC 0.8×45 mm",
      tipo: "PVC",
      espessuraMm: 0.8,
      larguraMm: 45,
      cor: "#f4f4f2",
      precoPorMetro: pvcBranco,
    },
    {
      id: "carvalho_pvc_08_23mm",
      nome: "Carvalho PVC 0.8×23 mm",
      tipo: "PVC",
      espessuraMm: 0.8,
      larguraMm: 23,
      cor: "#c4a574",
      precoPorMetro: pvcCarvalho,
    },
  ];
}

/** Defaults com preços de /config/pricing.json (orlas). */
export const DEFAULT_ORLA_PRESETS: OrlaPreset[] = buildDefaultOrlaPresets();

export function normalizeOrlaPresets(raw: OrlaPreset[] | undefined | null): OrlaPreset[] {
  if (!Array.isArray(raw) || raw.length === 0) return buildDefaultOrlaPresets();
  return raw.map((p) => ({
    ...p,
    espessuraMm: Math.max(0.1, p.espessuraMm ?? 0.8),
    larguraMm: Math.max(1, p.larguraMm ?? 23),
    precoPorMetro: Math.max(0, p.precoPorMetro ?? 0),
  }));
}

export function findOrlaPreset(presets: OrlaPreset[], id: string | null | undefined): OrlaPreset | null {
  if (!id) return null;
  return presets.find((p) => p.id === id) ?? null;
}
