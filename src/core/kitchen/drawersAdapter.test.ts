import { describe, expect, it, vi } from "vitest";
import * as flags from "../drawers/drawerSystemFlags";
import { adaptEuropeanDrawerSample } from "./drawers/europeanDrawerAdapter";

describe("kitchen/drawersAdapter", () => {
  it("integra Modelo B com vistas/DXF/overlay/docs/release", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const { sample, result } = adaptEuropeanDrawerSample({ drawerCount: 1 });
    expect(sample.source).toBe("modelo-b");
    expect(sample.valid).toBe(true);
    expect(sample.hasTechnical).toBe(true);
    expect(sample.hasDxf).toBe(true);
    expect(sample.hasOverlay).toBe(true);
    expect(sample.hasDocs).toBe(true);
    expect(sample.hasReleaseNotes).toBe(true);
    expect(sample.viewIds.length).toBeGreaterThan(0);
    // result industrial intacto
    expect(result.geometry.externalWidthMm).toBeGreaterThan(0);
    expect(result.holes.length).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });
});
