import * as THREE from "three";
import type { RematePiece } from "../../../core/remate/rematePieceTypes";
import { getMaterialByIdOrLabel } from "../../../core/materials/service";
import type { RemateBoxMeta } from "../../../core/remate/remateDimensions";
import { computeRematePieceSnapForBox } from "../../../core/remate/rematePieceSnap";
import {
  computeRemateVisualMergeGroups,
  remateIdsInMergeGroup,
} from "../../../core/remate/remateVisualMerge";

export type RematePieceVisualBoxConfig = {
  boxId: string;
  widthM: number;
  heightM: number;
  depthM: number;
  box?: RemateBoxMeta;
};

export type RematePieceVisualBridge = {
  listRematePieces: () => RematePiece[];
  getBoxConfig: (_boxId: string) => RematePieceVisualBoxConfig | null;
  getBoxWorldMatrix: (_boxId: string) => THREE.Matrix4 | null;
};

const REMATE_RENDER_ORDER = 12;
const REMATE_OUTLINE_RENDER_ORDER = 13;

export class RematePieceVisualizer {
  private bridge: RematePieceVisualBridge | null = null;
  private readonly root = new THREE.Group();
  private readonly meshById = new Map<string, THREE.Mesh>();
  private readonly mergeGroupById = new Map<string, THREE.Mesh>();

  constructor() {
    this.root.name = "remate-visual-root";
    this.root.userData.isRemateVisualRoot = true;
  }

  getRoot(): THREE.Group {
    return this.root;
  }

  getMeshByRemateId(remateId: string): THREE.Mesh | undefined {
    return this.meshById.get(remateId);
  }

  bindBridge(bridge: RematePieceVisualBridge | null): void {
    this.bridge = bridge;
  }

  syncAll(): void {
    this.clearAll();
    if (!this.bridge) return;

    const remateList = this.bridge.listRematePieces();
    const mergeGroups = computeRemateVisualMergeGroups(remateList);
    const mergedIds = remateIdsInMergeGroup(mergeGroups);

    for (const piece of remateList) {
      const hideForMerge = mergedIds.has(piece.id);
      this.upsertMesh(piece, hideForMerge);
    }

    for (const group of mergeGroups) {
      if (group.remateIds.length < 2) continue;
      this.upsertMergeMesh(group, remateList);
    }
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

  private upsertMesh(piece: RematePiece, hidden: boolean): void {
    const w = Math.max(0.001, piece.width / 1000);
    const h = Math.max(0.001, piece.height / 1000);
    const d = Math.max(0.001, piece.depth / 1000);

    let mesh = this.meshById.get(piece.id);
    if (!mesh) {
      mesh = this.createMesh(piece, w, h, d);
      this.meshById.set(piece.id, mesh);
      this.root.add(mesh);
    } else {
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(w, h, d);
      this.applyMaterial(mesh, piece);
    }

    mesh.visible = !hidden;
    this.applyWorldTransform(mesh, piece);
  }

  private upsertMergeMesh(
    group: { id: string; remateIds: string[]; spanMm: number; faceKind: RematePiece["tipo"] },
    remates: RematePiece[]
  ): void {
    const parts = group.remateIds
      .map((id) => remates.find((r) => r.id === id))
      .filter((r): r is RematePiece => r != null);
    if (parts.length < 2) return;

    const ref = parts[0]!;
    const thicknessM = Math.min(ref.width, ref.height, ref.depth) / 1000;
    let mergeW = thicknessM;
    let mergeH = ref.height / 1000;
    let mergeD = ref.depth / 1000;

    if (ref.tipo === "RODAPE" || ref.tipo === "RODAPE_L") {
      mergeW = group.spanMm / 1000;
      mergeH = ref.height / 1000;
      mergeD = thicknessM;
    } else if (ref.tipo === "DIR" || ref.tipo === "ESQ") {
      mergeW = thicknessM;
      mergeH = parts.reduce((s, p) => s + p.height, 0) / 1000 / parts.length;
      mergeD = group.spanMm / 1000;
    } else {
      mergeW = group.spanMm / 1000;
      mergeH = thicknessM;
      mergeD = parts[0]!.depth / 1000;
    }

    let mesh = this.mergeGroupById.get(group.id);
    if (!mesh) {
      mesh = this.createMesh(ref, mergeW, mergeH, mergeD);
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
    this.applyWorldTransform(mesh, ref);
  }

  private createMesh(piece: RematePiece, w: number, h: number, d: number): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.buildMaterial(piece));
    mesh.name = `remate-piece-${piece.id}`;
    mesh.userData.isRematePiece = true;
    mesh.userData.remateId = piece.id;
    mesh.userData.boxId = piece.parentBoxId ?? null;
    mesh.userData.remateTipo = piece.tipo;
    mesh.userData.remateFaceKind = piece.tipo;
    mesh.userData.pieceId = piece.id;
    mesh.userData.panelType = "remate";
    mesh.userData.remateOutlineRenderOrder = REMATE_OUTLINE_RENDER_ORDER;
    mesh.renderOrder = REMATE_RENDER_ORDER;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private buildMaterial(piece: RematePiece): THREE.MeshStandardMaterial {
    const matRecord = getMaterialByIdOrLabel(piece.materialPresetId);
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(matRecord?.color ?? "#d9d9d9"),
      roughness: 0.65,
      metalness: piece.materialPresetId.toLowerCase().includes("alumin") ? 0.6 : 0,
    });
  }

  private applyMaterial(mesh: THREE.Mesh, piece: RematePiece): void {
    const prev = mesh.material;
    if (prev instanceof THREE.Material) prev.dispose();
    mesh.material = this.buildMaterial(piece);
  }

  private applyWorldTransform(mesh: THREE.Mesh, piece: RematePiece): void {
    if (piece.parentBoxId && piece.followBox) {
      const cfg = this.bridge?.getBoxConfig(piece.parentBoxId);
      const worldMatrix = this.bridge?.getBoxWorldMatrix(piece.parentBoxId);
      if (cfg && worldMatrix) {
        const snap = computeRematePieceSnapForBox(piece, cfg);
        const local = new THREE.Vector3(
          snap.position.xMm / 1000,
          snap.position.yMm / 1000,
          snap.position.zMm / 1000
        );
        local.applyMatrix4(worldMatrix);
        mesh.position.copy(local);
        const boxQuat = new THREE.Quaternion().setFromRotationMatrix(worldMatrix);
        const partQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(snap.rotation.xRad, snap.rotation.yRad, snap.rotation.zRad)
        );
        mesh.quaternion.copy(boxQuat).multiply(partQuat);
        return;
      }
    }

    if (piece.parentBoxId) {
      const worldMatrix = this.bridge?.getBoxWorldMatrix(piece.parentBoxId);
      if (worldMatrix) {
        const local = new THREE.Vector3(
          piece.position.xMm / 1000,
          piece.position.yMm / 1000,
          piece.position.zMm / 1000
        );
        local.applyMatrix4(worldMatrix);
        mesh.position.copy(local);
        const boxQuat = new THREE.Quaternion().setFromRotationMatrix(worldMatrix);
        const partQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(piece.rotation.xRad, piece.rotation.yRad, piece.rotation.zRad)
        );
        mesh.quaternion.copy(boxQuat).multiply(partQuat);
        return;
      }
    }

    mesh.position.set(piece.position.xMm / 1000, piece.position.yMm / 1000, piece.position.zMm / 1000);
    mesh.rotation.set(piece.rotation.xRad, piece.rotation.yRad, piece.rotation.zRad);
  }
}
