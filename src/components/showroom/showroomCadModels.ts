/**
 * Carregamento de modelos GLB/CAD e fallback por peças extraídas no showroom.
 */

import * as THREE from "three";
import type { ProjectState } from "../../context/projectTypes";
import type { CutListItemComPreco, WorkspaceBox } from "../../core/types";
import { loadGLB } from "../../core/glb/glbLoader";
import { isPiBaseCabinetId } from "../../data/moveisUnificados/pi/models";
import { mmToM } from "../../utils/units";

export function isShowroomCadOnlyBox(wsBox: WorkspaceBox): boolean {
  return (
    !isPiBaseCabinetId(wsBox.baseCabinetId) &&
    (wsBox.models?.length ?? 0) > 0 &&
    wsBox.prateleiras === 0 &&
    wsBox.gavetas === 0
  );
}

/** Resolve path do GLB a partir do modelId persistido no projecto. */
export function resolveShowroomModelPath(modelId: string): string | null {
  const id = modelId?.trim();
  if (!id) return null;
  if (/^(data:|https?:|\/|blob:)/i.test(id)) return id;
  if (/\.(glb|gltf|obj|stl)$/i.test(id)) return id.startsWith("/") ? id : `/${id}`;
  if (id.startsWith("catalog:")) return `/models/cad/${id.slice("catalog:".length)}.glb`;
  return `/models/cad/${id}.glb`;
}

function getModelExtension(path: string): string | null {
  const lower = path.toLowerCase();
  if (lower.startsWith("data:")) {
    if (lower.includes("gltf-binary") || lower.includes("model/gltf")) return "glb";
    if (lower.includes("model/gltf+json")) return "gltf";
    return null;
  }
  const match = lower.match(/\.(glb|gltf|obj|stl)$/);
  return match ? match[1] : null;
}

function centerObjectInGroup(object: THREE.Object3D): void {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  object.position.x = -center.x;
  object.position.z = -center.z;
  object.position.y = size.y / 2;
}

function applyCatalogModelScale(
  wsBox: WorkspaceBox,
  object: THREE.Object3D
): void {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const base = {
    x: Math.max(size.x, 0.001),
    y: Math.max(size.y, 0.001),
    z: Math.max(size.z, 0.001),
  };
  const targetW = mmToM(wsBox.dimensoes?.largura ?? 600);
  const targetH = mmToM(wsBox.dimensoes?.altura ?? 720);
  const targetD = mmToM(wsBox.dimensoes?.profundidade ?? 560);
  object.scale.set(targetW / base.x, targetH / base.y, targetD / base.z);
  centerObjectInGroup(object);
}

function buildExtractedPartsGroup(
  boxId: string,
  parts: CutListItemComPreco[],
  boxHeightM: number
): THREE.Group {
  const root = new THREE.Group();
  root.name = `showroom-extracted-${boxId}`;
  const material = new THREE.MeshStandardMaterial({
    color: "#8a9bb8",
    metalness: 0.18,
    roughness: 0.52,
  });

  parts.forEach((part, index) => {
    const w = Math.max(0.001, mmToM(part.dimensoes?.largura ?? 50));
    const h = Math.max(0.001, mmToM(part.dimensoes?.altura ?? 50));
    const d = Math.max(0.001, mmToM(part.dimensoes?.profundidade ?? 19));
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material.clone());
    mesh.name = `showroom-extracted-part-${part.id}`;
    mesh.position.set(0, boxHeightM * 0.5, index * 0.002);
    mesh.userData.showroomExtractedPart = true;
    root.add(mesh);
  });

  return root;
}

function flattenExtractedParts(
  project: ProjectState,
  boxId: string
): CutListItemComPreco[] {
  const byInstance = project.extractedPartsByBoxId?.[boxId];
  if (!byInstance) return [];
  return Object.values(byInstance).flat();
}

export async function attachShowroomCadContent(
  project: ProjectState,
  wsBox: WorkspaceBox,
  boxWrap: THREE.Object3D
): Promise<void> {
  const toRemove = boxWrap.children.filter(
    (child) =>
      child.userData.showroomCadFallback === true ||
      child.userData.showroomCadContent === true ||
      child.name.startsWith("showroom-extracted-") ||
      child.name.startsWith("showroom-glb-")
  );
  toRemove.forEach((child) => {
    boxWrap.remove(child);
    disposeObject3D(child);
  });

  const boxHeightM = mmToM(wsBox.dimensoes?.altura ?? 720);
  const models = wsBox.models ?? [];
  let loadedAny = false;

  for (const instance of models) {
    const path = resolveShowroomModelPath(instance.modelId);
    if (!path || !getModelExtension(path)) continue;
    try {
      const object = await loadGLB(path);
      object.name = `showroom-glb-${instance.id}`;
      object.userData.showroomCadContent = true;
      object.userData.boxId = wsBox.id;
      applyCatalogModelScale(wsBox, object);
      boxWrap.add(object);
      loadedAny = true;
    } catch {
      // tenta próximo modelo ou fallback
    }
  }

  if (loadedAny) return;

  const extracted = flattenExtractedParts(project, wsBox.id).filter(
    (p) => p.sourceType === "glb_importado" || (wsBox.models?.length ?? 0) > 0
  );
  if (extracted.length > 0) {
    const group = buildExtractedPartsGroup(wsBox.id, extracted, boxHeightM);
    group.userData.showroomCadContent = true;
    boxWrap.add(group);
  }
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const m = child.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose?.());
      else (m as THREE.Material | undefined)?.dispose?.();
    }
  });
}
