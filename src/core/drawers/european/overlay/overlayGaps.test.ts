import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import { generateEuropeanDrawer } from "../index";
import { EUROPEAN_SIDE_CLEARANCE_EACH_MM } from "../measures";
import { buildOverlayMeasures } from "./overlayMeasures";
import { buildOverlayAberturas } from "./overlayAberturas";
import { buildOverlayGaps } from "./overlayGaps";

describe("overlay/overlayGaps", () => {
  it("gaps laterais e frente-corpo corretos", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const box = {
      id: "cx",
      dimensoes: { largura: 538, altura: 720, profundidade: 560 },
      espessura: 19,
      profundidadeInternaUtilMm: 500,
      material: "mdf_branco",
    };
    const result = generateEuropeanDrawer("hettich-innotech-atira", box, {
      systemId: "hettich-innotech-atira",
      heightMm: 144,
      depthMm: 450,
      softClose: true,
      pushOpen: false,
      count: 2,
    });
    const measures = buildOverlayMeasures(result, box);
    const aberturas = buildOverlayAberturas(result, measures, box);
    const gaps = buildOverlayGaps(result, aberturas);
    expect(gaps.lateralLeftMm).toBe(EUROPEAN_SIDE_CLEARANCE_EACH_MM);
    expect(gaps.lateralRightMm).toBe(EUROPEAN_SIDE_CLEARANCE_EACH_MM);
    expect(gaps.frontToBodyMm).toBe(10);
    expect(gaps.betweenDrawersMm).toBe(6);
    expect(gaps.industrialMinimumMm).toBe(EUROPEAN_SIDE_CLEARANCE_EACH_MM);
    expect(gaps.items.length).toBeGreaterThanOrEqual(6);
    vi.restoreAllMocks();
  });
});
