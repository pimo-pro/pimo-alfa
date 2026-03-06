import type { MaterialCategory } from "../core/materials/materialPresets";
import { getPresetById } from "../core/materials/materialPresets";

export type ModelPart = "wood" | "metal" | "glass" | "panel" | "door" | "drawer";

export type MaterialCategoryConfig = {
  presetId: string;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  color: string;
};

export type MaterialSystemState = {
  categories: Record<MaterialCategory, MaterialCategoryConfig>;
  assignments: Record<ModelPart, MaterialCategory>;
};

export const MATERIAL_STORAGE_KEY = "pimo_material_system_v1";

export const defaultMaterialState: MaterialSystemState = {
  categories: {
    wood: {
      presetId: "wood_oak",
      roughness: 0.55,
      metalness: 0.05,
      envMapIntensity: 0.9,
      color: "#c9a27a",
    },
    metal: {
      presetId: "wood_oak",
      roughness: 0.55,
      metalness: 0.05,
      envMapIntensity: 0.9,
      color: "#c9a27a",
    },
    glass: {
      presetId: "wood_oak",
      roughness: 0.55,
      metalness: 0.05,
      envMapIntensity: 0.9,
      color: "#c9a27a",
    },
    plastic: {
      presetId: "wood_oak",
      roughness: 0.55,
      metalness: 0.05,
      envMapIntensity: 0.9,
      color: "#c9a27a",
    },
    marble: {
      presetId: "wood_oak",
      roughness: 0.55,
      metalness: 0.05,
      envMapIntensity: 0.9,
      color: "#c9a27a",
    },
    stone: {
      presetId: "wood_oak",
      roughness: 0.55,
      metalness: 0.05,
      envMapIntensity: 0.9,
      color: "#c9a27a",
    },
  },
  assignments: {
    wood: "wood",
    metal: "metal",
    glass: "glass",
    panel: "wood",
    door: "wood",
    drawer: "wood",
  },
};

export const normalizeMaterialState = (value: unknown): MaterialSystemState => {
  if (!value || typeof value !== "object") return defaultMaterialState;
  const partial = value as Partial<MaterialSystemState>;
  const categories = { ...defaultMaterialState.categories };
  if (partial.categories) {
    (Object.keys(categories) as MaterialCategory[]).forEach((category) => {
      const incoming = partial.categories?.[category];
      if (!incoming) return;
      const preset = getPresetById(incoming.presetId);
      categories[category] = {
        presetId: preset?.id ?? categories[category].presetId,
        roughness: Number.isFinite(incoming.roughness)
          ? Number(incoming.roughness)
          : categories[category].roughness,
        metalness: Number.isFinite(incoming.metalness)
          ? Number(incoming.metalness)
          : categories[category].metalness,
        envMapIntensity: Number.isFinite(incoming.envMapIntensity)
          ? Number(incoming.envMapIntensity)
          : categories[category].envMapIntensity,
        color: typeof incoming.color === "string" ? incoming.color : categories[category].color,
      };
    });
  }
  const assignments = { ...defaultMaterialState.assignments, ...(partial.assignments ?? {}) };
  return { categories, assignments };
};

export const materialCategoryOptions: { id: MaterialCategory; label: string }[] = [
  { id: "wood", label: "Madeira" },
];

export const modelPartOptions: { id: ModelPart; label: string }[] = [
  { id: "wood", label: "Superfícies de madeira" },
  { id: "metal", label: "Superfícies metálicas" },
  { id: "glass", label: "Vidro" },
  { id: "panel", label: "Painéis" },
  { id: "door", label: "Portas" },
  { id: "drawer", label: "Gavetas" },
];
