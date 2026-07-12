/**
 * MaterialEngine — Aplica preset a MeshStandardMaterial / MeshPhysicalMaterial (cor, PBR, opcionalmente mapas).
 * Cor + PBR sempre; map/normalMap/roughnessMap quando existirem no preset (textureUrl).
 */

import * as THREE from "three";
import type { MaterialPresetDefinition } from "./types";
import { loadTextureAsync } from "./textureCache";

type StandardOrPhysical = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

/**
 * Aplica cor e PBR ao material (sempre).
 */
export function applyColorAndPBRToMaterial(
  mat: StandardOrPhysical,
  preset: MaterialPresetDefinition
): void {
  mat.color.set(preset.baseColor);
  mat.roughness = Math.max(0, Math.min(1, preset.roughness));
  mat.metalness = Math.max(0, Math.min(1, preset.metalness));
  if (preset.envMapIntensity != null) {
    mat.envMapIntensity = Math.max(0, Math.min(2, preset.envMapIntensity));
  }
  mat.needsUpdate = true;
}

/**
 * Remove mapas do material (modo performance).
 */
export function clearMapsFromMaterial(mat: StandardOrPhysical): void {
  mat.map = null;
  mat.normalMap = null;
  mat.roughnessMap = null;
  mat.needsUpdate = true;
}

/**
 * Aplica mapas de textura ao material (repeat e rotation do preset).
 * Carrega texturas de forma assíncrona; quando todas estiverem carregadas, aplica.
 */
export function applyMapsToMaterialAsync(
  mat: StandardOrPhysical,
  preset: MaterialPresetDefinition,
  onMapsApplied?: () => void
): void {
  const repeat = preset.repeat ?? { x: 1, y: 1 };
  const rotationRad = ((preset.rotation ?? 0) * Math.PI) / 180;

  const applyUv = (tex: THREE.Texture) => {
    tex.repeat.set(repeat.x, repeat.y);
    tex.rotation = rotationRad;
  };

  const apply = (
    mapTex: THREE.Texture | null,
    normalTex: THREE.Texture | null,
    roughnessTex: THREE.Texture | null
  ) => {
    if (mapTex) {
      mat.map = mapTex;
      applyUv(mapTex);
    }
    if (normalTex) {
      mat.normalMap = normalTex;
      applyUv(normalTex);
    }
    if (roughnessTex) {
      mat.roughnessMap = roughnessTex;
      applyUv(roughnessTex);
    }
    mat.needsUpdate = true;
  };

  if (preset.textureUrl || preset.normalMapUrl || preset.roughnessMapUrl) {
    Promise.all([
      preset.textureUrl ? loadTextureAsync(preset.textureUrl) : Promise.resolve(null),
      preset.normalMapUrl ? loadTextureAsync(preset.normalMapUrl) : Promise.resolve(null),
      preset.roughnessMapUrl ? loadTextureAsync(preset.roughnessMapUrl) : Promise.resolve(null),
    ]).then(([mapTex, normalTex, roughnessTex]) => {
      apply(mapTex ?? null, normalTex ?? null, roughnessTex ?? null);
      onMapsApplied?.();
    });
  } else {
    onMapsApplied?.();
  }
}

/**
 * Atribui o material a um mesh. Se o mesh tiver material array, substitui apenas os MeshStandardMaterial.
 */
export function assignMaterialToMesh(
  mesh: THREE.Mesh,
  material: StandardOrPhysical
): void {
  if (Array.isArray(mesh.material)) {
    const arr = mesh.material as THREE.Material[];
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] instanceof THREE.MeshStandardMaterial) {
        arr[i] = material;
        break;
      }
    }
    mesh.material = arr;
  } else {
    mesh.material = material;
  }
}
