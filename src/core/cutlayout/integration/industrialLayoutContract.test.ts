import { describe, expect, it } from "vitest";
import {
  finalizeIndustrialLayout,
  validateIndustrialLayout,
} from "./industrialLayoutContract";
import type { CutLayoutResult, SheetDefinition } from "../cutLayoutTypes";

const physicalSheet: SheetDefinition = {
  largura_mm: 2800,
  altura_mm: 2070,
  espessura_mm: 19,
};

const usableSheet: SheetDefinition = {
  largura_mm: 2790,
  altura_mm: 2060,
  espessura_mm: 19,
};

function sampleResult(): CutLayoutResult {
  return {
    sheets: [
      {
        sheet: { ...usableSheet },
        placements: [
          {
            x_mm: 100,
            y_mm: 50,
            largura_mm: 600,
            altura_mm: 400,
            rotacao: 0,
            sheetIndex: 0,
            boxId: "b1",
            partName: "Lateral",
          },
          {
            x_mm: 710,
            y_mm: 50,
            largura_mm: 500,
            altura_mm: 400,
            rotacao: 0,
            sheetIndex: 0,
            boxId: "b1",
            partName: "Cima",
          },
        ],
      },
    ],
  };
}

describe("industrialLayoutContract", () => {
  it("preserve-positions devolve clones sem alterar coordenadas", () => {
    const input = sampleResult();
    const out = finalizeIndustrialLayout(input, {
      mode: "preserve-positions",
      kerfMm: 4,
      marginMm: 5,
      physicalSheet,
    });

    expect(out.sheets[0].placements[0].x_mm).toBe(100);
    expect(out.sheets[0].placements[0].y_mm).toBe(50);
    expect(out.sheets).not.toBe(input.sheets);
  });

  it("validateIndustrialLayout detecta sobreposição no frame solver-usable", () => {
    const overlapping: CutLayoutResult = {
      sheets: [
        {
          sheet: { ...usableSheet },
          placements: [
            {
              x_mm: 0,
              y_mm: 0,
              largura_mm: 500,
              altura_mm: 400,
              rotacao: 0,
              sheetIndex: 0,
              boxId: "b1",
              partName: "A",
            },
            {
              x_mm: 100,
              y_mm: 100,
              largura_mm: 500,
              altura_mm: 400,
              rotacao: 0,
              sheetIndex: 0,
              boxId: "b1",
              partName: "B",
            },
          ],
        },
      ],
    };

    const v = validateIndustrialLayout(overlapping, {
      kerfMm: 4,
      marginMm: 5,
      physicalSheet,
      usableSheet,
      coordinateFrame: "solver-usable",
    });

    expect(v.valid).toBe(false);
    expect(v.issues.some((i) => i.code === "placement-overlap")).toBe(true);
  });

  it("mode full aplica offset de margem às coordenadas", () => {
    const out = finalizeIndustrialLayout(sampleResult(), {
      mode: "full",
      kerfMm: 4,
      marginMm: 5,
      physicalSheet,
      usableSheet,
      pocketFilling: "none",
    });

    expect(out.sheets[0].sheet.largura_mm).toBe(2800);
    // Compactação empurra para BL; offset de margem soma marginMm (5)
    expect(out.sheets[0].placements[0].x_mm).toBe(5);
    expect(out.sheets[0].placements[0].y_mm).toBe(5);
  });

  it("roda furos e rasgos com a peça sem alterar a fonte original", () => {
    const input: CutLayoutResult = {
      sheets: [
        {
          sheet: { ...usableSheet },
          placements: [
            {
              x_mm: 100,
              y_mm: 50,
              largura_mm: 50,
              altura_mm: 100,
              rotacao: 90,
              sheetIndex: 0,
              boxId: "b1",
              partName: "Lateral rodada",
              drillHoles: [{ x: 10, y: 20, diameter: 5, depth: 12 }],
              holes: [{ x: 10, y: 20, diameter: 5, depth: 12 }],
              innerContours: [{ x_mm: 5, y_mm: 10, largura_mm: 20, altura_mm: 30 }],
            },
          ],
        },
      ],
    };

    const out = finalizeIndustrialLayout(input, {
      mode: "preserve-positions",
      kerfMm: 4,
      marginMm: 5,
      physicalSheet,
    });

    const placement = out.sheets[0].placements[0];
    expect(placement.originalDrillHoles?.[0]).toMatchObject({ x: 10, y: 20 });
    expect(placement.drillHoles?.[0]).toMatchObject({ x: 20, y: 90 });
    expect(placement.holes?.[0]).toMatchObject({ x: 20, y: 90 });
    expect(placement.innerContours?.[0]).toEqual({
      x_mm: 10,
      y_mm: 75,
      largura_mm: 30,
      altura_mm: 20,
    });
  });
});
