import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import { generateEuropeanDrawer } from "../index";
import { EUROPEAN_SIDE_CLEARANCE_EACH_MM } from "../measures";
import { buildOverlayMeasures } from "./overlayMeasures";
import { buildOverlayAberturas } from "./overlayAberturas";

describe("overlay/overlayAberturas", () => {
  it("aberturas frontais/laterais corretas e ligadas a vistas", () => {
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
      count: 1,
    });
    const measures = buildOverlayMeasures(result, box);
    const a = buildOverlayAberturas(result, measures, box);
    expect(a.lateralEachMm).toBe(EUROPEAN_SIDE_CLEARANCE_EACH_MM);
    expect(a.frontalMm).toBe(10);
    expect(a.items).toHaveLength(4);
    expect(a.items.map((i) => i.id)).toEqual([
      "abertura_frontal",
      "abertura_lateral",
      "abertura_superior",
      "abertura_inferior",
    ]);
    expect(a.items.every((i) => i.technicalView)).toBe(true);
    vi.restoreAllMocks();
  });
});
