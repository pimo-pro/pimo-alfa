import { describe, expect, it } from "vitest";
import { HOLE_CATALOG, getHoleTypeById, getPairedHoleTypeId } from "../drill/holeCatalog";
import {
  createIndustrialDesignBox,
  setActiveHoleOnPanel,
  buildViewerDrillMarkersFromDesign,
} from "./index";
import { meshLocalPointToHoleMm } from "./panelHitCoords";

describe("holeCatalog", () => {
  it("contém par de cavilha frente/verso", () => {
    const edge = getHoleTypeById("cavilha_10x30");
    const face = getHoleTypeById("cavilha_10x13");
    expect(edge.face).toBe("espessura");
    expect(face.face).toBe("face");
    expect(edge.diametroMm).toBe(10);
    expect(edge.profundidadeMm).toBe(30);
    expect(face.profundidadeMm).toBe(13);
    expect(getPairedHoleTypeId("cavilha_10x30")).toBe("cavilha_10x13");
    expect(getPairedHoleTypeId("cavilha_10x13")).toBe("cavilha_10x30");
  });

  it("todos os IDs do catálogo são únicos", () => {
    const ids = HOLE_CATALOG.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("designModel", () => {
  it("cria caixa com painéis estruturais", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    expect(box.panels.length).toBeGreaterThanOrEqual(5);
    expect(box.constraints.some((c) => c.tipo === "encaixe_cavilha")).toBe(true);
  });

  it("adiciona furo a um painel", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const panel = box.panels[0];
    const { box: updated, hole } = setActiveHoleOnPanel(
      box,
      panel.id,
      "cavilha_10x30",
      60,
      60,
      "espessura"
    );
    const found = updated.panels.find((p) => p.id === panel.id);
    expect(found?.drillHoles).toHaveLength(1);
    expect(hole.xMm).toBe(60);
    expect(hole.holeTypeId).toBe("cavilha_10x30");
  });
});

describe("designToViewer", () => {
  it("converte furos do design em marcadores do viewer", () => {
    let box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const cima = box.panels.find((p) => p.tipo === "cima")!;
    ({ box } = setActiveHoleOnPanel(box, cima.id, "tecnico_prateleira", 100, 50, "face"));
    const markers = buildViewerDrillMarkersFromDesign(box);
    expect(markers.cima.length).toBe(1);
    expect(markers.cima[0].tipo).toBe("prateleira");
    expect(markers.cima[0].diametro).toBe(5);
  });
});

describe("panelHitCoords", () => {
  it("converte ponto local do topo em mm", () => {
    const width = 0.562;
    const depth = 0.481;
    const coords = meshLocalPointToHoleMm(0, -0.0095, 0, {
      panelType: "top",
      width,
      height: depth,
      thickness: 0.019,
    });
    expect(coords).not.toBeNull();
    expect(coords!.xMm).toBeCloseTo((width / 2) * 1000, 0);
    expect(coords!.yMm).toBeCloseTo((depth / 2) * 1000, 0);
  });
});
