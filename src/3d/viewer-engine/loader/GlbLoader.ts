/**
 * Orquestração do carregamento de modelos GLB/OBJ/STL e associação a uma caixa no viewer.
 * O Viewer continua a fornecer loadModelObject e getModelExtension; este módulo centraliza a lógica de add.
 */

import type * as THREE from "three";
import type { ViewerBoxEntry } from "../types";

export interface GlbLoaderAddOptions {
  getEntry: (_boxId: string) => ViewerBoxEntry | undefined;
  loadModelObject: (_path: string, _extension: string) => Promise<THREE.Object3D>;
  getModelExtension: (_path: string) => string | null;
  getNextModelId: () => string;
  onModelLoaded?: (_boxId: string, _modelId: string, _object: THREE.Object3D) => void;
}

/**
 * Carrega um modelo e adiciona à caixa (entry.mesh, entry.cadModels).
 * Não altera a cena diretamente; o caller garante que entry.mesh já está na cena.
 * Escala e pivot para catálogo/cadOnly ficam a cargo do Viewer (applyCatalogModelScale, centerObjectInGroup).
 */
export async function addModelToBox(
  options: GlbLoaderAddOptions,
  boxId: string,
  modelPath: string,
  modelId?: string
): Promise<boolean> {
  const { getEntry, loadModelObject, getModelExtension, getNextModelId, onModelLoaded } = options;
  const entry = getEntry(boxId);
  if (!entry || !modelPath || typeof modelPath !== "string") return false;
  const extension = getModelExtension(modelPath);
  if (!extension) return false;
  const id = modelId ?? getNextModelId();
  if (entry.cadModels.some((m) => m.id === id)) return false;

  try {
    const object = await loadModelObject(modelPath, extension);
    entry.mesh.add(object);
    object.traverse((child: THREE.Object3D) => {
      child.userData.boxId = boxId;
    });
    entry.cadModels.push({ id, object, path: modelPath });
    onModelLoaded?.(boxId, id, object);
    return true;
  } catch {
    return false;
  }
}
