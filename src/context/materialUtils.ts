import { getPresetById } from "../core/materials/presetService";

export type MaterialCategory =
  | "wood"
  | "metal"
  | "glass"
  | "plastic"
  | "marble"
  | "stone";

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
      presetId: "mdf_branco",
      roughness: 0.52,
      metalness: 0,
      envMapIntensity: 0.4,
      color: "#f2f0eb",
    },
    metal: {
      presetId: "mdf_branco",
      roughness: 0.55,
      metalness: 0.05,
      envMapIntensity: 0.9,
      color: "#c9a27a",
    },
    glass: {
      presetId: "mdf_branco",
      roughness: 0.52,
      metalness: 0,
      envMapIntensity: 0.4,
      color: "#f2f0eb",
    },
    plastic: {
      presetId: "mdf_branco",
      roughness: 0.52,
      metalness: 0,
      envMapIntensity: 0.4,
      color: "#f2f0eb",
    },
    marble: {
      presetId: "mdf_branco",
      roughness: 0.52,
      metalness: 0,
      envMapIntensity: 0.4,
      color: "#f2f0eb",
    },
    stone: {
      presetId: "mdf_branco",
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
        presetId: preset?.id ?? incoming.presetId ?? categories[category].presetId,
        roughness: Number.isFinite(incoming.roughness)
          ? Number(incoming.roughness)
          : preset?.roughness ?? categories[category].roughness,
        metalness: Number.isFinite(incoming.metalness)
          ? Number(incoming.metalness)
          : preset?.metallic ?? categories[category].metalness,
        envMapIntensity: Number.isFinite(incoming.envMapIntensity)
          ? Number(incoming.envMapIntensity)
          : categories[category].envMapIntensity,
        color: typeof incoming.color === "string" ? incoming.color : preset?.color ?? categories[category].color,
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
