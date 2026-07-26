import { describe, expect, it } from "vitest";
import {
  buildPlannerGrid,
  snapToGrid,
  clampToGrid,
  PLANNER_SNAP_MM,
  resolveWallZone,
} from "./plannerGrid";

describe("planner/plannerGrid", () => {
  it("snap industrial 50 mm", () => {
    expect(PLANNER_SNAP_MM).toBe(50);
    expect(snapToGrid(123)).toBe(100);
    expect(snapToGrid(126)).toBe(150);
  });

  it("constrói grelha com zonas", () => {
    const grid = buildPlannerGrid({ widthMm: 3000, heightMm: 2000 });
    expect(grid.cols).toBe(60);
    expect(grid.rows).toBe(40);
    expect(grid.wallZones).toContain("south");
    expect(grid.cornerZones).toHaveLength(4);
    expect(grid.rodapeBandMm).toBeGreaterThan(0);
  });

  it("clamp e wall zone", () => {
    const cfg = { widthMm: 2000, heightMm: 1500, depthMm: 600, snapMm: 50 };
    const pos = clampToGrid(5000, -10, 600, 560, cfg);
    expect(pos.xMm).toBeLessThanOrEqual(2000 - 600);
    expect(pos.yMm).toBe(0);
    expect(resolveWallZone(0, 0, cfg)).toBe("south");
  });
});
