import { describe, expect, it, vi, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as flags from "../../drawerSystemFlags";
import { generateEuropeanDrawer } from "../index";

describe("cnc/cncFileWriter", () => {
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

  it("gera ficheiros CNC físicos a partir de geometry+holes+dxf", async () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    tempDir = mkdtempSync(join(tmpdir(), "eu-cnc-"));

    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "cx-cnc-w",
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

    const { exportEuropeanCNCFiles } = await import("./cncFileWriter");
    const report = exportEuropeanCNCFiles(result, {
      outputDir: tempDir,
      format: "cnc",
      write: true,
      pieces: ["front", "lat_dir", "lat_esq", "costa", "fundo"],
    });

    expect(["CNC_OK", "CNC_WARN"]).toContain(report.status);
    expect(report.industrialIntegrityOk).toBe(true);
    expect(report.files.length).toBeGreaterThanOrEqual(5);
    expect(report.totalCutOps).toBeGreaterThan(0);

    const names = report.files.map((f) => f.fileName);
    expect(names).toEqual(
      expect.arrayContaining([
        "gav_fren.cnc",
        "gav_lat_dir.cnc",
        "gav_lat_esq.cnc",
        "gav_costa.cnc",
        "gav_fundo.cnc",
      ])
    );

    for (const f of report.files) {
      expect(f.written).toBe(true);
      const text = readFileSync(f.absolutePath!, "utf8");
      expect(text).toMatch(/G21|CUT|piece=/);
      expect(text).toContain(f.pieceCode.includes("fun") ? "gav_fun" : f.pieceCode);
    }

    // formatos alternativos em memória
    for (const format of ["xml", "mpr", "cix", "bpp"] as const) {
      const alt = exportEuropeanCNCFiles(result, {
        outputDir: join(tempDir, format),
        format,
        write: true,
        pieces: ["front"],
      });
      expect(alt.files.length).toBe(1);
      expect(alt.files[0].fileName.endsWith(`.${format}`)).toBe(true);
      const body = readFileSync(alt.files[0].absolutePath!, "utf8");
      expect(body.length).toBeGreaterThan(20);
    }

    expect(result.geometry.externalWidthMm).toBeGreaterThan(0);
    expect(result.holes.length).toBeGreaterThan(0);
  });
});
