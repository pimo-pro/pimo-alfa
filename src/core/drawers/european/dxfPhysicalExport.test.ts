import { describe, expect, it, vi, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as flags from "../drawerSystemFlags";
import { generateEuropeanDrawer } from "./index";
import { serializeEntitiesToDxf } from "./dxf/export/dxfAscii";

describe("dxf physical file export (fase 16)", () => {
  let tempDir = "";

  afterEach(() => {
    vi.restoreAllMocks();
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      tempDir = "";
    }
  });

  it("gera ficheiros .dxf fisicos a partir de result.dxf", async () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    tempDir = mkdtempSync(join(tmpdir(), "eu-dxf-"));

    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "cx",
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
    expect(result.dxf).toBeTruthy();

    const { exportEuropeanDXFFiles } = await import("./dxf/export/dxfFileWriter");
    const report = exportEuropeanDXFFiles(result, {
      outputDir: tempDir,
      write: true,
      pieces: ["front", "lat_dir", "lat_esq", "costa", "fundo"],
    });

    expect(["DXF_FILE_OK", "DXF_FILE_WARN"]).toContain(report.status);
    expect(report.files.length).toBeGreaterThanOrEqual(5);
    expect(report.piecesCovered).toEqual(
      expect.arrayContaining(["gav_fren", "gav_lat_dir", "gav_lat_esq", "gav_costa", "gav_fun"])
    );

    const names = report.files.map((f) => f.fileName);
    expect(names).toEqual(
      expect.arrayContaining([
        "GAVETA_FRONT.dxf",
        "GAVETA_LAT_DIR.dxf",
        "GAVETA_LAT_ESQ.dxf",
        "GAVETA_COSTA.dxf",
        "GAVETA_FUNDO.dxf",
      ])
    );

    for (const f of report.files) {
      expect(f.written).toBe(true);
      const text = readFileSync(f.absolutePath!, "utf8");
      expect(text).toContain("SECTION");
      expect(text).toContain("ENTITIES");
      expect(text).toContain("EOF");
      expect(text).toMatch(/CUT|DRILLING|DIMENSIONS|FRONT|SIDES|BACK|BOTTOM/);
    }

    expect(result.geometry.externalWidthMm).toBeGreaterThan(0);
    expect(result.holes.length).toBeGreaterThan(0);
  });

  it("serializeEntitiesToDxf emite LINE/CIRCLE", () => {
    const dxf = serializeEntitiesToDxf([
      {
        type: "LINE",
        layer: "CUT",
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
        pieceCode: "gav_fren",
      },
      {
        type: "CIRCLE",
        layer: "DRILLING",
        center: { x: 5, y: 5 },
        radius: 2.5,
        pieceCode: "gav_fren",
      },
    ]);
    expect(dxf).toContain("LINE");
    expect(dxf).toContain("CIRCLE");
    expect(dxf).toContain("DRILLING");
  });
});
