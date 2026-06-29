import { describe, expect, it } from "vitest";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { DrillPanelKey, TechnicalDrillHole } from "../types";
import { buildDrillFilesForProject } from "../drill/drillExport";
import {
  buildCutListFromDesignBox,
  buildDrillFilesFromDesignBox,
  designDrillHoleToPanelDrillHole,
  resolveDesignPanelCutListTipo,
} from "./designToCutlist";
import {
  buildViewerDrillMarkersFromDesign,
  createIndustrialDesignBox,
  designDrillHoleToTechnical,
  insertDesignHoleWithCavilhaPairing,
  isLeftLateral,
  setActiveHoleOnPanel,
} from "./index";
import type { DesignPanel } from "./types";

const project = {
  projectName: "TESTE_DESIGN",
  boxes: [],
  rules: defaultRulesConfig,
};

function markerKeyForPanel(panel: DesignPanel): DrillPanelKey | null {
  const tipo = resolveDesignPanelCutListTipo(panel);
  if (tipo === "lateral_esquerda") return "lateral_esquerda";
  if (tipo === "lateral_direita") return "lateral_direita";
  if (tipo === "cima") return "cima";
  if (tipo === "fundo") return "fundo";
  if (tipo === "porta") return "porta";
  return null;
}

function collectMarkerTechnicals(
  panel: DesignPanel,
  markers: ReturnType<typeof buildViewerDrillMarkersFromDesign>
): TechnicalDrillHole[] {
  const key = markerKeyForPanel(panel);
  if (!key) return [];
  if (key === "porta") return markers.porta ?? [];
  return markers[key] ?? [];
}

describe("designToCutlist — DesignPanel → CutListItem", () => {
  it("mapeia painéis estruturais com dimensões e tipos industriais", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
      espessuraMm: 19,
      materialId: "mdf_branco",
    });
    const cutlist = buildCutListFromDesignBox(box);

    expect(cutlist.length).toBe(box.panels.length);

    const cima = cutlist.find((i) => i.tipo === "cima")!;
    expect(cima.dimensoes.largura).toBe(562);
    expect(cima.dimensoes.altura).toBe(481);
    expect(cima.espessura).toBe(19);
    expect(cima.material).toBe("mdf_branco");
    expect(cima.boxId).toBe(box.id);
    expect(cima.metadata).toMatchObject({ designWorkspace: true });

    const lateralLe = cutlist.find((i) => i.tipo === "lateral_esquerda")!;
    expect(lateralLe.nome).toBe("Lateral esquerda");
    expect(lateralLe.dimensoes.largura).toBe(481);
    expect(lateralLe.dimensoes.altura).toBe(682);

    const costa = cutlist.find((i) => i.tipo === "COSTA")!;
    expect(costa.espessura).toBe(10);
  });
});

describe("designToCutlist — SSOT viewer = cutlist", () => {
  it("furos da cutlist coincidem com marcadores do viewer (coords + catálogo)", () => {
    let box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const cima = box.panels.find((p) => p.tipo === "cima")!;
    const lateralLe = box.panels.find((p) => isLeftLateral(p))!;

    ({ box } = setActiveHoleOnPanel(box, cima.id, "tecnico_prateleira", 100, 50, "face"));
    box = insertDesignHoleWithCavilhaPairing(
      box,
      lateralLe.id,
      "cavilha_10x30",
      80,
      40,
      "espessura"
    ).box;

    const cutlist = buildCutListFromDesignBox(box);
    const markers = buildViewerDrillMarkersFromDesign(box);

    for (const panel of box.panels) {
      if (!panel.drillHoles.length) continue;

      const cutItem = cutlist.find((i) => i.id === panel.id)!;
      expect(cutItem.drillHoles?.length).toBe(panel.drillHoles.length);

      const viewerHoles = collectMarkerTechnicals(panel, markers);
      expect(viewerHoles.length).toBe(panel.drillHoles.length);

      panel.drillHoles.forEach((designHole, idx) => {
        const technical = designDrillHoleToTechnical(designHole, panel.tipo);
        const panelHole = designDrillHoleToPanelDrillHole(designHole, panel);
        const cutHole = cutItem.drillHoles![idx];
        const viewerHole = viewerHoles[idx];

        expect(panelHole.x).toBe(technical.x);
        expect(panelHole.y).toBe(technical.y);
        expect(panelHole.diameter).toBe(technical.diametro);
        expect(panelHole.depth).toBe(technical.profundidade);

        expect(cutHole.x).toBe(technical.x);
        expect(cutHole.y).toBe(technical.y);
        expect(cutHole.diameter).toBe(technical.diametro);
        expect(cutHole.depth).toBe(technical.profundidade);

        expect(viewerHole.x).toBe(technical.x);
        expect(viewerHole.y).toBe(technical.y);
        expect(viewerHole.diametro).toBe(technical.diametro);
        expect(viewerHole.profundidade).toBe(technical.profundidade);
        expect(viewerHole.tipo).toBe(technical.tipo);
      });
    }
  });
});

describe("designToCutlist — TXML via drillExport", () => {
  it("exporta TXML com diâmetros do catálogo para lateral + fundo (cavilha pairing)", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const lateralLe = box.panels.find((p) => isLeftLateral(p))!;

    const result = insertDesignHoleWithCavilhaPairing(
      box,
      lateralLe.id,
      "cavilha_10x30",
      80,
      40,
      "espessura"
    );

    const files = buildDrillFilesFromDesignBox(result.box, project);
    expect(files.length).toBeGreaterThanOrEqual(2);

    const lateralFile = files.find((f) => f.partName === "Lateral esquerda");
    const fundoFile = files.find((f) => f.partName === "Fundo");
    expect(lateralFile?.xml).toContain("KDTPanelFormat");
    expect(lateralFile?.xml).toContain("Diameter>10.00");
    expect(lateralFile?.xml).toContain("Depth>30.00");
    expect(fundoFile?.xml).toContain("Diameter>10.00");
    expect(fundoFile?.xml).toContain("Depth>13.00");
  });

  it("buildDrillFilesFromDesignBox é equivalente a cutlist + buildDrillFilesForProject", () => {
    let box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const cima = box.panels.find((p) => p.tipo === "cima")!;
    ({ box } = setActiveHoleOnPanel(box, cima.id, "tecnico_prateleira", 120, 60, "face"));

    const fromDesign = buildDrillFilesFromDesignBox(box, project);
    const cutlist = buildCutListFromDesignBox(box).map((item) => ({
      ...item,
      precoUnitario: 0,
      precoTotal: 0,
    }));
    const fromCutlist = buildDrillFilesForProject(cutlist, project);

    expect(fromDesign.length).toBe(fromCutlist.length);
    expect(fromDesign[0]?.xml).toBe(fromCutlist[0]?.xml);
    expect(fromDesign[0]?.xml).toContain("Diameter>5.00");
  });
});
