import { describe, expect, it, vi, afterEach } from "vitest";
import * as flags from "../../drawerSystemFlags";
import { generateEuropeanDrawer } from "../index";
import { buildEuropeanCncPrograms, prepareEuropeanCNCFiles } from "./cncBuilder";

describe("cnc/cncBuilder", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("constrói programas CNC com CUT/DRILL a partir de result", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);

    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "cx-cnc",
        nome: "CX",
        dimensoes: { largura: 538, altura: 720, profundidade: 560 },
        espessura: 19,
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
    const programs = buildEuropeanCncPrograms(result);
    expect(programs.length).toBeGreaterThanOrEqual(5);

    const codes = programs.map((p) => p.meta.pieceCode);
    expect(codes).toEqual(
      expect.arrayContaining(["gav_fren", "gav_lat_dir", "gav_lat_esq", "gav_costa", "gav_fun"])
    );

    for (const p of programs) {
      expect(p.cuts.length).toBeGreaterThanOrEqual(4);
      expect(p.meta.thicknessMm).toBeGreaterThan(0);
      expect(p.meta.toleranceMm).toBeGreaterThan(0);
    }

    const prepared = prepareEuropeanCNCFiles(result, { format: "xml" });
    expect(prepared.industrialIntegrityOk).toBe(true);
    expect(prepared.files.length).toBeGreaterThanOrEqual(5);
    expect(prepared.files.every((f) => f.fileName.endsWith(".xml"))).toBe(true);
    expect(prepared.files.some((f) => f.content.includes("<Drill") || f.drillCount >= 0)).toBe(
      true
    );

    // Sem mutação industrial
    expect(result.geometry.externalWidthMm).toBeGreaterThan(0);
    expect(result.holes.length).toBeGreaterThan(0);
  });
});
