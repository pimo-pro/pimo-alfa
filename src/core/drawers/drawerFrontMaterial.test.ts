import { describe, expect, it, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { resolveDrawerFrontMaterialId } from "./drawerFrontMaterial";

const edgeMat = new THREE.MeshStandardMaterial({ color: 0xb8a898 });
const clonedFace = new THREE.MeshStandardMaterial({ color: 0x224466 });
const sharedFace = new THREE.MeshStandardMaterial({ color: 0xffffff });

vi.mock("../../3d/objects/BoxMaterialApplier", () => ({
  resolvePanelMaterialOptions: () => ({}),
  getEdgeMaterial: () => edgeMat,
  getMaterialForOfficialId: () => sharedFace,
}));

vi.mock("../../3d/viewer-engine/materials/MaterialEngine", () => ({
  createClonedMaterialWithDetailMaps: () => clonedFace,
}));

vi.mock("../../3d/viewer-engine/materials/viewerGrainOrientation", () => ({
  applyDrawerFrontFaceGrain: () => undefined,
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

  it("applyDrawerFrontMaterialToMesh — atualiza faceMaterial (grupo +Z) sem tocar na orla", async () => {
    const { applyDrawerFrontMaterialToMesh, resolveDrawerFrontFaceMaterialIndex } = await import(
      "../../3d/objects/DrawerFactory"
    );

    const oldFace = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const geometry = new THREE.BoxGeometry(0.4, 0.2, 0.019);
    // 6 faces: indices 0..5 — +Z tipicamente index 4 no convention do factory
    geometry.clearGroups();
    for (let i = 0; i < 6; i++) {
      geometry.addGroup(i * 6, 6, i === 4 ? 1 : 0);
    }
    const mesh = new THREE.Mesh(geometry, [edgeMat, oldFace]);

    const faceIndex = resolveDrawerFrontFaceMaterialIndex(mesh);
    expect(faceIndex).toBe(1);
    expect(geometry.groups[4]?.materialIndex).toBe(faceIndex);

    applyDrawerFrontMaterialToMesh(mesh, "mdf_branco");

    expect(Array.isArray(mesh.material)).toBe(true);
    const materials = mesh.material as THREE.Material[];
    expect(materials[0]).toBe(edgeMat);
    expect(materials[faceIndex]).toBe(clonedFace);
    expect(materials[faceIndex]).not.toBe(oldFace);
  });
});
