import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { generateDrawerGroup, drawerGroupToLayerItems } from "../core/drawers";
import {
  applyDrawerFrontMaterialToMesh,
  buildDrawerSpecs,
  createDrawerObject,
  resolveDrawerFrontFaceMaterialIndex,
} from "../3d/objects/DrawerFactory";
import { settingsDefaults } from "../core/settings/settingsSchema";

vi.mock("../3d/objects/BoxMaterialApplier", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../3d/objects/BoxMaterialApplier")>();
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xb8a898 });
  return {
    ...actual,
    getEdgeMaterial: () => edgeMat,
  };
});

function findFrontMesh(drawerLayer: THREE.Object3D): THREE.Mesh {
  let front: THREE.Mesh | undefined;
  drawerLayer.traverse((child) => {
    if (front) return;
    if (
      child instanceof THREE.Mesh &&
      child.userData?.drawerPart === "front" &&
      child.name.includes("drawer-front-ext")
    ) {
      front = child;
    }
  });
  if (!front) throw new Error("drawer-front-ext mesh não encontrada");
  return front;
}

function worldBounds(mesh: THREE.Mesh): THREE.Box3 {
  const box = new THREE.Box3();
  mesh.updateMatrixWorld(true);
  box.setFromObject(mesh);
  return box;
}

describe("viewer — atualização incremental do material da frente da gaveta", () => {
  it("applyDrawerFrontMaterialToMesh altera só a face larga (+Z), preserva geometria e orlas", () => {
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: 280,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "mat-incr",
      drawerCount: 1,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      drawerSettings: settingsDefaults.gavetas,
      espessuraCostaMm: 10,
      costaAtiva: true,
    });
    const [layer] = drawerGroupToLayerItems(group);
    const [spec] = buildDrawerSpecs([layer]);

    const oldFront = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const body = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const drawerLayer = createDrawerObject(spec, { front: oldFront, body });
    const frontMesh = findFrontMesh(drawerLayer);

    expect(Array.isArray(frontMesh.material)).toBe(true);
    const materialsBefore = frontMesh.material as THREE.Material[];
    const edgeBefore = materialsBefore[0];
    const faceIndex = resolveDrawerFrontFaceMaterialIndex(frontMesh);
    expect(faceIndex).toBe(1);
    expect((materialsBefore[faceIndex] as THREE.MeshStandardMaterial).color.getHex()).toBe(0xeeeeee);

    const geometryUuidBefore = frontMesh.geometry.uuid;
    const boundsBefore = worldBounds(frontMesh);

    const newFront = new THREE.MeshStandardMaterial({ color: 0x224466 });
    applyDrawerFrontMaterialToMesh(frontMesh, newFront);

    expect(frontMesh.geometry.uuid).toBe(geometryUuidBefore);

    const boundsAfter = worldBounds(frontMesh);
    expect(boundsAfter.min.x).toBeCloseTo(boundsBefore.min.x, 5);
    expect(boundsAfter.max.x).toBeCloseTo(boundsBefore.max.x, 5);
    expect(boundsAfter.min.y).toBeCloseTo(boundsBefore.min.y, 5);
    expect(boundsAfter.max.y).toBeCloseTo(boundsBefore.max.y, 5);
    expect(boundsAfter.min.z).toBeCloseTo(boundsBefore.min.z, 5);
    expect(boundsAfter.max.z).toBeCloseTo(boundsBefore.max.z, 5);

    const materialsAfter = frontMesh.material as THREE.Material[];
    expect(materialsAfter[0]).toBe(edgeBefore);
    expect((materialsAfter[0] as THREE.MeshStandardMaterial).color.getHex()).toBe(0xb8a898);
    expect((materialsAfter[faceIndex] as THREE.MeshStandardMaterial).color.getHex()).toBe(0x224466);

    const groups = (frontMesh.geometry as THREE.BufferGeometry).groups;
    expect(groups[4]?.materialIndex).toBe(faceIndex);
    expect(groups[5]?.materialIndex).toBe(faceIndex);
  });
});
