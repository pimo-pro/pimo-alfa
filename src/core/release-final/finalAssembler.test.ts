import { describe, expect, it, vi, afterEach } from "vitest";
import * as flags from "../drawers/drawerSystemFlags";
import {
  assemblePimoProV5FinalRelease,
  PIMO_PRO_V5_VERSION,
  computeLogicalHash,
} from "./index";

describe("release-final / PIMO.PRO-V5", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("consolida release final sem alterar industrial", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);

    const release = assemblePimoProV5FinalRelease();

    expect(release.version).toBe(PIMO_PRO_V5_VERSION);
    expect(release.version).toBe("PIMO.PRO-V5.0");
    expect(release.manifest.logicalHash).toMatch(/^v5-[0-9a-f]+$/);
    expect(release.manifest.industrialStatus).toBe("OK");
    expect(release.manifest.cncStatus).toBe("OK");
    expect(release.manifest.pricingStatus).toBe("OK");
    expect(release.manifest.plannerStatus).toBe("OK");

    expect(["RELEASE_FINAL_OK", "RELEASE_FINAL_WARN"]).toContain(release.report.status);
    expect(release.integrity.nothingMutated).toBe(true);
    expect(release.integrity.industrialOk).toBe(true);
    expect(release.integrity.cncOk).toBe(true);
    expect(release.integrity.pricingOk).toBe(true);
    expect(release.integrity.plannerOk).toBe(true);

    expect(release.documentation.fullText).toContain("PIMO.PRO-V5.0");
    expect(release.documentation.productAnnouncement).toContain(
      "Sistema de Gavetas Europeias"
    );
    expect(release.documentation.productAnnouncement).toContain("Kitchen Planner");
    expect(release.documentation.releaseNotesPhases).toContain("Fase 20");
    expect(release.dxfFiles.length).toBeGreaterThanOrEqual(5);
    expect(release.cncFiles.length).toBeGreaterThanOrEqual(5);
    expect(release.library.modules.all.length).toBeGreaterThan(0);
    expect(release.planner.modules.length).toBeGreaterThan(0);

    // Integridade industrial preservada na amostra
    expect(release.result.valid).toBe(true);
    expect(release.result.geometry.externalWidthMm).toBeGreaterThan(0);
    expect(release.result.holes.length).toBeGreaterThan(0);
    expect(release.result.dxf).toBeTruthy();
    expect(release.result.pricing).toBeTruthy();

    expect(computeLogicalHash("a")).not.toBe(computeLogicalHash("b"));
  });
});
