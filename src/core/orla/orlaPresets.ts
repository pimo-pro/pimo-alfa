import type { OrlaPreset } from "./orlaTypes";

export const DEFAULT_ORLA_PRESETS: OrlaPreset[] = [
  {
    id: "branco_pvc_08_23mm",
    nome: "Branco PVC 0.8×23 mm",
    tipo: "PVC",
    espessuraMm: 0.8,
    larguraMm: 23,
    cor: "#f4f4f2",
    precoPorMetro: 1.25,
  },
  {
    id: "branco_pvc_08_20mm",
    nome: "Branco PVC 0.8×20 mm",
    tipo: "PVC",
    espessuraMm: 0.8,
    larguraMm: 20,
    cor: "#f4f4f2",
    precoPorMetro: 1.15,
  },
  {
    id: "branco_pvc_08_45mm",
    nome: "Branco PVC 0.8×45 mm",
    tipo: "PVC",
    espessuraMm: 0.8,
    larguraMm: 45,
    cor: "#f4f4f2",
    precoPorMetro: 2.1,
  },
  {
    id: "carvalho_pvc_08_23mm",
    nome: "Carvalho PVC 0.8×23 mm",
    tipo: "PVC",
    espessuraMm: 0.8,
    larguraMm: 23,
    cor: "#c4a574",
    precoPorMetro: 1.45,
  },
];

export function normalizeOrlaPresets(raw: OrlaPreset[] | undefined | null): OrlaPreset[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_ORLA_PRESETS];
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
