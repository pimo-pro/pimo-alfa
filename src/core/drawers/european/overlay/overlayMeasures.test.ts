import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import { generateEuropeanDrawer } from "../index";
import { EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM } from "../measures";
import { buildOverlayMeasures } from "./overlayMeasures";

const box = {
  id: "cx",
  nome: "CX",
  dimensoes: { largura: 538, altura: 720, profundidade: 560 },
  espessura: 19,
  gavetas: 1,
  material: "mdf_branco",
  profundidadeInternaUtilMm: 500,
};

describe("overlay/overlayMeasures", () => {
  it("medidas internas correspondem a geometry e box", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const result = generateEuropeanDrawer("hettich-innotech-atira", box, {
      systemId: "hettich-innotech-atira",
      heightMm: 144,
      depthMm: 450,
      softClose: true,
      pushOpen: false,
      count: 1,
    });
    const m = buildOverlayMeasures(result, box);
    expect(m.internalUsefulWidthMm).toBe(result.geometry.internalWidthMm);
    expect(m.internalUsefulDepthMm).toBe(result.geometry.bodyDepthMm);
    expect(m.usefulHeightPerDrawerMm).toBe(144);
    expect(m.frontToBodyDistanceMm).toBe(EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM);
    expect(m.moduleInternal?.usefulDepthMm).toBe(500);
    expect(m.moduleExternal?.widthMm).toBe(538);
    vi.restoreAllMocks();
  });
});
