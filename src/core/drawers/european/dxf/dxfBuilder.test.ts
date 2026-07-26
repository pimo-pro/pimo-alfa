import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import { generateEuropeanDrawer } from "../index";
import { buildEuropeanDxfDocument } from "./dxfBuilder";
import { EUROPEAN_DXF_LAYERS } from "./dxfLayers";

describe("dxf/dxfBuilder", () => {
  it("DXF contem contornos, furos e layers industriais", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "cx",
        nome: "CX",
        dimensoes: { largura: 538, altura: 720, profundidade: 560 },
        espessura: 19,
        gavetas: 1,
        material: "mdf_branco",
        profundidadeInternaUtilMm: 500,
      },
      {
        systemId: "hettich-innotech-atira",
        heightMm: 144,
        depthMm: 450,
        softClose: true,
        pushOpen: false,
        count: 1,
      }
    );
    expect(result.valid).toBe(true);
    expect(result.dxf).toBeTruthy();
    expect(["DXF_OK", "DXF_WARN"]).toContain(result.dxf!.report.status);

    const doc = buildEuropeanDxfDocument(result);
    expect(doc.layers.map((l) => l.name)).toEqual([...EUROPEAN_DXF_LAYERS]);
    expect(doc.contourCount).toBeGreaterThanOrEqual(5);
    expect(doc.entities.some((e) => e.type === "LINE" && e.layer === "CUT")).toBe(true);
    expect(doc.entities.some((e) => e.type === "CIRCLE" && e.layer === "DRILLING")).toBe(true);
    expect(doc.holeEntityCount).toBe(result.holes.length);

    // geometry/holes/pdf intactos
    expect(result.geometry.externalWidthMm).toBeGreaterThan(0);
    expect(result.holes.length).toBeGreaterThan(0);
    expect(result.pdf.pieceRows.length).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });
});
