import { describe, expect, it } from "vitest";
import { addAnchor, removeAnchor, computeAnchorToAnchorDistances } from "./measurementAnchors";

describe("measurementAnchors", () => {
  it("adiciona e remove âncoras", () => {
    let anchors = addAnchor([], { x: 0, y: 0, z: 0 });
    expect(anchors).toHaveLength(1);
    anchors = removeAnchor(anchors, anchors[0]!.id);
    expect(anchors).toHaveLength(0);
  });

  it("calcula distância entre âncoras", () => {
    const anchors = addAnchor([], { x: 0, y: 0, z: 0 });
    const withB = addAnchor(anchors, { x: 1, y: 0, z: 0 });
    const distances = computeAnchorToAnchorDistances(withB);
    expect(distances[0]?.distanceMm).toBeCloseTo(1000, 0);
  });
});
