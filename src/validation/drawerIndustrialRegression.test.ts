import { describe, expect, it } from "vitest";
import { buildPanelDrillingResult } from "../modules/drilling/drillingAdapter";
import { defaultRulesConfig } from "../core/rules/rulesConfig";
import { cutlistComPrecoFromBox } from "../core/manufacturing/cutlistFromBoxes";
import {
  DRAWER_SLIDES_PER_DRAWER,
  extractDrawerCutlistFromLayerItems,
  extractDrawerIndustrialBomFromLayerItems,
  isDrawerPieceTipo,
} from "../services/drawerCutlistAdapter";
import { resolveDrawerVerticalPositions } from "../core/drawers/drawerVerticalPosition";
import { calculateDrawerHeights } from "../core/drawers/DrawerGroup";
import {
  buildDrawerScenario,
  buildWardrobeHjDrawerScenario,
  countDrawerPiecesByTipo,
  minimalBoxWithDrawers,
  snapshotDrawerLayer,
} from "./drawerCertificationTestHelpers";

const SLIDE_TYPES = ["Blum Tandem", "Blum Movento", "Genérica"] as const;
const CLEARANCE_VALUES = [20, 25, 30] as const;

describe("Certificação — regressão industrial (snapshots)", () => {
  describe.each([1, 2, 3, 4])("gavetas normais — count=%i", (drawerCount) => {
    it("gera peças, dimensões e offsets consistentes", () => {
      const { layers, group } = buildDrawerScenario({
        boxWidth: 600,
        boxHeight: 720,
        boxDepth: 560,
        drawerCount,
      });

      expect(layers).toHaveLength(drawerCount);

      const heights = calculateDrawerHeights(drawerCount, 720, "equal");
      const positions = resolveDrawerVerticalPositions(heights, 720);
      layers.forEach((layer, i) => {
        expect(layer.posY).toBe(group.drawers[i].position.y);
        expect(layer.posY).toBeCloseTo(positions[i], 0);
        expect(layer.width).toBe(560);
        expect(layer.bodyDepth).toBe(530);
        expect(layer.pullDistanceMm).toBe(530);
        expect(snapshotDrawerLayer(layer, i)).toMatchSnapshot();
      });

      const cutlist = extractDrawerCutlistFromLayerItems(layers, "MDF");
      const drawerPieces = cutlist.filter((p) => isDrawerPieceTipo(p.tipo));
      expect(drawerPieces).toHaveLength(drawerCount * 5);

      const counts = countDrawerPiecesByTipo(drawerPieces.map((p) => p.tipo));
      expect(counts.gaveta_frente).toBe(drawerCount);
      expect(counts.gaveta_lat_esq).toBe(drawerCount);
      expect(counts.gaveta_lat_dir).toBe(drawerCount);
      expect(counts.gaveta_fundo).toBe(drawerCount);
      expect(counts.gaveta_traseira).toBe(drawerCount);
    });
  });

  describe.each([1, 2])("gavetas metálicas — count=%i", (drawerCount) => {
    it("só gera frente e ferragens de caixa metálica", () => {
      const { layers } = buildDrawerScenario({
        boxWidth: 600,
        boxHeight: 600,
        boxDepth: 560,
        drawerCount,
        metalBoxType: "Blum Metabox",
      });

      const cutlist = extractDrawerCutlistFromLayerItems(layers, "MDF");
      const tipos = cutlist.map((p) => p.tipo);
      expect(tipos.every((t) => t === "gaveta_frente")).toBe(true);
      expect(tipos).toHaveLength(drawerCount);

      const bom = extractDrawerIndustrialBomFromLayerItems(layers);
      expect(bom.hardware).toHaveLength(drawerCount);
      bom.hardware.forEach((h) => {
        expect(h.slideQuantity).toBe(DRAWER_SLIDES_PER_DRAWER);
        expect(h.metalBoxType).toBe("Blum Metabox");
      });
    });
  });

  describe.each(SLIDE_TYPES)("slideType=%s", (slideType) => {
    it("propaga tipo de corrediça até cutlist metadata", () => {
      const { layers } = buildDrawerScenario({
        boxWidth: 600,
        boxHeight: 400,
        boxDepth: 560,
        drawerCount: 1,
        slideType,
      });

      const cutlist = extractDrawerCutlistFromLayerItems(layers, "MDF");
      const front = cutlist.find((p) => p.tipo === "gaveta_frente");
      const rules = front?.metadata?.drawerRules as { slideType?: string } | undefined;
      expect(rules?.slideType).toBe(slideType);
      expect(layers[0].slideType).toBe(slideType);
    });
  });

  describe.each([
    { softClose: true, label: "ON" },
    { softClose: false, label: "OFF" },
  ])("softClose $label", ({ softClose }) => {
    it("reflete softClose na layer e metadata", () => {
      const { layers } = buildDrawerScenario({
        boxWidth: 600,
        boxHeight: 400,
        boxDepth: 560,
        drawerCount: 1,
        softClose,
      });
      expect(layers[0].softClose).toBe(softClose);
      expect(layers[0].metadata?.softClose).toBe(softClose);
    });
  });

  it("profundidades nominais diferentes por gaveta", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 600,
      boxDepth: 560,
      drawerCount: 2,
      drawerOverrides: [{ nominalDepthMm: 450 }, { nominalDepthMm: 500 }],
    });

    expect(layers[0].bodyDepth).toBe(430);
    expect(layers[1].bodyDepth).toBe(480);
    expect(layers[0].metadata?.nominalDepth).toBe(450);
    expect(layers[1].metadata?.nominalDepth).toBe(500);
  });

  describe.each(CLEARANCE_VALUES)("recuo corrediça %i mm", (runnerClearanceMm) => {
    it("ajusta bodyDepth conforme settings", () => {
      const { layers } = buildDrawerScenario({
        boxWidth: 600,
        boxHeight: 400,
        boxDepth: 560,
        drawerCount: 1,
        runnerClearanceMm,
      });
      expect(layers[0].bodyDepth).toBe(550 - runnerClearanceMm);
    });
  });

  it("módulo estreito (≤ 300 mm)", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 280,
      boxHeight: 400,
      boxDepth: 300,
      drawerCount: 1,
    });
    expect(layers[0].width).toBeLessThanOrEqual(278);
    expect(layers[0].bodyDepth).toBeGreaterThan(0);
  });

  it("módulo profundo (≥ 600 mm) com profundidade nominal explícita", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 720,
      boxDepth: 650,
      drawerCount: 1,
      drawerOverrides: [{ nominalDepthMm: 600 }],
    });
    expect(layers[0].bodyDepth).toBe(580);
    expect(layers[0].metadata?.nominalDepth).toBe(600);
  });

  it("roupeiro H/J — compartimento inferior direito", () => {
    const { layers } = buildWardrobeHjDrawerScenario();
    expect(layers).toHaveLength(3);
    expect(layers[0].posX).toBeGreaterThan(0);
    expect(layers.every((l) => l.height > 0)).toBe(true);
  });

  it("cutlist completa com furação e sem duplicar gaveta_frente legado", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 600,
      boxDepth: 560,
      drawerCount: 2,
    });
    const box = minimalBoxWithDrawers(layers);
    const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const drawerPieces = cutlist.filter((p) => isDrawerPieceTipo(p.tipo));
    expect(drawerPieces).toHaveLength(10);

    const legacyFronts = cutlist.filter(
      (p) => p.tipo === "gaveta_frente" && !String(p.id).includes("drawer")
    );
    expect(legacyFronts).toHaveLength(0);

    const lat = drawerPieces.find((p) => p.tipo === "gaveta_lat_esq");
    expect(lat?.drillHoles?.length).toBeGreaterThan(0);
    const corredicaHoles = lat?.drillHoles?.filter((h) => h.holeType === "corredica") ?? [];
    expect(corredicaHoles).toHaveLength(2);
    expect(corredicaHoles.every((h) => h.face === "B")).toBe(true);
  });

  it("furação europeia na frente overlay — snapshot offsets", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 600,
      boxDepth: 560,
      drawerCount: 1,
    });
    const result = buildPanelDrillingResult(
      {
        tipo: "gaveta_frente",
        larguraMm: layers[0].width,
        alturaMm: layers[0].height,
        espessuraMm: layers[0].frontThickness ?? 19,
      },
      defaultRulesConfig
    );
    expect(result.success).toBe(true);
    const holes = result.data?.drillHoles.filter((h) => h.holeType === "corredica") ?? [];
    expect(holes.map((h) => ({ x: h.x, y: h.y, face: h.face }))).toMatchSnapshot();
  });
});
