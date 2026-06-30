import { describe, expect, it } from "vitest";
import { CATALOG_ITEMS, getCatalogItemById } from "./catalogIndex";
import { getBaseCabinetById } from "../core/baseCabinets";
import { ensureBuiltinIndustrialModelsRegistered } from "../core/industrialDesigner/builtinIndustrialBootstrap";
import { INDUSTRIAL_BASE_600_MODULE_ID } from "../core/industrialDesigner/staticIndustrialRegistry";

describe("catalogIndex", () => {
  it("inclui modelos industriais built-in alinhados com getBaseCabinetById", () => {
    ensureBuiltinIndustrialModelsRegistered();
    const industrial = getCatalogItemById(INDUSTRIAL_BASE_600_MODULE_ID);
    expect(industrial).toBeDefined();
    expect(getBaseCabinetById(INDUSTRIAL_BASE_600_MODULE_ID)).toBeDefined();
  });

  it("catálogo 3d e getBaseCabinetById partilham os mesmos IDs", () => {
    ensureBuiltinIndustrialModelsRegistered();
    for (const item of CATALOG_ITEMS.slice(0, 12)) {
      expect(getBaseCabinetById(item.id)?.id).toBe(item.id);
    }
  });
});
