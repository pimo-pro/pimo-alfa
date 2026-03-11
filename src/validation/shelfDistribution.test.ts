import { describe, expect, it } from "vitest";
import * as THREE from "three";
import type { DrawerLayerItem } from "../models/BoxLayers";
import { buildBoxGroup, updateBoxGroup } from "../3d/objects/BoxBuilder";

function getShelfMeshes(group: THREE.Group): THREE.Mesh[] {
  return group.children
    .filter((c) => c instanceof THREE.Mesh && /^shelf-\d+$/.test(c.name))
    .sort((a, b) => Number(a.name.replace("shelf-", "")) - Number(b.name.replace("shelf-", ""))) as THREE.Mesh[];
}

function expectedShelfY(height: number, count: number, index: number): number {
  const thickness = 0.019;
  const interiorHeight = Math.max(0.001, height - 2 * thickness);
  const spacing = interiorHeight / (count + 1);
  const yMin = -height / 2 + thickness + spacing;
  return yMin + index * spacing;
}

describe("Shelf distribution", () => {
  it("distributes shelves uniformly across internal height", () => {
    const height = 1.0;
    const count = 3;
    const group = buildBoxGroup({ width: 0.8, height, depth: 0.6, shelves: count });

    const shelves = getShelfMeshes(group);
    expect(shelves.length).toBe(count);

    shelves.forEach((shelf, i) => {
      expect(Math.abs(shelf.position.y - expectedShelfY(height, count, i))).toBeLessThan(1e-9);
    });
  });

  it("repositions existing shelves when shelf count changes", () => {
    const height = 1.0;
    const group = buildBoxGroup({ width: 0.8, height, depth: 0.6, shelves: 1 });

    updateBoxGroup(group, { width: 0.8, height, depth: 0.6, shelves: 4 });
    const shelves = getShelfMeshes(group);

    expect(shelves.length).toBe(4);
    shelves.forEach((shelf, i) => {
      expect(Math.abs(shelf.position.y - expectedShelfY(height, 4, i))).toBeLessThan(1e-9);
    });
  });

  it("keeps shelf distribution unchanged even when drawers are present", () => {
    const height = 1.0;
    const drawer: DrawerLayerItem = {
      id: "d1",
      parentBoxId: "b1",
      width: 600,
      height: 150,
      depth: 500,
      frontThickness: 19,
      openDirection: "pull",
      isOpen: false,
      pullDistanceMm: 0,
      posX: 0,
      posY: 0,
      posZ: 0,
      rotY: 0,
    };

    const group = buildBoxGroup({ width: 0.8, height, depth: 0.6, shelves: 3, drawerLayerItems: [drawer] });
    const shelves = getShelfMeshes(group);

    expect(shelves.length).toBe(3);
    shelves.forEach((shelf, i) => {
      expect(Math.abs(shelf.position.y - expectedShelfY(height, 3, i))).toBeLessThan(1e-9);
    });
  });
});
