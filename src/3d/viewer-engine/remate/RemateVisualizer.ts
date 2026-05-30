import * as THREE from "three";
import type { ProjectRemate } from "../../../core/remate/remateTypes";
import { getMaterialByIdOrLabel } from "../../../core/materials/service";
import {
  computeRematePlacementLocal,
  getStructuralBoundsM,
} from "../../../core/remate/rematePlacement";
import {
  computeRemateVisualMergeGroups,
  remateIdsInMergeGroup,
} from "../../../core/remate/remateVisualMerge";

export type RemateVisualBoxConfig = {
  boxId: string;
  widthM: number;
  heightM: number;
  depthM: number;
  remates: ProjectRemate[];
};

export type RemateVisualBridge = {
  getBoxRemateConfig: (_boxId: string) => RemateVisualBoxConfig | null;
  getBoxWorldMatrix: (_boxId: string) => THREE.Matrix4 | null;
  /** Lista de boxes com remates para sync global. */
  listBoxRemateConfigs: () => RemateVisualBoxConfig[];
};

const REMATE_RENDER_ORDER = 12;

export class RemateVisualizer {
  private bridge: RemateVisualBridge | null = null;
  private readonly root = new THREE.Group();
  private readonly meshById = new Map<string, THREE.Mesh>();
  private readonly mergeGroupById = new Map<string, THREE.Mesh>();

  constructor() {
    this.root.name = "remate-visual-root";
  }

  getRoot(): THREE.Group {
    return this.root;
  }

  getMeshByRemateId(remateId: string): THREE.Mesh | undefined {
    return this.meshById.get(remateId);
  }

  bindBridge(bridge: RemateVisualBridge | null): void {
    this.bridge = bridge;
  }

  /** Sincroniza todos os remates no grupo de cena (independente dos boxes). */
  syncAll(): void {
    this.clearAll();
    if (!this.bridge) return;

    const configs = this.bridge.listBoxRemateConfigs();
    const boxConfigs = new Map<string, RemateVisualBoxConfig>();
    const remateList: ProjectRemate[] = [];
    for (const cfg of configs) {
      boxConfigs.set(cfg.boxId, cfg);
      remateList.push(...cfg.remates);
    }

    const mergeGroups = computeRemateVisualMergeGroups(remateList);
    const mergedIds = remateIdsInMergeGroup(mergeGroups);

    for (const remate of remateList) {
      const cfg = boxConfigs.get(remate.parentBoxId);
      if (!cfg) continue;
      const hideForMerge = mergedIds.has(remate.id);
      this.upsertRemateMesh(remate, cfg, hideForMerge);
    }

    for (const group of mergeGroups) {
      if (group.remateIds.length < 2) continue;
      this.upsertMergeMesh(group, remateList, boxConfigs);
    }
  }

  /** @deprecated Mantido por compatibilidade — delega para syncAll. */
  syncBoxRoot(_boxId: string, _root: THREE.Object3D): void {
    this.clearBoxChildren(_root);
    this.syncAll();
  }

  clearBoxChildren(boxRoot: THREE.Object3D): void {
    const toRemove = boxRoot.children.filter((child) => child.userData?.isRematePiece === true);
    toRemove.forEach((child) => boxRoot.remove(child));
  }

  clearAll(): void {
    this.mergeGroupById.forEach((mesh) => {
      this.root.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
      else mesh.material.dispose();
    });
    this.mergeGroupById.clear();

    this.meshById.forEach((mesh) => {
      this.root.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
      else mesh.material.dispose();
    });
    this.meshById.clear();
  }

  dispose(): void {
    this.clearAll();
    this.bridge = null;
  }

  private upsertRemateMesh(remate: ProjectRemate, cfg: RemateVisualBoxConfig, hidden: boolean): void {
    const existing = this.meshById.get(remate.id);
    const w = Math.max(0.001, remate.dimensions.widthMm / 1000);
    const h = Math.max(0.001, remate.dimensions.heightMm / 1000);
    const d = Math.max(0.001, remate.dimensions.depthMm / 1000);

    let mesh = existing;
    if (!mesh) {
      mesh = this.createRemateMesh(remate, w, h, d);
      this.meshById.set(remate.id, mesh);
      this.root.add(mesh);
    } else {
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(w, h, d);
      this.applyMaterial(mesh, remate);
    }

    mesh.visible = !hidden;
    mesh.userData.mergedVisualGroupId = remate.mergedVisualGroupId ?? null;

    if (!remate.placementFree) {
      this.applyInitialPlacement(mesh, remate, cfg);
    } else if (remate.transform) {
      this.applyTransform(mesh, remate, cfg.boxId);
    }
  }

  private upsertMergeMesh(
    group: { id: string; remateIds: string[]; spanMm: number; faceKind: ProjectRemate["faceKind"] },
    remates: ProjectRemate[],
    boxConfigs: Map<string, RemateVisualBoxConfig>
  ): void {
    const parts = group.remateIds
      .map((id) => remates.find((r) => r.id === id))
      .filter((r): r is ProjectRemate => r != null);
    if (parts.length < 2) return;

    const ref = parts[0]!;
    const cfg = boxConfigs.get(ref.parentBoxId);
    if (!cfg) return;

    const thicknessM = Math.max(0.001, ref.thicknessMm / 1000);
    let mergeW = thicknessM;
    let mergeH = ref.dimensions.heightMm / 1000;
    let mergeD = ref.dimensions.depthMm / 1000;

    if (ref.faceKind === "RODAPE" || ref.position === "rodape") {
      mergeW = group.spanMm / 1000;
      mergeH = ref.dimensions.heightMm / 1000;
      mergeD = thicknessM;
    } else if (ref.position === "dir" || ref.position === "esq") {
      mergeW = thicknessM;
      mergeH = parts.reduce((s, p) => s + p.dimensions.heightMm, 0) / 1000 / parts.length;
      mergeD = group.spanMm / 1000;
    } else {
      mergeW = group.spanMm / 1000;
      mergeH = thicknessM;
      mergeD = parts[0]!.dimensions.depthMm / 1000;
    }

    let mesh = this.mergeGroupById.get(group.id);
    if (!mesh) {
      mesh = this.createRemateMesh(ref, mergeW, mergeH, mergeD);
      mesh.name = `remate-merge-${group.id}`;
      mesh.userData.isRemateMergeVisual = true;
      mesh.userData.mergeGroupId = group.id;
      this.mergeGroupById.set(group.id, mesh);
      this.root.add(mesh);
    } else {
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(mergeW, mergeH, mergeD);
    }

    mesh.visible = true;
    mesh.renderOrder = REMATE_RENDER_ORDER + 1;
    if (!ref.placementFree) {
      this.applyInitialPlacement(mesh, ref, cfg);
    }
  }

  private createRemateMesh(remate: ProjectRemate, w: number, h: number, d: number): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.buildMaterial(remate));
    mesh.name = `remate-${remate.id}`;
    mesh.userData.isRematePiece = true;
    mesh.userData.remateId = remate.id;
    mesh.userData.boxId = remate.parentBoxId;
    mesh.userData.remateFaceKind = remate.faceKind;
    mesh.userData.pieceId = remate.id;
    mesh.userData.panelType = "remate";
    mesh.renderOrder = REMATE_RENDER_ORDER;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private buildMaterial(remate: ProjectRemate): THREE.MeshStandardMaterial {
    const matRecord = getMaterialByIdOrLabel(remate.materialId);
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(matRecord?.color ?? "#d9d9d9"),
      roughness: 0.65,
      metalness: remate.materialId.toLowerCase().includes("alumin") ? 0.6 : 0,
    });
  }

  private applyMaterial(mesh: THREE.Mesh, remate: ProjectRemate): void {
    const prev = mesh.material;
    if (prev instanceof THREE.Material) prev.dispose();
    mesh.material = this.buildMaterial(remate);
  }

  private applyInitialPlacement(mesh: THREE.Mesh, remate: ProjectRemate, cfg: RemateVisualBoxConfig): void {
    const bounds = getStructuralBoundsM(cfg.widthM, cfg.heightM, cfg.depthM);
    const local = computeRematePlacementLocal(remate, bounds);
    const worldMatrix = this.bridge?.getBoxWorldMatrix(cfg.boxId);
    if (!worldMatrix) {
      mesh.position.set(...local.position);
      mesh.rotation.set(...local.rotation);
      return;
    }
    const pos = new THREE.Vector3(...local.position);
    pos.applyMatrix4(worldMatrix);
    mesh.position.copy(pos);
    const quat = new THREE.Quaternion().setFromRotationMatrix(worldMatrix);
    const partQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(local.rotation[0], local.rotation[1], local.rotation[2])
    );
    mesh.quaternion.copy(quat).multiply(partQuat);
  }

  private applyTransform(mesh: THREE.Mesh, remate: ProjectRemate, boxId: string): void {
    const t = remate.transform;
    if (!t) return;
    const worldMatrix = this.bridge?.getBoxWorldMatrix(boxId);
    if (worldMatrix && t.xMm != null && t.yMm != null && t.zMm != null) {
      const local = new THREE.Vector3(t.xMm / 1000, t.yMm / 1000, t.zMm / 1000);
      local.applyMatrix4(worldMatrix);
      mesh.position.copy(local);
    }
    mesh.rotation.set(t.rotacaoXRad ?? 0, t.rotacaoYRad ?? 0, t.rotacaoZRad ?? 0);
  }
}
