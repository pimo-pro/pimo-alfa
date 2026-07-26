import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import { generateEuropeanDrawer } from "../index";
import { buildEuropeanReleaseNotes, EUROPEAN_RELEASE_VERSION } from "./releaseBuilder";

describe("release/releaseBuilder", () => {
  it("anexa releaseNotes com secoes e integracoes sem alterar industriais", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
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
    expect(result.releaseNotes).toBeTruthy();
    expect(result.releaseNotes!.version).toBe(EUROPEAN_RELEASE_VERSION);
    expect(result.releaseNotes!.author).toBe("PIMO Engine");
    expect(result.releaseNotes!.sections).toHaveLength(7);
    expect(result.releaseNotes!.integrations).toEqual({
      safety: true,
      docs: true,
      dxf: true,
      technical: true,
      overlay: true,
    });
    expect(["RELEASE_OK", "RELEASE_WARN"]).toContain(result.releaseNotes!.report.status);
    expect(result.releaseNotes!.report.industrialIntegrity).toBe(true);

    const rebuilt = buildEuropeanReleaseNotes(result);
    expect(rebuilt.kind).toBe("european-release-notes");
    expect(rebuilt.text).toContain("Release Notes");

    expect(result.geometry.externalWidthMm).toBeGreaterThan(0);
    expect(result.holes.length).toBeGreaterThan(0);
    expect(result.cutlist.some((i) => i.kind === "wood")).toBe(true);
    vi.restoreAllMocks();
  });
});
