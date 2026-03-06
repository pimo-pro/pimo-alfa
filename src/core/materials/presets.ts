/**
 * FASE 4 — Etapa 8 (Parte 1): Material Presets Engine.
 * Estrutura centralizada para presets visuais (base do futuro MaterialLibrary v2, Textures, UV Mapping).
 */

export interface MaterialPreset {
  id: string;
  name: string;
  color: string;
  textureUrl?: string;
  uvScale?: { x: number; y: number };
  uvRotation?: number;
  roughness?: number;
  metallic?: number;
  normalMapUrl?: string;
}

export type MaterialPresetRecord = Record<string, MaterialPreset>;

const DEFAULT_UV_SCALE = { x: 1, y: 1 };
const DEFAULT_METALLIC = 0;

/** Presets iniciais (carregados estaticamente). */
export const INITIAL_MATERIAL_PRESETS: MaterialPreset[] = [
  {
    id: "mdf_branco",
    name: "MDF Branco",
    color: "#f2f0eb",
    uvScale: DEFAULT_UV_SCALE,
    uvRotation: 0,
    roughness: 0.52,
    metallic: DEFAULT_METALLIC,
  },
  {
    id: "mdf_cinza",
    name: "MDF Cinza",
    color: "#9ca3af",
    uvScale: DEFAULT_UV_SCALE,
    uvRotation: 0,
    roughness: 0.55,
    metallic: DEFAULT_METALLIC,
  },
  {
    id: "mdf_preto",
    name: "MDF Preto",
    color: "#1f2937",
    uvScale: DEFAULT_UV_SCALE,
    uvRotation: 0,
    roughness: 0.58,
    metallic: DEFAULT_METALLIC,
  },
  {
    id: "carvalho_natural",
    name: "Carvalho",
    color: "#c9a27a",
    uvScale: DEFAULT_UV_SCALE,
    uvRotation: 0,
    roughness: 0.55,
    metallic: DEFAULT_METALLIC,
  },
  {
    id: "nogueira",
    name: "Nogueira",
    color: "#8a5a2b",
    uvScale: DEFAULT_UV_SCALE,
    uvRotation: 0,
    roughness: 0.55,
    metallic: DEFAULT_METALLIC,
  },
];
