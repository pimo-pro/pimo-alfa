import { describe, expect, it } from "vitest";
import {
  calculateDrawerOffset,
  setDrawerOpen,
  updateDrawerProgress,
} from "../core/drawers/DrawerMotionService";
import { canOpenDrawer } from "../core/drawers/DrawerCollisionService";
import { drawerParametricOverridesFromLayerItem } from "../core/drawers/drawerParametricOverrides";
import { generateDrawerGroup, drawerGroupToLayerItems } from "../core/drawers";
import type { DrawerLayerItem } from "../models/BoxLayers";
import {
  buildDrawerScenario,
  DRAWER_SETTINGS,
} from "./drawerCertificationTestHelpers";

const baseDrawer = (overrides: Partial<DrawerLayerItem> = {}): DrawerLayerItem => ({
  id: "d1",
  parentBoxId: "b1",
  width: 560,
  height: 200,
  depth: 549,
  frontThickness: 19,
  bodyDepth: 530,
  openDirection: "pull",
  isOpen: false,
  pullDistanceMm: 530,
  posX: 0,
  posY: 100,
  posZ: 289.5,
  rotY: 0,
  ...overrides,
});

describe("Certificação — stress tests (robustez)", () => {
  it("10.000 ciclos abrir/fechar sem drift de offset", () => {
    const { group } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 600,
      boxDepth: 560,
      drawerCount: 1,
    });
    let drawer = group.drawers[0];
    const pullDistance = drawer.specs.positioning.pullDistance;
    const initialPos = { ...drawer.position };

    for (let i = 0; i < 10_000; i++) {
      drawer = setDrawerOpen(drawer, true);
      expect(calculateDrawerOffset(drawer, 1)).toBeCloseTo(pullDistance, 5);
      drawer = setDrawerOpen(drawer, false);
      expect(calculateDrawerOffset(drawer, 0)).toBe(0);
    }

    expect(drawer.position.x).toBe(initialPos.x);
    expect(drawer.position.y).toBe(initialPos.y);
    expect(drawer.position.z).toBe(initialPos.z);
    expect(drawer.motion.openProgress).toBe(0);
  });

  it("alternância rápida de progresso mantém limites [0,1]", () => {
    const { group } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 400,
      boxDepth: 560,
      drawerCount: 1,
    });
    let drawer = group.drawers[0];

    for (let i = 0; i < 500; i++) {
      const t = (i % 100) / 100;
      drawer = updateDrawerProgress(drawer, t);
      expect(drawer.motion.openProgress).toBeGreaterThanOrEqual(0);
      expect(drawer.motion.openProgress).toBeLessThanOrEqual(1);
    }
  });

  it("Viewer não bloqueia abertura com porta fechada", () => {
    const result = canOpenDrawer(
      baseDrawer({ id: "d1" }),
      {
        dimensoes: { largura: 600, altura: 720, profundidade: 560 },
        drawersLayer: [baseDrawer({ id: "d1" })],
        doorsLayer: [{ id: "door1", hingeSide: "left", isOpen: false } as never],
        portaTipo: "porta_simples",
        prateleiras: 0,
        gavetas: 1,
      },
      { drawerIndex: 0 }
    );
    expect(result.canOpen).toBe(true);
  });

  it("Viewer não bloqueia abertura com outra gaveta aberta", () => {
    const result = canOpenDrawer(
      baseDrawer({ id: "d2" }),
      {
        dimensoes: { largura: 600, altura: 720, profundidade: 560 },
        drawersLayer: [
          baseDrawer({ id: "d1", isOpen: true }),
          baseDrawer({ id: "d2" }),
        ],
        doorsLayer: [],
        portaTipo: "sem_porta",
        prateleiras: 0,
        gavetas: 2,
      },
      { drawerIndex: 1, singleOpenDrawer: true }
    );
    expect(result.canOpen).toBe(true);
  });

  it("100 regenerações com overrides diferentes — sem perda estrutural", () => {
    const slideTypes = ["Blum Tandem", "Blum Movento", "Genérica", "Hettich InnoTech"] as const;
    const depths = [400, 450, 500, 550];

    for (let i = 0; i < 100; i++) {
      const slideType = slideTypes[i % slideTypes.length];
      const nominalDepthMm = depths[i % depths.length];
      const metalBox = i % 5 === 0 ? "Blum Metabox" : "Nenhuma";

      const group = generateDrawerGroup({
        boxWidth: 600,
        boxHeight: 600,
        boxDepth: 560,
        boxThickness: 19,
        boxId: `stress-${i}`,
        drawerCount: 2,
        drawerType: "normal",
        heightMode: "equal",
        availableDepths: DRAWER_SETTINGS.gavetaProfundidadesDisponiveisMm,
        drawerSettings: {
          ...DRAWER_SETTINGS,
          gavetaTipoCorredica: slideType,
          gavetaTipoCaixaMetalica: metalBox,
          gavetaSoftClose: i % 2 === 0,
        },
        drawerOverrides: [
          { nominalDepthMm, slideType, softClose: i % 2 === 0 },
          { nominalDepthMm: depths[(i + 1) % depths.length], slideType },
        ],
      });

      const layers = drawerGroupToLayerItems(group);
      expect(layers).toHaveLength(2);
      expect(layers[0].bodyDepth).toBe(nominalDepthMm - DRAWER_SETTINGS.gavetaRecuoProfundidadeCorredicaMm);
      expect(layers[0].slideType).toBe(slideType);

      const overrides = drawerParametricOverridesFromLayerItem(layers[0]);
      expect(overrides?.nominalDepthMm).toBe(nominalDepthMm);
      expect(overrides?.slideType).toBe(slideType);
    }
  });

  it("100 alternâncias de slideType preservam pullDistance válido", () => {
    for (let i = 0; i < 100; i++) {
      const slideType = i % 2 === 0 ? "Blum Tandem" : "Blum Movento";
      const { layers } = buildDrawerScenario({
        boxWidth: 600,
        boxHeight: 400,
        boxDepth: 560,
        drawerCount: 1,
        slideType,
        drawerOverrides: [{ slideType }],
      });
      expect(layers[0].pullDistanceMm).toBe(layers[0].bodyDepth);
      expect(layers[0].pullDistanceMm).toBeGreaterThan(0);
    }
  });

  it("100 alternâncias metalBoxType — peças internas coerentes", () => {
    for (let i = 0; i < 100; i++) {
      const metal = i % 2 === 0 ? "Blum Metabox" : "Nenhuma";
      const { layers } = buildDrawerScenario({
        boxWidth: 600,
        boxHeight: 400,
        boxDepth: 560,
        drawerCount: 1,
        metalBoxType: metal,
        drawerOverrides: [{ metalBoxType: metal as "Blum Metabox" | "Nenhuma" }],
      });
      if (metal !== "Nenhuma") {
        expect(layers[0].leftSideWidth ?? 0).toBe(0);
        expect(layers[0].metalBoxType).toBe(metal);
      } else {
        expect(layers[0].leftSideWidth).toBeGreaterThan(0);
      }
    }
  });

  it("100 alternâncias de profundidade nominal — bodyDepth determinístico", () => {
    for (let i = 0; i < 100; i++) {
      const nominal = 300 + (i % 8) * 25;
      const clearance = 20 + (i % 3) * 5;
      const { layers } = buildDrawerScenario({
        boxWidth: 600,
        boxHeight: 400,
        boxDepth: 650,
        drawerCount: 1,
        runnerClearanceMm: clearance,
        drawerOverrides: [{ nominalDepthMm: nominal }],
      });
      expect(layers[0].bodyDepth).toBe(nominal - clearance);
      expect(layers[0].metadata?.nominalDepth).toBe(nominal);
    }
  });
});
