import * as THREE from "three";
import type { RematePiece } from "../../../core/remate/rematePieceTypes";
import { applyMaterialToMesh } from "../materials/MaterialEngine";
import type { RemateBoxMeta } from "../../../core/remate/remateDimensions";
import { remateGeometryExtentsM } from "../../../core/remate/remateGeometryExtents";
import { resolveRematePoseLocal } from "../../../core/remate/remateMountFrame";
import { getRemateEnvelopeBoundsM } from "../../../core/remate/rematePlacement";
import { isLRematePiece } from "../../../core/remate/remateLGeometry";

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

function isRodapeLikeRematePiece(piece: RematePiece): boolean {
  return piece.tipo === "RODAPE" || piece.tipo === "RODAPE_L";
}

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
    if (!this.bridge) {
      this.clearAll();
      return;
    }

    const remateList = this.bridge.listRematePieces().filter((piece) => !isRodapeLikeRematePiece(piece));
    const expectedIds = new Set(remateList.map((piece) => piece.id));

    // Cada remate permanece visível e clicável; rodapés pertencem ao RodapeVisualizer.
    for (const piece of remateList) {
      this.upsertMesh(piece, false);
    }
    this.removeStaleMeshes(this.meshById, expectedIds);
    this.removeStaleMeshes(this.mergeGroupById, new Set());

    // Merge visual reservado — método mantido para reativação futura sem perder lógica.
    void this.upsertMergeMesh;
  }

  clearBoxChildren(boxRoot: THREE.Object3D): void {
    const toRemove = boxRoot.children.filter((child) => child.userData?.isRematePiece === true);
    toRemove.forEach((child) => boxRoot.remove(child));
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

  private upsertMesh(piece: RematePiece, hidden: boolean): void {
    const { w, h, d } = remateGeometryExtentsM(piece);

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

  private removeStaleMeshes(map: Map<string, THREE.Mesh>, expectedIds: Set<string>): void {
    for (const [id, mesh] of map.entries()) {
      if (expectedIds.has(id)) continue;
      this.disposeMesh(mesh);
      map.delete(id);
    }
  }

  private disposeMeshes(map: Map<string, THREE.Mesh>): void {
    map.forEach((mesh) => this.disposeMesh(mesh));
  }

  private disposeMesh(mesh: THREE.Mesh): void {
    mesh.removeFromParent();
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
    else mesh.material.dispose();
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
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: "#f2f0eb" })
    );
    this.applyMaterialPreset(mesh, piece);
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

  private applyMaterialPreset(mesh: THREE.Mesh, piece: RematePiece): void {
    applyMaterialToMesh(mesh, piece.materialPresetId);
  }

  private applyMaterial(mesh: THREE.Mesh, piece: RematePiece): void {
    const prev = mesh.material;
    if (prev instanceof THREE.Material) prev.dispose();
    this.applyMaterialPreset(mesh, piece);
  }

  private applyWorldTransform(mesh: THREE.Mesh, piece: RematePiece): void {
    if (piece.parentBoxId) {
      const cfg = this.bridge?.getBoxConfig(piece.parentBoxId);
      const worldMatrix = this.bridge?.getBoxWorldMatrix(piece.parentBoxId);
      if (cfg) {
        const bounds = getRemateEnvelopeBoundsM(cfg.widthM, cfg.heightM, cfg.depthM, cfg.box ?? null);
        const pose = resolveRematePoseLocal(piece, bounds);
        if (worldMatrix) {
          const local = new THREE.Vector3(
            pose.position.xMm / 1000,
            pose.position.yMm / 1000,
            pose.position.zMm / 1000
          );
          local.applyMatrix4(worldMatrix);
          mesh.position.copy(local);
          const boxQuat = new THREE.Quaternion().setFromRotationMatrix(worldMatrix);
          if (isLRematePiece(piece)) {
            mesh.quaternion.copy(boxQuat);
          } else {
            const partQuat = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(pose.rotation.xRad, pose.rotation.yRad, pose.rotation.zRad)
            );
            mesh.quaternion.copy(boxQuat).multiply(partQuat);
          }
          return;
        }
        mesh.position.set(pose.position.xMm / 1000, pose.position.yMm / 1000, pose.position.zMm / 1000);
        if (isLRematePiece(piece)) {
          mesh.rotation.set(0, 0, 0);
        } else {
          mesh.rotation.set(pose.rotation.xRad, pose.rotation.yRad, pose.rotation.zRad);
        }
        return;
      }
    }

    mesh.position.set(piece.position.xMm / 1000, piece.position.yMm / 1000, piece.position.zMm / 1000);
    mesh.rotation.set(piece.rotation.xRad, piece.rotation.yRad, piece.rotation.zRad);
  }
}
