import { describe, expect, it, afterEach } from "vitest";
import {
  getCatalogItems,
  getCatalogItemById,
  __resetCatalogIndexCacheForTests,
} from "./catalogIndex";
import { getBaseCabinetById } from "../core/baseCabinets";
import { ensureBuiltinIndustrialModelsRegistered } from "../core/industrialDesigner/builtinIndustrialBootstrap";
import { INDUSTRIAL_BASE_600_MODULE_ID } from "../core/industrialDesigner/staticIndustrialRegistry";

describe("catalogIndex", () => {
  afterEach(() => {
    __resetCatalogIndexCacheForTests();
  });

  it("inclui modelos industriais built-in alinhados com getBaseCabinetById", () => {
    ensureBuiltinIndustrialModelsRegistered();
    const industrial = getCatalogItemById(INDUSTRIAL_BASE_600_MODULE_ID);
    expect(industrial).toBeDefined();
    expect(getBaseCabinetById(INDUSTRIAL_BASE_600_MODULE_ID)).toBeDefined();
  });

  it("catálogo 3d e getBaseCabinetById partilham os mesmos IDs", () => {
    ensureBuiltinIndustrialModelsRegistered();
    for (const item of getCatalogItems().slice(0, 12)) {
      expect(getBaseCabinetById(item.id)?.id).toBe(item.id);
    }
  });
});
