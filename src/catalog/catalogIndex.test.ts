import { describe, expect, it, afterEach } from "vitest";
import {
  getCatalogItems,
  getCatalogItemById,
  __resetCatalogIndexCacheForTests,
} from "./catalogIndex";
import { getBaseCabinetById } from "../core/baseCabinets";
import {
  ensureBuiltinIndustrialModelsRegistered,
  __resetBuiltinIndustrialBootstrapForTests,
} from "../core/industrialDesigner/builtinIndustrialBootstrap";
import {
  getBuiltinIndustrialModel,
  INDUSTRIAL_BASE_600_MODULE_ID,
  __resetBuiltinIndustrialModelsForTests,
} from "../core/industrialDesigner/staticIndustrialRegistry";

describe("catalogIndex", () => {
  afterEach(() => {
    __resetCatalogIndexCacheForTests();
    __resetBuiltinIndustrialBootstrapForTests();
    __resetBuiltinIndustrialModelsForTests();
  });

  it("inclui modelos industriais built-in no catálogo sem bootstrap pesado", () => {
    const industrial = getCatalogItemById(INDUSTRIAL_BASE_600_MODULE_ID);
    expect(industrial).toBeDefined();
    expect(getBaseCabinetById(INDUSTRIAL_BASE_600_MODULE_ID)?.id).toBe(
      INDUSTRIAL_BASE_600_MODULE_ID
    );
    expect(getBuiltinIndustrialModel(INDUSTRIAL_BASE_600_MODULE_ID)).toBeUndefined();
  });

  it("catálogo 3d e getBaseCabinetById partilham os mesmos IDs", () => {
    for (const item of getCatalogItems().slice(0, 12)) {
      expect(getBaseCabinetById(item.id)?.id).toBe(item.id);
    }
  });

  it("bootstrap completo disponível após ensureBuiltinIndustrialModelsRegistered", () => {
    ensureBuiltinIndustrialModelsRegistered();
    expect(getBuiltinIndustrialModel(INDUSTRIAL_BASE_600_MODULE_ID)).toBeDefined();
    expect(getCatalogItemById(INDUSTRIAL_BASE_600_MODULE_ID)).toBeDefined();
  });
});
