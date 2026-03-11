import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildBoxGroup, updateBoxGroup } from "../3d/objects/BoxBuilder";

function shelfYs(group: THREE.Group): number[] {
  return group.children
    .filter((c) => /^shelf-\d+$/.test(c.name))
    .sort((a, b) => Number(a.name.replace("shelf-", "")) - Number(b.name.replace("shelf-", "")))
    .map((s) => Number(s.position.y.toFixed(6)));
}

describe("Shelf runtime trace", () => {
  it("prints shelf Y positions for 1..4 shelves", () => {
    const group = buildBoxGroup({ width: 0.8, height: 1.0, depth: 0.6, shelves: 1 });
    const trace1 = shelfYs(group);

    updateBoxGroup(group, { width: 0.8, height: 1.0, depth: 0.6, shelves: 2 });
    const trace2 = shelfYs(group);

    updateBoxGroup(group, { width: 0.8, height: 1.0, depth: 0.6, shelves: 3 });
    const trace3 = shelfYs(group);

    updateBoxGroup(group, { width: 0.8, height: 1.0, depth: 0.6, shelves: 4 });
    const trace4 = shelfYs(group);

    console.log("[shelf-runtime] shelves=1", trace1);
    console.log("[shelf-runtime] shelves=2", trace2);
    console.log("[shelf-runtime] shelves=3", trace3);
    console.log("[shelf-runtime] shelves=4", trace4);

    expect(trace1.length).toBe(1);
    expect(trace2.length).toBe(2);
    expect(trace3.length).toBe(3);
    expect(trace4.length).toBe(4);
  });
});
