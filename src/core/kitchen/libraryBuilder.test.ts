import { describe, expect, it, vi } from "vitest";
import * as flags from "../drawers/drawerSystemFlags";
import { buildKitchenLibrary, KITCHEN_LIBRARY_VERSION } from "./libraryBuilder";

describe("kitchen/libraryBuilder", () => {
  it("constroi biblioteca completa com integracao Modelo B", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const lib = buildKitchenLibrary();
    expect(lib.kind).toBe("kitchen-industrial-library");
    expect(lib.version).toBe(KITCHEN_LIBRARY_VERSION);
    expect(lib.modules.all.length).toBe(
      lib.modules.base.length +
        lib.modules.tall.length +
        lib.modules.upper.length +
        lib.modules.corner.length
    );
    expect(lib.fronts.length).toBeGreaterThanOrEqual(5);
    expect(lib.doors.length).toBeGreaterThanOrEqual(5);
    expect(lib.remates).toHaveLength(4);
    expect(lib.rodape[0]?.heightMm).toBe(100);
    expect(lib.rules.module.length).toBeGreaterThan(0);
    expect(lib.drawers.modeloB.valid).toBe(true);
    expect(lib.report.modeloBIntegrated).toBe(true);
    expect(["LIBRARY_OK", "LIBRARY_WARN"]).toContain(lib.report.status);
    expect(lib.integrations.releaseNotes).toBe(true);
    vi.restoreAllMocks();
  });
});
