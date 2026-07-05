import * as THREE from "three";
import type { RematePiece } from "../../../core/remate/rematePieceTypes";
import {
  computeLRemateCimaIntLocalOffsetMm,
  isLRematePiece,
  resolveLPrimarySlot,
  resolveLRemateRotation,
  REMATE_L_CIMA_INT_ROTATION,
} from "../../../core/remate/remateLGeometry";
import { resolveRematePoseLocal } from "../../../core/remate/remateMountFrame";
import { getRemateEnvelopeBoundsM } from "../../../core/remate/rematePlacement";
import type { RematePieceVisualBridge } from "./RematePieceVisualizer";

export function isLRemateCimaCompositeCandidate(
  piece: Pick<RematePiece, "productType" | "tipo" | "mountSlot" | "partIndex" | "parentGroupId">
): boolean {
  return isLRematePiece(piece) && resolveLPrimarySlot(piece) === "CIMA" && !!piece.parentGroupId;
}

export function resolveLRemateCimaLeadId(remateId: string, pieces: readonly RematePiece[]): string {
  const piece = pieces.find((p) => p.id === remateId);
  if (!piece || !isLRemateCimaCompositeCandidate(piece)) return remateId;
  const ext = pieces.find(
    (p) =>
      p.parentGroupId === piece.parentGroupId &&
      isLRematePiece(p) &&
      p.partIndex === 1 &&
      resolveLPrimarySlot(p) === "CIMA"
  );
  return ext?.id ?? remateId;
}

export function resolveRemateTransformRoot(object: THREE.Object3D | null | undefined): THREE.Object3D | null {
  if (!object) return null;
  let node: THREE.Object3D | null = object;
  while (node) {
    if (node.userData?.isRemateLComposite === true) return node;
    node = node.parent;
  }
  return object;
}

export function collectLRemateCimaGroups(
  pieces: readonly RematePiece[]
): Map<string, { ext: RematePiece; int: RematePiece }> {
  const partial = new Map<string, { ext?: RematePiece; int?: RematePiece }>();
  for (const piece of pieces) {
    if (!isLRemateCimaCompositeCandidate(piece) || !piece.parentGroupId) continue;
    const entry = partial.get(piece.parentGroupId) ?? {};
    if (piece.partIndex === 2) entry.int = piece;
    else entry.ext = piece;
    partial.set(piece.parentGroupId, entry);
  }
  const groups = new Map<string, { ext: RematePiece; int: RematePiece }>();
  for (const [groupId, entry] of partial.entries()) {
    if (entry.ext && entry.int) groups.set(groupId, { ext: entry.ext, int: entry.int });
  }
  return groups;
}

export function computeRematePieceWorldPose(
  piece: RematePiece,
  bridge: RematePieceVisualBridge | null
): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();

  if (piece.parentBoxId) {
    const cfg = bridge?.getBoxConfig(piece.parentBoxId);
    const worldMatrix = bridge?.getBoxWorldMatrix(piece.parentBoxId);
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
        position.copy(local);
        const boxQuat = new THREE.Quaternion().setFromRotationMatrix(worldMatrix);
        const partQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(pose.rotation.xRad, pose.rotation.yRad, pose.rotation.zRad)
        );
        quaternion.copy(boxQuat).multiply(partQuat);
        return { position, quaternion };
      }
      position.set(pose.position.xMm / 1000, pose.position.yMm / 1000, pose.position.zMm / 1000);
      quaternion.setFromEuler(new THREE.Euler(pose.rotation.xRad, pose.rotation.yRad, pose.rotation.zRad));
      return { position, quaternion };
    }
  }

  position.set(piece.position.xMm / 1000, piece.position.yMm / 1000, piece.position.zMm / 1000);
  quaternion.setFromEuler(
    new THREE.Euler(piece.rotation.xRad, piece.rotation.yRad, piece.rotation.zRad)
  );
  return { position, quaternion };
}

/** Posiciona o grupo no pivô (centro) da peça ext; int com offset local industrial fixo. */
export function layoutLRemateCimaComposite(
  group: THREE.Group,
  ext: RematePiece,
  _int: RematePiece,
  bridge: RematePieceVisualBridge | null
): void {
  const extPose = computeRematePieceWorldPose(ext, bridge);

  group.position.copy(extPose.position);
  group.quaternion.copy(extPose.quaternion);

  const extChild = group.children.find((c) => c.userData?.rematePartIndex === 1) as THREE.Mesh | undefined;
  const intChild = group.children.find((c) => c.userData?.rematePartIndex === 2) as THREE.Mesh | undefined;
  if (!extChild || !intChild) return;

  extChild.position.set(0, 0, 0);
  extChild.quaternion.identity();

  const localOffset = computeLRemateCimaIntLocalOffsetMm(ext);
  intChild.position.set(localOffset.xMm / 1000, localOffset.yMm / 1000, localOffset.zMm / 1000);
  intChild.quaternion.setFromEuler(
    new THREE.Euler(
      REMATE_L_CIMA_INT_ROTATION.xRad,
      REMATE_L_CIMA_INT_ROTATION.yRad,
      REMATE_L_CIMA_INT_ROTATION.zRad
    )
  );
}

export function applyRemateLCompositeUserData(
  group: THREE.Group,
  ext: RematePiece,
  int: RematePiece
): void {
  group.name = `remate-l-composite-${ext.parentGroupId ?? ext.id}`;
  group.userData.isRemateLComposite = true;
  group.userData.isRematePiece = true;
  group.userData.remateId = ext.id;
  group.userData.remateLeadRemateId = ext.id;
  group.userData.rematePartnerRemateId = int.id;
  group.userData.remateParentGroupId = ext.parentGroupId ?? null;
  group.userData.remateProductType = ext.productType ?? "L";
  group.userData.remateTipo = ext.tipo;
  group.userData.boxId = ext.parentBoxId ?? null;
  group.userData.remateDepthMm = ext.depth;
}

export function applyRemateLCompositeChildUserData(mesh: THREE.Mesh, piece: RematePiece): void {
  mesh.userData.isRemateLCompositeChild = true;
  mesh.userData.isRematePiece = true;
  mesh.userData.remateId = piece.id;
  mesh.userData.rematePartIndex = piece.partIndex;
  mesh.userData.remateParentGroupId = piece.parentGroupId ?? null;
  mesh.userData.remateProductType = piece.productType ?? "L";
  mesh.userData.remateTipo = piece.tipo;
  mesh.userData.boxId = piece.parentBoxId ?? null;
  mesh.userData.remateDepthMm = piece.depth;
  mesh.userData.panelType = "remate";
}

export function resolveRemateIdFromFinishHit(object: THREE.Object3D): string | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (node.userData?.isRemateLComposite === true) {
      const lead = node.userData.remateLeadRemateId ?? node.userData.remateId;
      return typeof lead === "string" && lead.length > 0 ? lead : null;
    }
    if (node.userData?.isRemateLCompositeChild === true && node.parent?.userData?.isRemateLComposite) {
      const lead = node.parent.userData.remateLeadRemateId ?? node.parent.userData.remateId;
      return typeof lead === "string" && lead.length > 0 ? lead : null;
    }
    const id = node.userData?.remateId;
    if (typeof id === "string" && id.length > 0) return id;
    node = node.parent;
  }
  return null;
}

export function listRemateIdsInSameLComposite(
  remateId: string,
  pieces: readonly RematePiece[]
): string[] {
  const piece = pieces.find((p) => p.id === remateId);
  if (!piece?.parentGroupId || !isLRemateCimaCompositeCandidate(piece)) return [remateId];
  return pieces
    .filter((p) => p.parentGroupId === piece.parentGroupId && isLRematePiece(p))
    .map((p) => p.id);
}

export { resolveLRemateRotation };
