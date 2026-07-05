import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  allowedRemateLPartnerOverlapM,
  computeBoxInteriorWorldBox,
  isRemateLPartnerPair,
  resolveFinishMeshOverlaps,
} from "./finishCollision";

function tagRemateLMesh(
  mesh: THREE.Mesh,
  partIndex: 1 | 2,
  groupId: string,
  depthMm = 19
): void {
  mesh.userData.isRematePiece = true;
  mesh.userData.remateProductType = "L";
  mesh.userData.remateTipo = "L";
  mesh.userData.rematePartIndex = partIndex;
  mesh.userData.remateParentGroupId = groupId;
  mesh.userData.remateDepthMm = depthMm;
}

describe("finishCollision — Remate L lock", () => {
  it("isRemateLPartnerPair só aceita ext/int do mesmo grupo", () => {
    const ext = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 0.019));
    const int = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.019));
    tagRemateLMesh(ext, 1, "g1");
    tagRemateLMesh(int, 2, "g1");
    expect(isRemateLPartnerPair(ext, int)).toBe(true);
    expect(isRemateLPartnerPair(ext, ext)).toBe(false);
    tagRemateLMesh(int, 2, "g2");
    expect(isRemateLPartnerPair(ext, int)).toBe(false);
  });

  it("allowedRemateLPartnerOverlapM usa espessura mínima das duas peças", () => {
    const ext = new THREE.Mesh();
    const int = new THREE.Mesh();
    tagRemateLMesh(ext, 1, "g1", 19);
    tagRemateLMesh(int, 2, "g1", 19);
    expect(allowedRemateLPartnerOverlapM(ext, int)).toBeCloseTo(0.019);
  });

  it("permite overlap até espessura entre REMATE_L_ext e REMATE_L_int", () => {
    const ext = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 0.019));
    const int = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.019));
    tagRemateLMesh(ext, 1, "g1");
    tagRemateLMesh(int, 2, "g1");
    ext.position.set(0, 0, 0);
    int.position.set(0, 0.355, 0);
    const intStartZ = int.position.z;

    resolveFinishMeshOverlaps({
      movingMesh: int,
      boxes: new Map(),
      otherMeshes: [ext],
    });

    expect(int.position.z).toBeCloseTo(intStartZ, 4);
  });

  it("impede Remate L de penetrar volume interior da caixa pai", () => {
    const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.72, 0.6));
    boxMesh.position.set(0, 0.36, 0);

    const remate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.019));
    tagRemateLMesh(remate, 1, "g1");
    remate.position.set(0, 0.4, 0);

    resolveFinishMeshOverlaps({
      movingMesh: remate,
      boxes: new Map(),
      otherMeshes: [],
      parentBox: { boxId: "box-1", mesh: boxMesh, width: 0.9, height: 0.72, depth: 0.6 },
    });

    const inner = computeBoxInteriorWorldBox(boxMesh, 0.9, 0.72, 0.6);
    remate.updateMatrixWorld(true);
    const remateBox = new THREE.Box3().setFromObject(remate);
    expect(remateBox.intersectsBox(inner)).toBe(false);
  });
});
