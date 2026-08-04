/**
 * Industrial: sem pelêcula drawer-click-* na frente das gavetas.
 * Frente real (drawerPart=front) permanece click-target de picking.
 */
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createDrawerObject, type DrawerSpec } from "../3d/objects/DrawerFactory";
import { isDrawerClickTargetGhost } from "../3d/viewer-engine/materials/boxMaterialHelpers";
import { isDrawerClickTarget } from "../core/drawers/drawerMeshIdentity";

function minimalDrawerSpec(id = "d1"): DrawerSpec {
  return {
    id,
    type: "drawer",
    x: 0,
    y: 0,
    z: 0,
    widthM: 0.6,
    heightM: 0.2,
    depthM: 0.5,
    frontThicknessM: 0.019,
    bodyWidthM: 0.55,
    bodyHeightM: 0.15,
    bodyDepthM: 0.48,
    leftSideWidthM: 0.016,
    leftSideHeightM: 0.15,
    leftSideDepthM: 0.48,
    rightSideWidthM: 0.016,
    rightSideHeightM: 0.15,
    rightSideDepthM: 0.48,
    backWidthM: 0.518,
    backHeightM: 0.127,
    backThicknessM: 0.016,
    bottomWidthM: 0.534,
    bottomDepthM: 0.5,
    bottomThicknessM: 0.01,
    isOpen: false,
    pullDistanceM: 0.3,
    rotY: 0,
    handleType: "Nenhum",
  };
}

describe("drawer click-target ghost (pelêcula)", () => {
  it("createDrawerObject não cria drawer-click-*", () => {
    const frontMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const group = createDrawerObject(minimalDrawerSpec(), {
      front: frontMat,
      body: bodyMat,
      frontMaterialId: "carvalho",
    });

    const ghosts: THREE.Object3D[] = [];
    const fronts: THREE.Mesh[] = [];
    group.traverse((n) => {
      if (isDrawerClickTargetGhost(n)) ghosts.push(n);
      if (n instanceof THREE.Mesh && n.userData?.drawerPart === "front") fronts.push(n);
    });

    expect(ghosts).toHaveLength(0);
    expect(group.getObjectByName("drawer-click-d1")).toBeUndefined();
    expect(fronts).toHaveLength(1);
    expect(isDrawerClickTarget(fronts[0]!)).toBe(true);
    expect(fronts[0]!.name.startsWith("drawer-front-ext-")).toBe(true);
  });

  it("frente real mantém identidade de clique; ghost legado — reconhecido", () => {
    const front = new THREE.Mesh();
    front.name = "drawer-front-ext-x";
    front.userData.drawerPart = "front";
    front.userData.drawerLayerId = "d1";
    front.userData.drawerClickTarget = true;

    const legacy = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.2, 0.002),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    legacy.name = "drawer-click-d1";
    legacy.userData.drawerPart = "click-target";

    expect(isDrawerClickTarget(front)).toBe(true);
    expect(isDrawerClickTargetGhost(front)).toBe(false);
    expect(isDrawerClickTargetGhost(legacy)).toBe(true);
  });
});
