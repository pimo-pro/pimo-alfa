import * as THREE from "three";
import type { ProjectHemati } from "../../../core/hemati/hematiTypes";
import { getMaterialByIdOrLabel } from "../../../core/materials/service";
import { computeHematiPlacementLocal, getStructuralBoundsM } from "../../../core/hemati/hematiPlacement";
import { computeHematiVisualMergeGroups, hematiIdsInMergeGroup } from "../../../core/hemati/hematiMerge";

export type HematiVisualBoxConfig = {
  boxId: string;
  widthM: number;
  heightM: number;
  depthM: number;
  hematis: ProjectHemati[];
};

export type HematiVisualBridge = {
  getBoxHematiConfig: (_boxId: string) => HematiVisualBoxConfig | null;
  getBoxWorldMatrix: (_boxId: string) => THREE.Matrix4 | null;
  listBoxHematiConfigs: () => HematiVisualBoxConfig[];
};

const RENDER_ORDER = 13;

export class HematiVisualizer {
  private bridge: HematiVisualBridge | null = null;
  private readonly root = new THREE.Group();
  private readonly meshById = new Map<string, THREE.Mesh>();
  private readonly mergeGroupById = new Map<string, THREE.Mesh>();

  constructor() {
    this.root.name = "hemati-visual-root";
  }

  getRoot(): THREE.Group {
    return this.root;
  }

  getMeshByHematiId(hematiId: string): THREE.Mesh | undefined {
    return this.meshById.get(hematiId);
  }

  bindBridge(bridge: HematiVisualBridge | null): void {
    this.bridge = bridge;
  }

  syncAll(): void {
    this.clearAll();
    if (!this.bridge) return;

    const configs = this.bridge.listBoxHematiConfigs();
    const boxConfigs = new Map<string, HematiVisualBoxConfig>();
    const list: ProjectHemati[] = [];
    for (const cfg of configs) {
      boxConfigs.set(cfg.boxId, cfg);
      list.push(...cfg.hematis.filter((h) => h.visible !== false));
    }

    const mergeGroups = computeHematiVisualMergeGroups(list);
    const mergedIds = hematiIdsInMergeGroup(mergeGroups);

    for (const hemati of list) {
      const cfg = boxConfigs.get(hemati.parentBoxId);
      if (!cfg) continue;
      this.upsertMesh(hemati, cfg, mergedIds.has(hemati.id));
    }

    for (const group of mergeGroups) {
      if (group.hematiIds.length < 2) continue;
      this.upsertMergeMesh(group, list, boxConfigs);
    }
  }

  clearAll(): void {
    this.disposeMeshes(this.mergeGroupById);
    this.mergeGroupById.clear();
    this.disposeMeshes(this.meshById);
    this.meshById.clear();
  }

  dispose(): void {
    this.clearAll();
    this.bridge = null;
  }

  private disposeMeshes(map: Map<string, THREE.Mesh>): void {
    map.forEach((mesh) => {
      this.root.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
      else mesh.material.dispose();
    });
  }

  private upsertMesh(hemati: ProjectHemati, cfg: HematiVisualBoxConfig, hidden: boolean): void {
    const w = Math.max(0.001, hemati.dimensions.widthMm / 1000);
    const h = Math.max(0.001, hemati.dimensions.heightMm / 1000);
    const d = Math.max(0.001, hemati.dimensions.depthMm / 1000);

    let mesh = this.meshById.get(hemati.id);
    if (!mesh) {
      mesh = this.createMesh(hemati, w, h, d);
      this.meshById.set(hemati.id, mesh);
      this.root.add(mesh);
    } else {
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(w, h, d);
      this.applyMaterial(mesh, hemati);
    }

    mesh.visible = !hidden;
    if (!hemati.placementFree) this.applyInitialPlacement(mesh, hemati, cfg);
    else if (hemati.transform) this.applyTransform(mesh, hemati, cfg.boxId);
  }

  private upsertMergeMesh(
    group: { id: string; hematiIds: string[]; spanMm: number; kind: ProjectHemati["kind"] },
    hematis: ProjectHemati[],
    boxConfigs: Map<string, HematiVisualBoxConfig>
  ): void {
    const parts = group.hematiIds
      .map((id) => hematis.find((h) => h.id === id))
      .filter((h): h is ProjectHemati => h != null);
    if (parts.length < 2) return;
    const ref = parts[0]!;
    const cfg = boxConfigs.get(ref.parentBoxId);
    if (!cfg) return;

    const t = Math.max(0.001, ref.thicknessMm / 1000);
    let mergeW = group.spanMm / 1000;
    let mergeH = ref.dimensions.heightMm / 1000;
    let mergeD = t;
    if (ref.kind === "DIR" || ref.kind === "ESQ") {
      mergeW = t;
      mergeH = ref.dimensions.heightMm / 1000;
      mergeD = group.spanMm / 1000;
    } else if (ref.kind === "CIMA" || ref.kind === "BAIXO" || ref.kind === "FULL") {
      mergeW = group.spanMm / 1000;
      mergeH = t;
      mergeD = ref.dimensions.depthMm / 1000;
    }

    let mesh = this.mergeGroupById.get(group.id);
    if (!mesh) {
      mesh = this.createMesh(ref, mergeW, mergeH, mergeD);
      mesh.name = `hemati-merge-${group.id}`;
      mesh.userData.isHematiMergeVisual = true;
      this.mergeGroupById.set(group.id, mesh);
      this.root.add(mesh);
    } else {
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(mergeW, mergeH, mergeD);
    }
    mesh.renderOrder = RENDER_ORDER + 1;
    if (!ref.placementFree) this.applyInitialPlacement(mesh, ref, cfg);
  }

  private createMesh(hemati: ProjectHemati, w: number, h: number, d: number): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.buildMaterial(hemati));
    mesh.name = `hemati-${hemati.id}`;
    mesh.userData.isHematiPiece = true;
    mesh.userData.hematiId = hemati.id;
    mesh.userData.boxId = hemati.parentBoxId;
    mesh.userData.pieceId = hemati.id;
    mesh.userData.panelType = "hemati";
    mesh.renderOrder = RENDER_ORDER;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private buildMaterial(hemati: ProjectHemati): THREE.MeshStandardMaterial {
    const matRecord = getMaterialByIdOrLabel(hemati.materialId);
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(matRecord?.color ?? "#e8e0d8"),
      roughness: 0.6,
      metalness: hemati.materialId.toLowerCase().includes("alumin") ? 0.55 : 0.05,
    });
  }

  private applyMaterial(mesh: THREE.Mesh, hemati: ProjectHemati): void {
    const prev = mesh.material;
    if (prev instanceof THREE.Material) prev.dispose();
    mesh.material = this.buildMaterial(hemati);
  }

  private applyInitialPlacement(mesh: THREE.Mesh, hemati: ProjectHemati, cfg: HematiVisualBoxConfig): void {
    const bounds = getStructuralBoundsM(cfg.widthM, cfg.heightM, cfg.depthM);
    const local = computeHematiPlacementLocal(hemati, bounds);
    this.applyLocalToWorld(mesh, local, cfg.boxId);
  }

  private applyTransform(mesh: THREE.Mesh, hemati: ProjectHemati, boxId: string): void {
    const t = hemati.transform;
    if (!t) return;
    const worldMatrix = this.bridge?.getBoxWorldMatrix(boxId);
    if (worldMatrix && t.xMm != null && t.yMm != null && t.zMm != null) {
      const local = new THREE.Vector3(t.xMm / 1000, t.yMm / 1000, t.zMm / 1000);
      local.applyMatrix4(worldMatrix);
      mesh.position.copy(local);
    }
    mesh.rotation.set(t.rotacaoXRad ?? 0, t.rotacaoYRad ?? 0, t.rotacaoZRad ?? 0);
  }

  private applyLocalToWorld(
    mesh: THREE.Mesh,
    local: { position: [number, number, number]; rotation: [number, number, number] },
    boxId: string
  ): void {
    const worldMatrix = this.bridge?.getBoxWorldMatrix(boxId);
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
}
