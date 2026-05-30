import * as THREE from "three";
import type { ProjectRemate } from "../../../core/remate/remateTypes";
import { getMaterialByIdOrLabel } from "../../../core/materials/service";

export type RemateVisualBoxConfig = {
  boxId: string;
  remates: ProjectRemate[];
};

export type RemateVisualBridge = {
  getBoxRemateConfig: (_boxId: string) => RemateVisualBoxConfig | null;
};

export class RemateVisualizer {
  private bridge: RemateVisualBridge | null = null;

  bindBridge(bridge: RemateVisualBridge | null): void {
    this.bridge = bridge;
  }

  syncBoxRoot(boxId: string, root: THREE.Object3D): void {
    this.clearRemates(root);
    const cfg = this.bridge?.getBoxRemateConfig(boxId);
    if (!cfg || cfg.remates.length === 0) return;

    const bounds = new THREE.Box3().setFromObject(root);
    const localBounds = bounds.clone();
    root.worldToLocal(localBounds.min);
    root.worldToLocal(localBounds.max);

    cfg.remates.forEach((remate) => this.addRemateMesh(root, localBounds, remate));
  }

  clearRemates(root: THREE.Object3D): void {
    const toRemove = root.children.filter((child) => child.userData?.isRematePiece === true);
    toRemove.forEach((child) => {
      root.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    });
  }

  dispose(): void {
    this.bridge = null;
  }

  private addRemateMesh(root: THREE.Object3D, bounds: THREE.Box3, remate: ProjectRemate): void {
    const w = Math.max(0.001, remate.dimensions.widthMm / 1000);
    const h = Math.max(0.001, remate.dimensions.heightMm / 1000);
    const d = Math.max(0.001, remate.dimensions.depthMm / 1000);
    const matRecord = getMaterialByIdOrLabel(remate.materialId);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(matRecord?.color ?? "#d9d9d9"),
      roughness: 0.65,
      metalness: remate.materialId.toLowerCase().includes("alumin") ? 0.6 : 0,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    const center = new THREE.Vector3();
    bounds.getCenter(center);

    if (remate.position === "dir") mesh.position.set(bounds.max.x + w / 2, center.y, center.z);
    else if (remate.position === "esq") mesh.position.set(bounds.min.x - w / 2, center.y, center.z);
    else if (remate.position === "cima") mesh.position.set(center.x, bounds.max.y + h / 2, center.z);
    else if (remate.position === "baixo") mesh.position.set(center.x, bounds.min.y - h / 2, center.z);
    else mesh.position.set(center.x, bounds.min.y + h / 2, bounds.max.z + d / 2);

    if (remate.transform) {
      mesh.position.x += (remate.transform.xMm ?? 0) / 1000;
      mesh.position.y += (remate.transform.yMm ?? 0) / 1000;
      mesh.position.z += (remate.transform.zMm ?? 0) / 1000;
      mesh.rotation.set(
        remate.transform.rotacaoXRad ?? 0,
        remate.transform.rotacaoYRad ?? 0,
        remate.transform.rotacaoZRad ?? 0
      );
    }

    mesh.userData.isRematePiece = true;
    mesh.userData.remateId = remate.id;
    mesh.userData.boxId = remate.parentBoxId;
    root.add(mesh);
  }
}
