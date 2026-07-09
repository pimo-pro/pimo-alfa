import { describe, expect, it } from "vitest";
import { generateTcnForPanelNestingMo } from "./tcnGeneratorNestingMo";
import type { SheetResult } from "../cutlayout/cutLayoutTypes";

describe("generateTcnForPanelNestingMo — DR/DP furos", () => {
  it("emite #1002=5.00 e profundidade = espessura da chapa para parafuso 4mm legado", () => {
    const sheetResult: SheetResult = {
      sheet: { largura_mm: 2800, altura_mm: 2070, espessura_mm: 19 },
      placements: [
        {
          x_mm: 100,
          y_mm: 100,
          largura_mm: 600,
          altura_mm: 400,
          rotacao: 0,
          sheetIndex: 0,
          boxId: "b1",
          partName: "Lateral",
          espessura_mm: 19,
          drillHoles: [{ x: 50, y: 50, diameter: 4, depth: 12, holeType: "parafuso", topDrillable: true }],
        },
      ],
    };

    const tcn = generateTcnForPanelNestingMo(sheetResult, 3, "Test");
    expect(tcn).toContain("W#81");
    expect(tcn).toMatch(/#1002=5\.00/);
    expect(tcn).toMatch(/#3=-19(\.00)?/);
    expect(tcn).not.toMatch(/#1002=4\.00/);
    expect(tcn).not.toMatch(/#3=-12(\.00)?/);
  });
});
