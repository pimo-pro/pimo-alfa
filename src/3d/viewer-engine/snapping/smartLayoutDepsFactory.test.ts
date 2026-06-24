import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createDisabledSmartLayoutDeps } from "./smartLayoutDepsFactory";

describe("smartLayoutDepsFactory", () => {
  it("mantém smart snap desativado e delega posição dos boxes", () => {
    const mesh = new THREE.Object3D();
    mesh.position.set(1, 2, 3);
    const deps = createDisabledSmartLayoutDeps({
      getBridge: () => null,
      buildSnapContext: () => ({}) as never,
      getBoxEntry: (boxId) =>
        boxId === "box-1"
          ? ({
              mesh,
            } as never)
          : undefined,
    });

    expect(deps.isSmartSnapEnabled()).toBe(false);
    expect(deps.getBridge()).toBeNull();
    expect(deps.getBoxWorldPosition("box-1")?.toArray()).toEqual([1, 2, 3]);
    expect(deps.getBoxWorldPosition("missing")).toBeNull();

    deps.setBoxWorldPosition("box-1", new THREE.Vector3(4, 5, 6));
    expect(mesh.position.toArray()).toEqual([4, 5, 6]);

    deps.setBoxWorldPosition("missing", new THREE.Vector3(7, 8, 9));
    expect(mesh.position.toArray()).toEqual([4, 5, 6]);
  });
});
