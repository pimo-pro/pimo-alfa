import { describe, expect, it } from "vitest";
import { canBoxHaveDrawers } from "../core/drawers";
import {
  validateBoxDrawerCount,
  validateCustomDrawerHeights,
} from "../core/drawers/drawerUiValidation";
import { settingsDefaults } from "../core/settings/settingsSchema";

describe("Drawer UI validation (FASE 4)", () => {
  const boxDims = { dimensoes: { largura: 600, altura: 720, profundidade: 560 } };

  it("bloqueia contagem impossível via canBoxHaveDrawers", () => {
    const result = canBoxHaveDrawers(600, 100, 560, 3);
    expect(result.valid).toBe(false);
  });

  it("validateBoxDrawerCount devolve erro quando inválido", () => {
    const alerts = validateBoxDrawerCount(boxDims, 20);
    expect(alerts.some((a) => a.level === "error")).toBe(true);
  });

  it("avisa quando soma de alturas custom difere da altura interna", () => {
    const alerts = validateCustomDrawerHeights([100, 100, 100], 720, settingsDefaults.gavetas);
    expect(alerts.some((a) => a.level === "warning" && a.message.includes("Soma"))).toBe(true);
  });

  it("avisa altura abaixo do mínimo", () => {
    const alerts = validateCustomDrawerHeights([50], 720, settingsDefaults.gavetas);
    expect(alerts.some((a) => a.message.includes("mínimo"))).toBe(true);
  });
});
