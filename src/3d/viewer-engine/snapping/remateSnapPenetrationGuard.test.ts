import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { snapDeltaPenetratesBoxInterior } from "./remateSnapPenetrationGuard";

describe("remateSnapPenetrationGuard", () => {
  it("detecta penetração no volume interior da caixa", () => {
    const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.6));
    boxMesh.position.set(0, 1, 0);
    boxMesh.updateMatrixWorld(true);

    const remate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.02));
    remate.position.set(0, 1, 0);
    remate.updateMatrixWorld(true);

    const deltaIn = new THREE.Vector3(0, 0, -0.2);
    expect(
      snapDeltaPenetratesBoxInterior({
        mesh: remate,
        delta: deltaIn,
        boxMesh,
        widthM: 1,
        heightM: 2,
        depthM: 0.6,
      })
    ).toBe(true);

    const deltaOut = new THREE.Vector3(0, 0, 0.35);
    expect(
      snapDeltaPenetratesBoxInterior({
        mesh: remate,
        delta: deltaOut,
        boxMesh,
        widthM: 1,
        heightM: 2,
        depthM: 0.6,
      })
    ).toBe(false);
  });
});
