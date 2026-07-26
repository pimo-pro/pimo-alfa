import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import { generateEuropeanDrawer } from "../index";
import { isCanonicalEuropeanCode } from "./namingMap";
import { enforceViewerIdentity } from "./enforceViewerIdentity";

describe("consistency/viewer + pipeline", () => {
  it("enforceViewerIdentity normaliza holes pieceRef", () => {
    const viewer = enforceViewerIdentity(
      {
        drawers: [
          {
            id: "d0",
            index: 0,
            geometry: {} as never,
            holes: [
              {
                x: 1,
                y: 2,
                z: 0,
                diameter: 5,
                depth: 12,
                holeType: "corredica",
                face: "A",
                pieceRef: "front",
              },
            ],
            openProgress: 0,
            maxPullMm: 100,
          },
        ],
      },
      { drawerCount: 1 }
    );
    expect(viewer.drawers[0]!.holes[0]!.pieceRef).toBe("gav_fren");
  });

  it("generateEuropeanDrawer emite códigos SSOT no cutlist/pdf/holes", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "cx",
        nome: "CX",
        dimensoes: { largura: 538, altura: 720, profundidade: 560 },
        espessura: 19,
        gavetas: 2,
        material: "mdf_branco",
        profundidadeInternaUtilMm: 500,
      },
      {
        systemId: "hettich-innotech-atira",
        heightMm: 144,
        depthMm: 450,
        softClose: true,
        pushOpen: false,
        count: 2,
      }
    );
    expect(result.valid).toBe(true);
    const wood = result.cutlist.filter((i) => i.kind === "wood");
    for (const item of wood) {
      expect(item.codigo, item.nome).toBeTruthy();
      expect(isCanonicalEuropeanCode(item.codigo!)).toBe(true);
    }
    expect(wood.some((i) => i.codigo === "gav_1_fren")).toBe(true);
    expect(wood.some((i) => i.codigo === "gav_lat_dir")).toBe(true);
    expect(wood.some((i) => i.codigo === "gav_costa")).toBe(true);

    const gavHoles = result.holes.filter((h) => !h.pieceRef.startsWith("module_"));
    for (const h of gavHoles) {
      // front/bottom aliases devem estar canúnicos
      expect(["gav_fren", "gav_1_fren", "gav_2_fren", "gav_lat_esq", "gav_lat_dir", "gav_costa", "gav_fun", "gav_fre_int"]).toContain(
        h.pieceRef
      );
    }

    for (const row of result.pdf.pieceRows) {
      if (row.nome.includes("[")) {
        const code = /\[([^\]]+)\]/.exec(row.nome)?.[1];
        if (code && code.startsWith("gav")) {
          expect(isCanonicalEuropeanCode(code)).toBe(true);
        }
      }
    }
    vi.restoreAllMocks();
  });
});
