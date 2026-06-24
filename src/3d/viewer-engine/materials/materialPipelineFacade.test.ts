import { describe, expect, it, vi } from "vitest";
import { createMaterialPipelineFacade } from "./materialPipelineFacade";

vi.mock("./MaterialEngine", () => ({
  loadMaterial: vi.fn(() => ({ material: {}, textures: [] })),
  getMaterialMode: vi.fn(() => "realistic"),
  setMaterialMode: vi.fn(),
  setLacqueredClearcoatPipeline: vi.fn(),
  getSceneMaterialConfig: vi.fn(() => ({})),
}));

vi.mock("./overlayMaterials", () => ({
  getSharedPanelEdgeMaterial: vi.fn(() => ({})),
  disposeSharedPanelEdgeMaterial: vi.fn(),
}));

describe("materialPipelineFacade", () => {
  it("delega loadMaterial com qualidade lacquered", async () => {
    const engine = await import("./MaterialEngine");
    const facade = createMaterialPipelineFacade();

    facade.loadMaterial("mdf_branco", "lacquered");

    expect(engine.loadMaterial).toHaveBeenCalledWith("mdf_branco", "realistic", {
      useLacqueredClearcoat: true,
    });
  });

  it("expõe API de modo e edge material", () => {
    const facade = createMaterialPipelineFacade();

    facade.setMaterialMode("showcase");
    facade.setLacqueredClearcoatPipeline(true);
    facade.getSceneMaterialConfig();
    facade.getSharedPanelEdgeMaterial();
    facade.disposeSharedPanelEdgeMaterial();

    expect(facade.getMaterialMode()).toBe("realistic");
  });
});
