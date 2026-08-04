import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import {
  disposeLoadedWoodMaterial,
  isDoorOrDrawerFrontNode,
  isDrawerClickTargetGhost,
  isKitchenFeetNode,
} from "./boxMaterialHelpers";

describe("boxMaterialHelpers", () => {
  it("identifica porta e frente de gaveta", () => {
    const doorMesh = new THREE.Mesh();
    doorMesh.userData.doorLayerId = "door-1";
    const drawerFront = new THREE.Mesh();
    drawerFront.userData.drawerPart = "front";
    const exteriorCap = new THREE.Mesh();
    exteriorCap.userData.isDrawerFrontExteriorCap = true;
    const namedFront = new THREE.Mesh();
    namedFront.name = "drawer-front-ext-abc";
    const body = new THREE.Mesh();

    expect(isDoorOrDrawerFrontNode(doorMesh)).toBe(true);
    expect(isDoorOrDrawerFrontNode(drawerFront)).toBe(true);
    expect(isDoorOrDrawerFrontNode(exteriorCap)).toBe(true);
    expect(isDoorOrDrawerFrontNode(namedFront)).toBe(true);
    expect(isDoorOrDrawerFrontNode(body)).toBe(false);
  });

  it("identifica click-target fantasma (película)", () => {
    const byPart = new THREE.Mesh();
    byPart.userData.drawerPart = "click-target";
    const byName = new THREE.Mesh();
    byName.name = "drawer-click-layer-1";
    const front = new THREE.Mesh();
    front.userData.drawerPart = "front";

    expect(isDrawerClickTargetGhost(byPart)).toBe(true);
    expect(isDrawerClickTargetGhost(byName)).toBe(true);
    expect(isDrawerClickTargetGhost(front)).toBe(false);
    expect(isDoorOrDrawerFrontNode(byPart)).toBe(false);
  });

  it("identifica pés de cozinha na hierarquia", () => {
    const feetGroup = new THREE.Group();
    feetGroup.name = "kitchen-feet-group";
    const child = new THREE.Mesh();
    feetGroup.add(child);

    expect(isKitchenFeetNode(child)).toBe(true);
    expect(isKitchenFeetNode(new THREE.Mesh())).toBe(false);
  });

  it("disposeLoadedWoodMaterial liberta material e texturas", () => {
    const material = new THREE.MeshStandardMaterial();
    const texture = new THREE.Texture();
    const disposeMaterial = vi.spyOn(material, "dispose");
    const disposeTexture = vi.spyOn(texture, "dispose");

    disposeLoadedWoodMaterial({
      material,
      textures: [texture],
      loadDetailMaps: async () => {},
      areDetailMapsLoaded: () => true,
    });

    expect(disposeMaterial).toHaveBeenCalled();
    expect(disposeTexture).toHaveBeenCalled();
  });
});
