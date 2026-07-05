import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { collectDynamicAlignCandidates } from "./collectDynamicAlignCandidates";
import type { SmartSnapEntity } from "./smartAlignSnapTypes";

function boxAabb(min: [number, number, number], max: [number, number, number]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]));
  mesh.position.set(
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2
  );
  return mesh;
}

describe("collectDynamicAlignCandidates", () => {
  it("caixas: adjacência lateral e alinhamento frontal", () => {
    const moving = boxAabb([0, 0, 0], [1, 1, 1]);
    const other = boxAabb([1.02, 0, 0], [2.02, 1, 1]);
    moving.updateMatrixWorld(true);
    other.updateMatrixWorld(true);
    const entities: SmartSnapEntity[] = [
      { kind: "box", id: "a", mesh: moving as THREE.Mesh },
      { kind: "box", id: "b", mesh: other as THREE.Mesh },
    ];

    const candidates = collectDynamicAlignCandidates({
      movingMesh: moving,
      movingKind: "box",
      movingId: "a",
      entities,
      captureM: 0.1,
    });

    const kinds = candidates.map((c) => c.kind);
    expect(kinds.some((k) => k === "adjacent_left" || k === "adjacent_right")).toBe(true);
  });

  it("caixas: alinhamento frente (Z+) quando próximas", () => {
    const moving = boxAabb([0, 0, 0], [1, 1, 1]);
    const other = boxAabb([0, 0, 1.02], [1, 1, 2.02]);
    moving.updateMatrixWorld(true);
    other.updateMatrixWorld(true);
    const entities: SmartSnapEntity[] = [
      { kind: "box", id: "a", mesh: moving as THREE.Mesh },
      { kind: "box", id: "b", mesh: other as THREE.Mesh },
    ];

    const candidates = collectDynamicAlignCandidates({
      movingMesh: moving,
      movingKind: "box",
      movingId: "a",
      entities,
      captureM: 0.1,
    });

    expect(candidates.some((c) => c.kind === "adjacent_front" || c.kind === "align_front")).toBe(true);
  });

  it("remates: apenas esquerda, direita, frente, base", () => {
    const moving = boxAabb([0.28, 0.1, 0.28], [0.48, 0.6, 0.33]);
    const other = boxAabb([0, 0, 0], [1, 1, 1]);
    moving.updateMatrixWorld(true);
    other.updateMatrixWorld(true);
    const entities: SmartSnapEntity[] = [
      { kind: "remate", id: "r1", mesh: moving as THREE.Mesh },
      { kind: "box", id: "b", mesh: other as THREE.Mesh },
    ];

    const candidates = collectDynamicAlignCandidates({
      movingMesh: moving,
      movingKind: "remate",
      movingId: "r1",
      entities,
      captureM: 0.15,
    });

    const kinds = new Set(candidates.map((c) => c.kind));
    expect(kinds.has("align_back") || kinds.has("align_top")).toBe(false);
    expect(candidates.length).toBeGreaterThan(0);
    for (const k of kinds) {
      expect(["align_left", "align_right", "align_front", "align_bottom", "adjacent_left", "adjacent_right", "adjacent_front"]).toContain(k);
    }
  });

  it("inclui alinhamento topo quando há overlap em X/Z", () => {
    const moving = boxAabb([0, 0, 0], [1, 1, 1]);
    const other = boxAabb([0.2, 0.02, 0.2], [0.8, 1.02, 0.8]);
    moving.updateMatrixWorld(true);
    other.updateMatrixWorld(true);
    const entities: SmartSnapEntity[] = [
      { kind: "box", id: "a", mesh: moving as THREE.Mesh },
      { kind: "box", id: "b", mesh: other as THREE.Mesh },
    ];

    const candidates = collectDynamicAlignCandidates({
      movingMesh: moving,
      movingKind: "box",
      movingId: "a",
      entities,
      captureM: 0.1,
    });

    expect(candidates.some((c) => c.kind === "align_bottom" || c.kind === "align_top")).toBe(true);
  });
});
