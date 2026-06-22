import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { resolveDrawerFrontMaterialId } from "./drawerFrontMaterial";
import { applyDrawerFrontMaterialToMesh } from "../../3d/objects/DrawerFactory";
import { PanelFactory } from "../../3d/objects/PanelFactory";
import { resolvePanelMaterialOptions } from "../../3d/objects/BoxMaterialApplier";

describe("drawerFrontMaterial", () => {
  it("resolveDrawerFrontMaterialId — material, materialId ou metadata.frontMaterial", () => {
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
    ).toBe("carvalho");
  });

  it("applyDrawerFrontMaterialToMesh — atualiza faceMaterial (índice 1) sem tocar na orla", () => {
    const panelFactory = new PanelFactory({ resolvePanelMaterialOptions });
    const edge = new THREE.MeshStandardMaterial({ color: 0xb8a898 });
    const oldFace = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const mesh = panelFactory.createPanel(0.4, 0.2, 0.019, "drawer-front-test", "front", {
      edgeMaterial: edge,
      faceMaterial: oldFace,
    });
    expect(Array.isArray(mesh.material)).toBe(true);

    const newFace = new THREE.MeshStandardMaterial({ color: 0x224466 });
    applyDrawerFrontMaterialToMesh(mesh, newFace);

    expect(Array.isArray(mesh.material)).toBe(true);
    const materials = mesh.material as THREE.Material[];
    expect(materials[0]).toBe(edge);
    expect(materials[1]).not.toBe(oldFace);
    expect((materials[1] as THREE.MeshStandardMaterial).color.getHex()).toBe(0x224466);
  });
});
