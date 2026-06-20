import { describe, expect, it } from "vitest";
import { getSettings } from "../core/settings/settingsService";
import {
  validateDrawerFeetWarning,
  validateDrawerSlideCourseWarning,
  validateBoxDrawerConfiguration,
} from "../core/drawers/drawerUiValidation";
import type { DrawerLayerItem } from "../models/BoxLayers";
import type { WorkspaceBox } from "../core/types";

function baseDrawer(overrides: Partial<DrawerLayerItem> = {}): DrawerLayerItem {
  return {
    id: "d1",
    parentBoxId: "box-1",
    width: 560,
    height: 200,
    depth: 530,
    frontThickness: 19,
    bodyDepth: 520,
    openDirection: "pull",
    isOpen: false,
    pullDistanceMm: 520,
    posX: 0,
    posY: 0,
    posZ: 0,
    rotY: 0,
    softClose: true,
    slideType: "Genérica",
    ...overrides,
  };
}

describe("drawerUiValidation — avisos industriais (não bloqueiam Viewer)", () => {
  const settings = getSettings().gavetas;

  it("emite warning de pés altos na gaveta inferior", () => {
    const alerts = validateDrawerFeetWarning(
      baseDrawer({ height: 180 }),
      {
        dimensoes: { largura: 600, altura: 720, profundidade: 560 },
        feetEnabled: true,
        feetHeight: 120,
        pe_cm: 12,
        drawersLayer: [baseDrawer()],
      },
      0
    );
    expect(alerts.some((a) => a.message.includes("Rodapé/pés"))).toBe(true);
    expect(alerts.every((a) => a.level === "warning")).toBe(true);
  });

  it("emite warning quando curso excede profundidade útil", () => {
    const alerts = validateDrawerSlideCourseWarning(
      baseDrawer({ bodyDepth: 520 }),
      { dimensoes: { largura: 600, altura: 720, profundidade: 400 } },
      settings
    );
    expect(alerts.some((a) => a.message.includes("Curso da corrediça"))).toBe(true);
  });

  it("soft-close Genérica aparece como warning no painel", () => {
    const box = {
      id: "box-1",
      dimensoes: { largura: 600, altura: 720, profundidade: 560 },
      gavetas: 1,
      drawersLayer: [baseDrawer({ softClose: true, slideType: "Genérica" })],
    } as WorkspaceBox;
    const alerts = validateBoxDrawerConfiguration(box, {
      ...settings,
      gavetaValidarSoftCloseCompativel: true,
      gavetaSoftClose: true,
    });
    expect(alerts.some((a) => a.message.includes("Soft-close"))).toBe(true);
    expect(alerts.every((a) => a.level !== "error" || !a.message.includes("Soft-close"))).toBe(true);
  });
});
