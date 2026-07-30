import { describe, expect, it, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { resolveDrawerFrontMaterialId } from "./drawerFrontMaterial";

const edgeMat = new THREE.MeshStandardMaterial({ color: 0xb8a898 });
const sharedFace = new THREE.MeshStandardMaterial({ color: 0xffffff, name: "SHARED_FACE" });

vi.mock("../../3d/objects/BoxMaterialApplier", () => ({
  resolvePanelMaterialOptions: () => ({}),
  getEdgeMaterial: () => edgeMat,
  getMaterialForOfficialId: () => sharedFace,
}));

describe("drawerFrontMaterial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolveDrawerFrontMaterialId — materialId, metadata.frontMaterial ou material", () => {
    expect(resolveDrawerFrontMaterialId(undefined, "mdf_branco")).toBe("mdf_branco");
    expect(resolveDrawerFrontMaterialId({ material: "carvalho" }, "mdf_branco")).toBe("carvalho");
    expect(resolveDrawerFrontMaterialId({ materialId: "nogueira" }, "mdf_branco")).toBe("nogueira");
    expect(
      resolveDrawerFrontMaterialId({ metadata: { frontMaterial: "wenge" } }, "mdf_branco")
    ).toBe("wenge");
    expect(
      resolveDrawerFrontMaterialId(
        { material: "carvalho", materialId: "nogueira", metadata: { frontMaterial: "wenge" } },
        "mdf_branco"
      )
    ).toBe("nogueira");
  });

  it("applyDrawerFrontMaterialToMesh — matéria única (paridade portas, sem cap)", async () => {
    const { applyDrawerFrontMaterialToMesh } = await import("../../3d/objects/DrawerFactory");

    const oldFace = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const geometry = new THREE.BoxGeometry(0.4, 0.2, 0.019);
    geometry.clearGroups();
    for (let i = 0; i < 6; i++) {
      geometry.addGroup(i * 6, 6, i === 4 || i === 5 ? 1 : 0);
    }
    const mesh = new THREE.Mesh(geometry, [edgeMat, oldFace]);
    const legacyCap = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    legacyCap.userData.isDrawerFrontExteriorCap = true;
    mesh.add(legacyCap);

    applyDrawerFrontMaterialToMesh(mesh, "mdf_branco");

    expect(Array.isArray(mesh.material)).toBe(false);
    expect(mesh.material).toBeInstanceOf(THREE.Material);
    expect(mesh.material).not.toBe(oldFace);
    expect(mesh.material).not.toBe(edgeMat);
    expect(mesh.material).not.toBe(sharedFace); // clone
    expect((mesh.geometry as THREE.BufferGeometry).groups.length).toBe(0);
    expect(mesh.children.some((c) => c.userData?.isDrawerFrontExteriorCap === true)).toBe(false);
  });
});
