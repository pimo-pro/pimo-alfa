import type { WoodMaterialOptions } from "./WoodMaterial";
import { listOfficialMaterials, resolveMaterial } from "../../core/materials/materials.api";

export type MaterialPreset = {
  name: string;
  options?: WoodMaterialOptions;
};

export type MaterialSet = Record<string, MaterialPreset>;

/** IDs dos materiais (cor sólida, sem texturas). */
export const MATERIAIS_PBR_IDS = [
  "carvalho_natural",
  "carvalho_escuro",
  "nogueira",
  "mdf_branco",
  "mdf_cinza",
  "mdf_preto",
] as const;

export type MaterialPbrId = (typeof MATERIAIS_PBR_IDS)[number];

export const MATERIAIS_PBR_LABELS: Record<MaterialPbrId, string> = {
  carvalho_natural: "Carvalho",
  carvalho_escuro: "Carvalho",
  nogueira: "Nogueira",
  mdf_branco: "MDF Branco",
  mdf_cinza: "MDF Cinza",
  mdf_preto: "MDF Preto",
};

export function resolveMaterialId(nome: string): MaterialPbrId {
  const resolved = resolveMaterial(nome);
  const viewer = resolved?.viewerMaterialId;
  if (!viewer) return "mdf_branco";
  if (MATERIAIS_PBR_IDS.includes(viewer as MaterialPbrId)) return viewer as MaterialPbrId;
  return "mdf_branco";
}

/** Materiais sólidos (cor, roughness, metalness, envMapIntensity). Sem texturas. */
export const defaultMaterialSet: MaterialSet = listOfficialMaterials()
  .filter((m) => m.visual && m.viewerMaterialId)
  .reduce<MaterialSet>((acc, material) => {
    const id = material.viewerMaterialId as MaterialPbrId;
    if (!MATERIAIS_PBR_IDS.includes(id)) return acc;
    acc[id] = {
      name: id,
      options: {
        color:
          id === "carvalho_natural"
            ? "#c9a27a"
            : id === "carvalho_escuro"
              ? "#5c3d2e"
              : id === "nogueira"
                ? "#8a5a2b"
                : id === "mdf_cinza"
                  ? "#9ca3af"
                  : id === "mdf_preto"
                    ? "#1f2937"
                    : "#f2f0eb",
        metalness: 0,
        roughness: 0.55,
        envMapIntensity: 0.4,
      },
    };
    return acc;
  }, {
    mdf_branco: {
      name: "mdf_branco",
      options: { color: "#f2f0eb", metalness: 0, roughness: 0.52, envMapIntensity: 0.4 },
    },
  });

export function getMaterialPreset(materialSet: MaterialSet, idOrName: string): MaterialPreset | null {
  const resolved = resolveMaterialId(idOrName);
  return materialSet[resolved] ?? materialSet.mdf_branco ?? null;
}

export const mergeMaterialSet = (base: MaterialSet, incoming?: MaterialSet) => {
  if (!incoming) return base;
  return { ...base, ...incoming };
};
