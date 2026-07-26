import { describe, expect, it, vi, afterEach } from "vitest";
import * as flags from "../drawers/drawerSystemFlags";
import { generateEuropeanDrawer } from "../drawers/european";
import { buildIndustrialPricing, buildKitchenLibraryPricing } from "./pricingBuilder";
import { buildKitchenLibrary } from "../kitchen";

describe("pricing/pricingBuilder", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("anexa pricing completo sem alterar result industrial", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);

    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "px",
        nome: "PX",
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
    expect(result.pricing).toBeTruthy();
    expect(["PRICING_OK", "PRICING_WARN"]).toContain(result.pricing!.report.status);
    expect(result.pricing!.report.industrialIntegrityOk).toBe(true);
    expect(result.pricing!.totals.costIndustrial).toBeGreaterThan(0);
    expect(result.pricing!.totals.priceFinal).toBeGreaterThan(
      result.pricing!.totals.costIndustrial
    );
    expect(result.pricing!.materials.totalWoodCost).toBeGreaterThan(0);
    expect(result.pricing!.cnc.cutOps + result.pricing!.cnc.drillOps).toBeGreaterThan(0);

    const rebuilt = buildIndustrialPricing(result, {
      config: { margin: { marginPercent: 0.25 } },
    });
    expect(rebuilt.margin.marginPercent).toBe(0.25);

    // Integridade industrial
    expect(result.geometry.externalWidthMm).toBeGreaterThan(0);
    expect(result.holes.length).toBeGreaterThan(0);
    expect(result.cutlist.length).toBeGreaterThan(0);
    expect(result.dxf).toBeTruthy();
  });

  it("Kitchen Library inclui pricing escalado", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const lib = buildKitchenLibrary();
    expect(lib.pricing).toBeTruthy();
    expect(lib.integrations.pricing).toBe(true);
    expect(lib.drawers.modeloB.hasPricing).toBe(true);
    expect(lib.pricing!.totals.moduleCount).toBe(lib.modules.all.length);
    expect(lib.pricing!.totals.costIndustrial).toBeGreaterThan(0);

    const scaled = buildKitchenLibraryPricing(lib.pricing!, 2);
    expect(scaled.totals.moduleCount).toBe(2);
  });
});
