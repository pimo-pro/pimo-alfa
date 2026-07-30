/**
 * Diagn�stico: paridade portas � sem cap exterior; mat�ria �nica na pe�a.
 */
import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

const sharedFace = new THREE.MeshStandardMaterial({ name: "SHARED_FRONT", color: 0x8b5a2b });
sharedFace.map = new THREE.Texture();

vi.mock("../3d/objects/BoxMaterialApplier", () => ({
  resolvePanelMaterialOptions: () => ({}),
  getEdgeMaterial: () => new THREE.MeshStandardMaterial({ color: 0xb8a898 }),
  getMaterialForOfficialId: () => sharedFace,
}));

describe("diagn�stico mat�ria frente (sem cap � paridade portas)", () => {
  it("apply n�o cria cap; remove caps legados; mat�ria �nica", async () => {
    const { applyDrawerFrontMaterialToMesh } = await import("../3d/objects/DrawerFactory");

    const geometry = new THREE.BoxGeometry(0.4, 0.2, 0.019);
    const bodyWhite = new THREE.MeshStandardMaterial({ name: "BODY_MODULE", color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, bodyWhite);
    mesh.userData.drawerPart = "front";
    mesh.userData.drawerLayerId = "drawer-1";

    const legacyCap = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.2),
      new THREE.MeshStandardMaterial({ name: "LEGACY_CAP", color: 0xffffff })
    );
    legacyCap.userData.isDrawerFrontExteriorCap = true;
    mesh.add(legacyCap);

    applyDrawerFrontMaterialToMesh(mesh, "carvalho");

    const meshMat = mesh.material as THREE.MeshStandardMaterial;
    const cap = mesh.children.find((c) => c.userData?.isDrawerFrontExteriorCap === true);

    expect(cap).toBeUndefined();
    expect(meshMat).not.toBe(bodyWhite);
    expect(meshMat).not.toBe(sharedFace);
    expect(mesh.userData.drawerFrontMaterialId).toBe("carvalho");
    expect(meshMat.color.getHex()).not.toBe(0xffffff);
  });
});
