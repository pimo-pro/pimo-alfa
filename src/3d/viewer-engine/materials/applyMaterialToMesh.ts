/**
 * MaterialEngine — Aplica preset a um THREE.MeshStandardMaterial (cor, PBR, opcionalmente mapas).
 * performance: só cor + PBR. showcase/realistic: cor + PBR + map (e normalMap) quando existirem.
 */

import * as THREE from "three";
import type { MaterialPresetDefinition } from "./types";
import { loadTextureAsync } from "./textureCache";

/**
 * Aplica cor e PBR ao material (sempre).
 */
export function applyColorAndPBRToMaterial(
  mat: THREE.MeshStandardMaterial,
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
export function clearMapsFromMaterial(mat: THREE.MeshStandardMaterial): void {
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
  mat: THREE.MeshStandardMaterial,
  preset: MaterialPresetDefinition
): void {
  const repeat = preset.repeat ?? { x: 1, y: 1 };
  const rotationRad = ((preset.rotation ?? 0) * Math.PI) / 180;

  const apply = (mapTex: THREE.Texture | null, normalTex: THREE.Texture | null) => {
    if (mapTex) {
      mat.map = mapTex;
      mapTex.repeat.set(repeat.x, repeat.y);
      mapTex.rotation = rotationRad;
    }
    if (normalTex) {
      mat.normalMap = normalTex;
      normalTex.repeat.set(repeat.x, repeat.y);
      normalTex.rotation = rotationRad;
    }
    mat.needsUpdate = true;
  };

  if (preset.textureUrl || preset.normalMapUrl) {
    Promise.all([
      preset.textureUrl ? loadTextureAsync(preset.textureUrl) : Promise.resolve(null),
      preset.normalMapUrl ? loadTextureAsync(preset.normalMapUrl) : Promise.resolve(null),
    ]).then(([mapTex, normalTex]) => {
      apply(mapTex ?? null, normalTex ?? null);
    });
  }
}

/**
 * Atribui o material a um mesh. Se o mesh tiver material array, substitui apenas os MeshStandardMaterial.
 */
export function assignMaterialToMesh(
  mesh: THREE.Mesh,
  material: THREE.MeshStandardMaterial
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
