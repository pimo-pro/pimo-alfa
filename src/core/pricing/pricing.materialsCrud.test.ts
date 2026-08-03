import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { setCentralPricingCacheForTests, getBuiltinCentralPricing } from "./centralPricingConfig";

vi.mock("../materials/service", () => ({
  listMaterials: vi.fn(() => []),
}));

import { listMaterials } from "../materials/service";
import { getPrecoPorMaterial } from "./pricing";

describe("getPrecoPorMaterial — CRUD SSOT", () => {
  beforeEach(() => {
    setCentralPricingCacheForTests(getBuiltinCentralPricing());
    vi.mocked(listMaterials).mockReturnValue([]);
  });

  afterEach(() => {
    setCentralPricingCacheForTests(null);
    vi.clearAllMocks();
  });

  it("usa precoPorM2 do CRUD Gestão de Materiais antes de pricing.json", () => {
    vi.mocked(listMaterials).mockReturnValue([
      {
        id: "mdf_branco-19",
        label: "MDF Branco 19",
        categoryId: "mdf",
        espessura: 19,
        precoPorM2: 99,
        industrialMaterialId: "mdf_branco",
      } as never,
    ]);
    expect(getPrecoPorMaterial("mdf_branco", 19)).toBe(99);
    expect(getPrecoPorMaterial("mdf_branco-19", 19)).toBe(99);
  });

  it("fallback para pricing.json quando material não está no CRUD", () => {
    vi.mocked(listMaterials).mockReturnValue([]);
    expect(getPrecoPorMaterial("mdf_branco", 19)).toBe(31);
  });
});
