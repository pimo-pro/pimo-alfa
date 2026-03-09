/**
 * MaterialEngine — Núcleo do sistema de materiais realistas.
 * Presets por modo (performance, showcase, realistic); cache de texturas; ligação com ViewerCore.
 */

import * as THREE from "three";
import type { MaterialMode, MaterialPresetDefinition, LoadedMaterialResult } from "./types";
import { getPreset, getDefaultPreset } from "./presetRegistry";
import { getSceneMaterialConfig as getSceneConfig } from "./sceneMaterialConfig";
import { createWoodMaterial } from "../../materials/WoodMaterial";
import {
  clearMapsFromMaterial,
  applyMapsToMaterialAsync,
  assignMaterialToMesh,
} from "./applyMaterialToMesh";

/** Modo global (default: performance para manter comportamento atual). */
let currentMode: MaterialMode = "performance";

export function getMaterialMode(): MaterialMode {
  return currentMode;
}

export function setMaterialMode(mode: MaterialMode): void {
  currentMode = mode;
}

/**
 * Devolve o preset normalizado por materialId (resolve aliases via materials.api).
 */
export function loadPreset(materialId: string): MaterialPresetDefinition | null {
  return getPreset(materialId);
}

/**
 * Constrói um THREE.MeshStandardMaterial a partir do preset e modo.
 * performance: só cor + PBR (delega em createWoodMaterial).
 * showcase/realistic: cor + PBR + map/normalMap quando existirem no preset.
 */
export function buildThreeMaterial(
  preset: MaterialPresetDefinition,
  mode: MaterialMode
): LoadedMaterialResult {
  const options = {
    color: preset.baseColor,
    roughness: preset.roughness,
    metalness: preset.metalness,
    envMapIntensity: preset.envMapIntensity ?? 0.4,
  };
  const { material, textures } = createWoodMaterial({}, options);

  if (mode !== "performance" && (preset.textureUrl || preset.normalMapUrl)) {
    applyMapsToMaterialAsync(material, preset);
  } else {
    clearMapsFromMaterial(material);
  }

  return {
    material,
    textures,
    loadDetailMaps: () => Promise.resolve(),
    areDetailMapsLoaded: () => true,
  };
}

/**
 * Carrega material para uma caixa (compatível com LoadedWoodMaterial do ViewerCore).
 * Usa materialId e modo atual; fallback para mdf_branco.
 */
export function loadMaterial(
  materialId: string,
  mode: MaterialMode = currentMode
): LoadedMaterialResult | null {
  const preset = getPreset(materialId) ?? getDefaultPreset();
  return buildThreeMaterial(preset, mode);
}

/**
 * Aplica material a um mesh: resolve preset, constrói material, atribui ao mesh.
 */
export function applyMaterialToMesh(
  mesh: THREE.Mesh,
  materialId: string,
  mode: MaterialMode = currentMode
): void {
  const preset = getPreset(materialId) ?? getDefaultPreset();
  const result = buildThreeMaterial(preset, mode);
  assignMaterialToMesh(mesh, result.material);
}

/**
 * Reaplica materiais a todos os meshes da cena que tenham userData.boxId (caixas).
 * Útil ao trocar de modo; percorre root e atualiza apenas meshes de caixas (precisa do mapa boxId → materialId).
 * Esta versão não altera nada; a reaplicação real será feita pelo ViewerCore que tem o mapa id → materialName.
 */
export function reapplyAllMaterials(
  _scene: THREE.Scene,
  _mode: MaterialMode
): void {
  currentMode = _mode;
  // ViewerCore deve chamar updateBoxMaterial para cada caixa quando o modo mudar.
}

/**
 * Configuração unificada de materiais de cena (paredes, chão, room box, ground).
 */
export function getSceneMaterialConfig() {
  return getSceneConfig();
}
