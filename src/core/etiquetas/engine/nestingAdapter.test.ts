import { describe, expect, it } from "vitest";
import { normalizeCutLayoutPlacements } from "./nestingAdapter";

describe("normalizeCutLayoutPlacements", () => {
  it("preserva placementIndex por painel na ordem do nesting", () => {
    const normalized = normalizeCutLayoutPlacements([
      { boxId: "b1", partName: "A", sheetIndex: 0, x_mm: 0, y_mm: 0 },
      { boxId: "b1", partName: "B", sheetIndex: 0, x_mm: 10, y_mm: 0 },
      { boxId: "b1", partName: "C", sheetIndex: 1, x_mm: 0, y_mm: 0 },
    ]);

    expect(normalized).toEqual([
      expect.objectContaining({ partName: "A", sheetIndex: 0, placementIndex: 0, globalPlacementIndex: 0 }),
      expect.objectContaining({ partName: "B", sheetIndex: 0, placementIndex: 1, globalPlacementIndex: 1 }),
      expect.objectContaining({ partName: "C", sheetIndex: 1, placementIndex: 0, globalPlacementIndex: 2 }),
    ]);
  });
});
