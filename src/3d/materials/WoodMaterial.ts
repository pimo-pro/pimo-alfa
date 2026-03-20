import * as THREE from "three";

/** Opções para material sólido (sem texturas). */
export type WoodMaterialOptions = {
  color?: string;
  roughness?: number;
  metalness?: number;
  envMapIntensity?: number;
};

/** Resultado: material + array vazio de texturas e no-ops para compatibilidade. */
export type LoadedWoodMaterial = {
  /** MeshPhysicalMaterial (lacado) é subtipo em runtime; incluído para tipagem explícita. */
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  textures: THREE.Texture[];
  loadDetailMaps: () => Promise<void>;
  areDetailMapsLoaded: () => boolean;
};

/**
 * Cria um MeshStandardMaterial apenas com cor e parâmetros PBR.
 * Não carrega texturas, map, normalMap, roughnessMap ou aoMap.
 */
export function createWoodMaterial(
  _maps: Record<string, unknown> = {},
  options: WoodMaterialOptions = {}
): LoadedWoodMaterial {
  const color = new THREE.Color(options.color ?? "#f2f0eb");
  const roughness = Math.max(0, Math.min(1, options.roughness ?? 0.55));
  const metalness = Math.max(0, Math.min(1, options.metalness ?? 0));
  const envMapIntensity = Math.max(0, Math.min(2, options.envMapIntensity ?? 0.4));

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    envMapIntensity,
    emissive: new THREE.Color(0x000000),
  });

  return {
    material,
    textures: [],
    loadDetailMaps: () => Promise.resolve(),
    areDetailMapsLoaded: () => true,
  };
}
