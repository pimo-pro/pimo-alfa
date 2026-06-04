import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { collectRemateSnapTargets } from "./remateSnapTargets";

describe("remateSnapTargets", () => {
  it("inclui faces estruturais BOX_FRENTE/DIR/ESQ/CIMA/FUNDO", () => {
    const boxMesh = new THREE.Group();
    boxMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.72, 0.6)));
    const targets = collectRemateSnapTargets({
      boxMesh,
      widthM: 0.6,
      heightM: 0.72,
      depthM: 0.6,
    });
    const kinds = new Set(targets.map((t) => t.kind));
    expect(kinds.has("BOX_FRENTE")).toBe(true);
    expect(kinds.has("BOX_DIR")).toBe(true);
    expect(kinds.has("BOX_ESQ")).toBe(true);
    expect(kinds.has("BOX_CIMA")).toBe(true);
    expect(kinds.has("BOX_FUNDO")).toBe(true);
  });

  it("prioriza DOOR_FRONT sobre BOX_FRENTE", () => {
    const boxMesh = new THREE.Group();
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.018));
    door.position.set(0, 0, 0.29);
    door.name = "door-leaf-test";
    door.userData.doorPart = "panel";
    door.userData.doorLayerId = "d1";
    boxMesh.add(door);
    const targets = collectRemateSnapTargets({ boxMesh, widthM: 0.6, heightM: 0.72, depthM: 0.6 });
    const doorPlane = targets.find((t) => t.kind === "DOOR_FRONT");
    const frontPlane = targets.find((t) => t.kind === "BOX_FRENTE");
    expect(doorPlane).toBeDefined();
    expect(frontPlane).toBeDefined();
    expect(doorPlane!.priority).toBeLessThan(frontPlane!.priority);
  });
});
