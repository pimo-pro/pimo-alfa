/**
 * Diagnóstico geometria gav_frente — singleMaterial como portas (sem cap).
 */
import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { PanelFactory } from "../3d/objects/PanelFactory";

vi.mock("../3d/objects/BoxMaterialApplier", () => ({
  resolvePanelMaterialOptions: (options: unknown) => options ?? {},
  getEdgeMaterial: () => new THREE.MeshStandardMaterial({ color: 0xb8a898 }),
  getMaterialForOfficialId: () =>
    new THREE.MeshStandardMaterial({ name: "MOCK_FRONT", color: 0x8b5a2b }),
}));

import {
  applyDrawerFrontMaterialToMesh,
  DRAWER_FRONT_EXTERIOR_FACE_INDEX,
  DRAWER_FRONT_INTERIOR_FACE_INDEX,
  resolveDrawerFrontFaceMaterialIndex,
} from "../3d/objects/DrawerFactory";

const FACE_LABELS = ["+X", "-X", "+Y", "-Y", "+Z", "-Z"] as const;

describe("diagnóstico geometria gav_frente", () => {
  it("normals +Z/?Z correctos; create singleMaterial; apply sem cap", () => {
    const factory = new PanelFactory({
      resolvePanelMaterialOptions: (options) => {
        if (options && typeof options === "object" && "singleMaterial" in options) {
          return options;
        }
        if (options && typeof options === "object" && "edgeMaterial" in options) {
          return options;
        }
        return {
          edgeMaterial: new THREE.MeshStandardMaterial({ name: "fallback-edge", color: 0xb8a898 }),
          faceMaterial: new THREE.MeshStandardMaterial({ name: "fallback-face", color: 0xffffff }),
        };
      },
    });

    const thinAxis = factory.getThinAxisForPanel("front");
    const faceMat = new THREE.MeshStandardMaterial({ name: "FACE_DOOR_PARITY", color: 0x8b5a2b });
    const mesh = factory.createPanel(0.4, 0.2, 0.019, "drawer-front-ext-test", "front", {
      singleMaterial: faceMat,
    });

    const normals = (mesh.geometry as THREE.BufferGeometry).getAttribute("normal");
    const exteriorNormalZ = normals.getZ(DRAWER_FRONT_EXTERIOR_FACE_INDEX * 4);
    const interiorNormalZ = normals.getZ(DRAWER_FRONT_INTERIOR_FACE_INDEX * 4);

    expect(thinAxis).toBe(2);
    expect(exteriorNormalZ).toBeGreaterThan(0.5);
    expect(interiorNormalZ).toBeLessThan(-0.5);
    expect(Array.isArray(mesh.material)).toBe(false);
    expect(resolveDrawerFrontFaceMaterialIndex(mesh)).toBe(0);

    applyDrawerFrontMaterialToMesh(mesh, "carvalho");

    const geo = mesh.geometry as THREE.BufferGeometry;
    const cap = mesh.children.find((c) => c.userData?.isDrawerFrontExteriorCap === true);

    expect(Array.isArray(mesh.material)).toBe(false);
    expect(geo.groups.length).toBe(0);
    expect(cap).toBeUndefined();
    expect(geo.getAttribute("normal").getZ(DRAWER_FRONT_EXTERIOR_FACE_INDEX * 4)).toBeGreaterThan(0.5);
    expect(geo.getAttribute("normal").getZ(DRAWER_FRONT_INTERIOR_FACE_INDEX * 4)).toBeLessThan(-0.5);
    void FACE_LABELS;
  });
});
