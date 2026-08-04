/**
 * — 4 legado ? —5 no XML DRILL (cima/fundo/parafuso).
 * Cavilhas —10 e gavetas inalteradas.
 */
import { describe, expect, it } from "vitest";
import { buildDrillFilesForProject } from "./drillExport";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { CutListItemComPreco, PanelDrillHole } from "../types";
import { resolveTcnDrillDiameterMm } from "../cnc/tcnDrillParams";
import { withIndustrialOutputAuthorization } from "../industrial/industrialOutputGuard";

describe("DRILL XML — —4 ? —5", () => {
  it("helper: 4?5; 10 permanece 10; 5 permanece 5", () => {
    expect(resolveTcnDrillDiameterMm({ diameter: 4, holeType: "parafuso" })).toBe(5);
    expect(resolveTcnDrillDiameterMm({ diameter: 4 })).toBe(5);
    expect(resolveTcnDrillDiameterMm({ diameter: 10, holeType: "cavilha" })).toBe(10);
    expect(resolveTcnDrillDiameterMm({ diameter: 5 })).toBe(5);
  });

  it("cima com parafuso —4 legado exporta Diameter 5.00 (não 4.00)", () => {
    const holes: PanelDrillHole[] = [
      { x: 60, y: 40, diameter: 4, depth: 19, holeType: "parafuso", topDrillable: true },
      { x: 540, y: 520, diameter: 4, depth: 19, holeType: "parafuso", topDrillable: true },
    ];
    const item: CutListItemComPreco = {
      id: "cima",
      nome: "Cima",
      tipo: "cima",
      quantidade: 1,
      dimensoes: { largura: 600, altura: 560, profundidade: 19 },
      espessura: 19,
      material: "mdf",
      boxId: "b1",
      drillHoles: holes,
      precoUnitario: 0,
      precoTotal: 0,
      metadata: { qrCode: "CIMA_D4" },
    };
    const files = withIndustrialOutputAuthorization("all", () =>
      buildDrillFilesForProject([item], {
        projectName: "D4TO5",
        boxes: [],
        rules: defaultRulesConfig,
      })
    );
    const xml = files.map((f) => f.xml).join("\n");
    expect(xml).toContain("<Diameter>5.00</Diameter>");
    expect(xml).not.toContain("<Diameter>4.00</Diameter>");
    expect(xml).toContain("<X1>60.00</X1>");
    expect(xml).toContain("<Y1>40.00</Y1>");
    expect(xml).toContain("<Depth>19.00</Depth>");
  });

  it("gaveta_lat cavilha —10 permanece 10.00", () => {
    const item: CutListItemComPreco = {
      id: "gav",
      nome: "gav",
      tipo: "gaveta_lat_esq",
      quantidade: 1,
      dimensoes: { largura: 500, altura: 150, profundidade: 16 },
      espessura: 16,
      material: "mdf",
      boxId: "b1",
      drillHoles: [
        { x: 0, y: 39, diameter: 10, depth: 30, holeType: "cavilha", topDrillable: false },
      ],
      precoUnitario: 0,
      precoTotal: 0,
      metadata: { qrCode: "GAV_KEEP10" },
    };
    const files = withIndustrialOutputAuthorization("all", () =>
      buildDrillFilesForProject([item], {
        projectName: "KEEP10",
        boxes: [],
        rules: defaultRulesConfig,
      })
    );
    const xml = files.map((f) => f.xml).join("\n");
    expect(xml).toContain("<Diameter>10.00</Diameter>");
    expect(xml).not.toContain("<Diameter>4.00</Diameter>");
  });

  it("rules SSOT parafuso.diametro = 5", () => {
    expect(defaultRulesConfig.furos.tecnicos.parafuso.diametro).toBe(5);
  });
});
