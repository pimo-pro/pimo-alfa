export type MaterialCategory =
  | "wood"
  | "metal"
  | "glass"
  | "plastic"
  | "marble"
  | "stone";

export type MaterialPreset = {
  id: string;
  label: string;
  category: MaterialCategory;
  maps: {
    map: string;
    normalMap: string;
    roughnessMap: string;
    metalnessMap: string;
    aoMap: string;
  };
  defaults: {
    roughness: number;
    metalness: number;
    envMapIntensity: number;
    color: string;
  };
};

const buildMaps = (category: MaterialCategory) => ({
  map: `/textures/${category}/base.svg`,
  normalMap: `/textures/${category}/normal.svg`,
  roughnessMap: `/textures/${category}/roughness.svg`,
  metalnessMap: `/textures/${category}/metalness.svg`,
  aoMap: `/textures/${category}/ao.svg`,
});

// Sistema consolidado: apenas presets de madeira.
export const materialPresets: MaterialPreset[] = [
  {
    id: "wood_oak",
    label: "Madeira - Carvalho",
    category: "wood",
    maps: buildMaps("wood"),
    defaults: { roughness: 0.55, metalness: 0.05, envMapIntensity: 0.9, color: "#c9a27a" },
  },
  {
    id: "wood_walnut",
    label: "Madeira - Nogueira",
    category: "wood",
    maps: buildMaps("wood"),
    defaults: { roughness: 0.6, metalness: 0.05, envMapIntensity: 0.9, color: "#8b5a2b" },
  },
  {
    id: "wood_pine",
    label: "Madeira - Pinho",
    category: "wood",
    maps: buildMaps("wood"),
    defaults: { roughness: 0.5, metalness: 0.03, envMapIntensity: 0.8, color: "#e0c38d" },
  },
];

export const getPresetsByCategory = (category: MaterialCategory) =>
  materialPresets.filter((preset) => preset.category === category);

export const getPresetById = (presetId: string) =>
  materialPresets.find((preset) => preset.id === presetId);
