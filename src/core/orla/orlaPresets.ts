import type { OrlaPreset } from "./orlaTypes";
import { orlaEurMFromCentral } from "../pricing/centralPricingConfig";
import { MATERIAIS_SSOT_ORLA_STORAGE_KEY } from "../catalog/materiaisSsotStore";

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

function loadSsotOrlaOverrides(): OrlaPreset[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(MATERIAIS_SSOT_ORLA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as OrlaPreset[];
  } catch {
    return null;
  }
}

export function normalizeOrlaPresets(raw: OrlaPreset[] | undefined | null): OrlaPreset[] {
  const ssot = loadSsotOrlaOverrides();
  const base =
    Array.isArray(raw) && raw.length > 0 ? raw : ssot && ssot.length > 0 ? ssot : buildDefaultOrlaPresets();

  const ssotById = new Map((ssot ?? []).map((p) => [p.id, p]));

  return base.map((p) => {
    const override = ssotById.get(p.id);
    const merged = override ? { ...p, ...override, id: p.id } : p;
    return {
      ...merged,
      espessuraMm: Math.max(0.1, merged.espessuraMm ?? 0.8),
      larguraMm: Math.max(1, merged.larguraMm ?? 23),
      precoPorMetro: Math.max(0, merged.precoPorMetro ?? 0),
      precoPorRolo:
        merged.precoPorRolo === undefined || merged.precoPorRolo === null
          ? undefined
          : Math.max(0, Number(merged.precoPorRolo)),
    };
  });
}

export function findOrlaPreset(presets: OrlaPreset[], id: string | null | undefined): OrlaPreset | null {
  if (!id) return null;
  return presets.find((p) => p.id === id) ?? null;
}
