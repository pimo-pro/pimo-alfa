import { describe, expect, it } from "vitest";
import {
  assertDowelDoesNotThrough,
  clampDrawerEdgeDowelDepthMm,
  clampDrawerFaceDowelDepthMm,
  DRAWER_REAR_DOWEL_Y_FROM_BOTTOM_MM,
  drawerThicknessCenterMm,
  getDrawerFrontDowelYPositionsMm,
  getDrawerRearDowelYPositionsMm,
} from "./drawerDowelInterlock";
import {
  computeDrawerCostaStructuralHoles,
  computeDrawerFrenteIntStructuralHoles,
  computeDrawerLateralStructuralHoles,
} from "./DrawerDrillingRules";
import { buildPanelDrillingResult } from "../../../modules/drilling/drillingAdapter";
import { defaultRulesConfig } from "../../rules/rulesConfig";
import { buildDrillFilesForProject } from "../../drill/drillExport";
import type { CutListItemComPreco } from "../../types";
import {
  buildDrawerScenario,
  minimalBoxWithDrawers,
} from "../../../validation/drawerCertificationTestHelpers";
import { cutlistComPrecoFromBox } from "../../manufacturing/cutlistFromBoxes";
import { isDrawerPieceTipo } from "../../../services/drawerCutlistAdapter";

describe("drawerDowelInterlock  profundidade e centro", () => {
  it("clamp aresta: 16?14, 19?17, 32?30", () => {
    expect(clampDrawerEdgeDowelDepthMm(16)).toBe(14);
    expect(clampDrawerEdgeDowelDepthMm(19)).toBe(17);
    expect(clampDrawerEdgeDowelDepthMm(32)).toBe(30);
  });

  it("face 13 mm sem atravessar", () => {
    expect(clampDrawerFaceDowelDepthMm(16)).toBe(13);
    expect(clampDrawerFaceDowelDepthMm(19)).toBe(13);
    expect(clampDrawerFaceDowelDepthMm(10)).toBe(9);
    expect(assertDowelDoesNotThrough(13, 16)).toBe(true);
    expect(assertDowelDoesNotThrough(14, 16)).toBe(true);
    expect(assertDowelDoesNotThrough(16, 16)).toBe(false);
  });

  it("centro espessura = T/2", () => {
    expect(drawerThicknessCenterMm(16)).toBe(8);
    expect(drawerThicknessCenterMm(19)).toBe(9.5);
  });

  it("Y traseiro = 39 e H-39", () => {
    expect(getDrawerRearDowelYPositionsMm(150)).toEqual([39, 111]);
    expect(DRAWER_REAR_DOWEL_Y_FROM_BOTTOM_MM).toBe(39);
  });

  it("Y frontal SSOT", () => {
    expect(getDrawerFrontDowelYPositionsMm(178)).toEqual([30, 148]);
    expect(getDrawerFrontDowelYPositionsMm(178, true)).toEqual([30, 137]);
  });
});

describe.each([
  { espessura: 16, edgeDepth: 14, center: 8 },
  { espessura: 19, edgeDepth: 17, center: 9.5 },
] as const)("interlock gaveta T=$espessura", ({ espessura, edgeDepth, center }) => {
  const LAT = { largura: 500, altura: 150, espessura };
  const COSTA = { largura: 468, altura: 150, espessura };
  const FRENTE = { largura: 598, altura: 150, espessura };

  it("lateral: 4 cavilhas aresta + rasgo; prof. clamp; Y sync", () => {
    const esq = computeDrawerLateralStructuralHoles({ ...LAT, side: "esq" });
    const cavilhas = esq.filter((h) => h.tipo === "cavilha");
    expect(cavilhas).toHaveLength(4);
    expect(cavilhas.every((h) => h.profundidade === edgeDepth)).toBe(true);
    expect(cavilhas.every((h) => h.diametro === 10)).toBe(true);
    expect(cavilhas.every((h) => assertDowelDoesNotThrough(h.profundidade, espessura))).toBe(true);

    const rearYs = cavilhas.filter((h) => h.face === "tras").map((h) => h.y).sort((a, b) => a - b);
    expect(rearYs).toEqual([39, 111]);
    expect(cavilhas.filter((h) => h.face === "tras").every((h) => h.x === LAT.largura)).toBe(true);

    const frontYs = cavilhas.filter((h) => h.face === "frente").map((h) => h.y).sort((a, b) => a - b);
    expect(frontYs).toEqual([30, 120]);
  });

  it("espelho L/R: Y iguais, X invertidos", () => {
    const esq = computeDrawerLateralStructuralHoles({ ...LAT, side: "esq" });
    const dir = computeDrawerLateralStructuralHoles({ ...LAT, side: "dir" });
    expect(esq.map((h) => h.y)).toEqual(dir.map((h) => h.y));
    const esqRear = esq.filter((h) => h.tipo === "cavilha" && h.face === "tras");
    const dirRear = dir.filter((h) => h.tipo === "cavilha" && h.face === "frente");
    expect(esqRear.every((h) => h.x === LAT.largura)).toBe(true);
    expect(dirRear.every((h) => h.x === 0)).toBe(true);
  });

  it("costa ? lateral: mesmos Y; costa prof. 13", () => {
    const lat = computeDrawerLateralStructuralHoles({ ...LAT, side: "esq" });
    const costa = computeDrawerCostaStructuralHoles(COSTA);
    const latRearY = lat
      .filter((h) => h.tipo === "cavilha" && h.face === "tras")
      .map((h) => h.y)
      .sort((a, b) => a - b);
    const costaY = costa
      .filter((h) => h.tipo === "cavilha")
      .map((h) => h.y)
      .filter((y, i, a) => a.indexOf(y) === i)
      .sort((a, b) => a - b);
    expect(costaY).toEqual(latRearY);
    expect(costa.filter((h) => h.tipo === "cavilha").every((h) => h.profundidade === 13)).toBe(true);
    expect(costa.filter((h) => h.tipo === "cavilha").every((h) => assertDowelDoesNotThrough(h.profundidade, espessura))).toBe(
      true
    );
    void center;
  });

  it("frente ? lateral: mesmos Y; frente prof. 13", () => {
    const lat = computeDrawerLateralStructuralHoles({ ...LAT, side: "esq" });
    const frente = computeDrawerFrenteIntStructuralHoles(FRENTE);
    const latFrontY = lat
      .filter((h) => h.tipo === "cavilha" && h.face === "frente")
      .map((h) => h.y)
      .sort((a, b) => a - b);
    const frenteY = frente
      .map((h) => h.y)
      .filter((y, i, a) => a.indexOf(y) === i)
      .sort((a, b) => a - b);
    expect(frenteY).toEqual(latFrontY);
    expect(frente.every((h) => h.profundidade === 13 && h.tipo === "cavilha")).toBe(true);
  });
});

describe("stack 3 gavetas  Y frontais lowest", () => {
  it("gaveta mais baixa usa H-41 no pino inferior", () => {
    const holes = computeDrawerFrenteIntStructuralHoles({
      largura: 600,
      altura: 178,
      espessura: 16,
      isLowestDrawer: true,
    });
    const ys = [...new Set(holes.map((h) => h.y))].sort((a, b) => a - b);
    expect(ys).toEqual([30, 137]);
  });
});

describe("XML / CNC alinhado com coordenadas SSOT", () => {
  function xmlFor(tipo: string, dims: { largura: number; altura: number; espessura: number }) {
    const drilling = buildPanelDrillingResult(
      {
        tipo,
        larguraMm: dims.largura,
        alturaMm: dims.altura,
        espessuraMm: dims.espessura,
      },
      defaultRulesConfig
    );
    expect(drilling.success).toBe(true);
    const item: CutListItemComPreco = {
      id: `${tipo}-xml`,
      nome: tipo,
      tipo,
      quantidade: 1,
      dimensoes: {
        largura: dims.largura,
        altura: dims.altura,
        profundidade: dims.espessura,
      },
      espessura: dims.espessura,
      material: "mdf_branco",
      drillHoles: drilling.data!.drillHoles,
      precoUnitario: 0,
      precoTotal: 0,
    };
    return buildDrillFilesForProject([item], {
      projectName: "DowelInterlock",
      boxes: [],
      rules: defaultRulesConfig,
    })[0]!.xml;
  }

  it("LAT_ESQ T16: Y=39/111 traseiro, Z=T/2, Depth=14", () => {
    const xml = xmlFor("gaveta_lat_esq", { largura: 500, altura: 150, espessura: 16 });
    expect(xml).toContain("<Y1>39.00</Y1>");
    expect(xml).toContain("<Y1>111.00</Y1>");
    expect(xml).toContain("<Z1>8.00</Z1>");
    expect(xml).toContain("<Depth>14.00</Depth>");
    expect(xml).toContain("<X1>500.00</X1>");
  });

  it("LAT_ESQ T19: Depth=17, Z=9.5", () => {
    const xml = xmlFor("gaveta_lat_esq", { largura: 500, altura: 150, espessura: 19 });
    expect(xml).toContain("<Z1>9.50</Z1>");
    expect(xml).toContain("<Depth>17.00</Depth>");
  });

  it("COSTA: mesmos Y, Depth=13", () => {
    const xml = xmlFor("gaveta_traseira", { largura: 468, altura: 150, espessura: 16 });
    expect(xml).toContain("<Y1>39.00</Y1>");
    expect(xml).toContain("<Y1>111.00</Y1>");
    expect(xml).toContain("<Depth>13.00</Depth>");
  });

  it("pipeline stack 3 — laterais/costa/frente com profundidade segura", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 720,
      boxDepth: 560,
      drawerCount: 3,
    });
    const box = minimalBoxWithDrawers(layers);
    const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig).filter((p) =>
      isDrawerPieceTipo(p.tipo)
    );
    expect(cutlist.length).toBeGreaterThanOrEqual(9);

    const structuralTipos = ["gaveta_lat_esq", "gaveta_lat_dir", "gaveta_traseira", "gaveta_frente", "gaveta_frente_int"];
    for (const tipo of structuralTipos) {
      const sample = cutlist.find((p) => p.tipo === tipo) ?? {
        tipo,
        dimensoes: { largura: 500, altura: 150, profundidade: 16 },
        espessura: 16,
      };
      const rebuilt = buildPanelDrillingResult(
        {
          tipo: sample.tipo,
          larguraMm: sample.dimensoes?.largura ?? 500,
          alturaMm: sample.dimensoes?.altura ?? 150,
          espessuraMm: sample.espessura ?? sample.dimensoes?.profundidade ?? 16,
        },
        defaultRulesConfig
      );
      expect(rebuilt.success).toBe(true);
      expect((rebuilt.data?.drillHoles.length ?? 0) > 0).toBe(true);
      const t = sample.espessura ?? 16;
      for (const h of rebuilt.data?.drillHoles ?? []) {
        if (h.holeSubtype === "groove") continue;
        expect(h.depth).toBeLessThan(t);
      }
    }
  });
});
