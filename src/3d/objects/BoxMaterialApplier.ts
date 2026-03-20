import * as THREE from "three";
import { createWoodMaterial } from "../materials/WoodMaterial";
import { defaultMaterialSet, getMaterialPreset } from "../materials/MaterialLibrary";
import { getDefaultOfficialMaterial } from "../../core/materials/materials.api";

export type PanelMaterialOptions =
  | { singleMaterial: THREE.Material }
  | { edgeMaterial: THREE.Material; faceMaterial: THREE.Material };

let cachedFallbackMaterial: THREE.MeshStandardMaterial | null = null;

/** Material PBR de fallback (MDF Branco) — cor sólida, sem texturas. */
export function getFallbackPBRMaterial(): THREE.MeshStandardMaterial {
  if (cachedFallbackMaterial) return cachedFallbackMaterial;
  const preset = getMaterialPreset(defaultMaterialSet, "mdf_branco");
  if (!preset?.options) throw new Error("MaterialLibrary: mdf_branco preset required");
  const { material } = createWoodMaterial({}, { ...preset.options });
  cachedFallbackMaterial = material;
  return material;
}

let cachedEdgeMaterial: THREE.MeshStandardMaterial | null = null;

const officialMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

/** Material PBR para porta/gaveta: usa a mesma MaterialLibrary do módulo (id/label oficial). */
export function getMaterialForOfficialId(idOrLabel: string): THREE.MeshStandardMaterial {
  const key = (idOrLabel ?? "").trim() || getDefaultOfficialMaterial().canonicalId;
  const mat = officialMaterialCache.get(key);
  if (mat) return mat;
  const preset = getMaterialPreset(defaultMaterialSet, key);
  const options = preset?.options ?? { color: "#f2f0eb", roughness: 0.55, metalness: 0 };
  const { material } = createWoodMaterial({}, { ...options });
  officialMaterialCache.set(key, material);
  return material;
}

/** Material para arestas (corte) — cor ligeiramente mais escura, sem texturas. */
export function getEdgeMaterial(): THREE.MeshStandardMaterial {
  if (cachedEdgeMaterial) return cachedEdgeMaterial;
  const preset = getMaterialPreset(defaultMaterialSet, "mdf_branco");
  if (!preset?.options) throw new Error("MaterialLibrary: mdf_branco required");
  const { material } = createWoodMaterial({}, {
    ...preset.options,
    color: "#b8a898",
  });
  cachedEdgeMaterial = material;
  return material;
}

/** Garante que options tem sempre material/edgeMaterial válidos; nunca usa 'in' em undefined. */
export function resolvePanelMaterialOptions(
  options: PanelMaterialOptions | null | undefined,
  _panelType: "left" | "right" | "top" | "bottom" | "back"
): PanelMaterialOptions {
  if (options != null && typeof options === "object") {
    const hasEdge = "edgeMaterial" in options && options.edgeMaterial != null && options.faceMaterial != null;
    if (hasEdge) return { edgeMaterial: options.edgeMaterial, faceMaterial: options.faceMaterial };
    const single = "singleMaterial" in options ? options.singleMaterial : null;
    if (single != null) return { singleMaterial: single };
  }
  return {
    edgeMaterial: getEdgeMaterial(),
    faceMaterial: getFallbackPBRMaterial(),
  };
}
