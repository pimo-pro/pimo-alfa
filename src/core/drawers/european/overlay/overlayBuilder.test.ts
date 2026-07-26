import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import { generateEuropeanDrawer } from "../index";
import { buildEuropeanOverlay } from "./overlayBuilder";

describe("overlay/overlayBuilder", () => {
  it("overlay completo integra DXF e vistas tecnicas sem alterar industriais", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const box = {
      id: "cx",
      nome: "CX",
      dimensoes: { largura: 538, altura: 720, profundidade: 560 },
      espessura: 19,
      gavetas: 1,
      material: "mdf_branco",
      profundidadeInternaUtilMm: 500,
    };
    const result = generateEuropeanDrawer("hettich-innotech-atira", box, {
      systemId: "hettich-innotech-atira",
      heightMm: 144,
      depthMm: 450,
      softClose: true,
      pushOpen: false,
      count: 1,
    });
    expect(result.valid).toBe(true);
    expect(result.overlay).toBeTruthy();
    expect(["OVERLAY_OK", "OVERLAY_WARN"]).toContain(result.overlay!.report.status);

    const overlay = buildEuropeanOverlay(result, box);
    expect(overlay.kind).toBe("european-mc-overlay");
    expect(overlay.remates.items).toHaveLength(4);
    expect(overlay.rodape.heightMm).toBe(100);
    expect(overlay.dxfIntegration.extraLayers).toContain("REMATE");
    expect(overlay.technicalIntegration.viewIds).toEqual(result.technical?.viewIds);
    expect(overlay.aberturas.items.length).toBe(4);
    expect(overlay.gaps.items.length).toBeGreaterThan(0);

    // industriais intactos
    expect(result.geometry.externalWidthMm).toBeGreaterThan(0);
    expect(result.holes.length).toBeGreaterThan(0);
    expect(result.cutlist.some((i) => i.kind === "wood")).toBe(true);
    expect(result.pdf.pieceRows.length).toBeGreaterThan(0);
    expect(result.dxf?.document.contourCount).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });
});
