/**
 * Módulos clêssicos — pairing CIMA/FUNDO ? laterais (CAVILHA_10x40).
 */
import { describe, expect, it } from "vitest";
import {
  buildModuleLateralEdgeCavilhaHoles,
  buildModuleTopBottomFaceCavilhaHoles,
  moduleCavilhaPairKey,
} from "./moduleClassicCavilha";
import {
  CAVILHA_10x40_FERRAGEM_ID,
  CAVILHA_EDGE_DEPTH_MM,
  CAVILHA_FACE_DEPTH_MM,
  countCavilha10x40FromEdgeHoles,
  isIndustrialEdgeCavilhaHole,
  isIndustrialFaceCavilhaHole,
} from "./cavilha10x40Rule";
import { calculateTechnicalDrillingsForPiece } from "../drilling/drillingService";
import { defaultRulesConfig } from "../rules/rulesConfig";
import { buildPanelDrillingResult } from "../../modules/drilling/drillingAdapter";
import { buildDrillFilesForProject } from "./drillExport";
import { withIndustrialOutputAuthorization } from "../industrial/industrialOutputGuard";
import type { CutListItemComPreco } from "../types";
import { buildDivSepDrilling } from "../divSep/drilling";
import {
  defaultDivisorItem,
  defaultSeparadorItem,
  DIV_SEP_TEST_RULES,
  makeDivSepTestBox,
} from "../divSep/divSepTestHelpers";

describe("moduleClassicCavilha — SSOT módulos", () => {
  it("laterais 10–30 + cima/fundo 10–13 partilham pairedHoleKey", () => {
    const le = buildModuleLateralEdgeCavilhaHoles({
      panelDepthMm: 560,
      panelHeightMm: 720,
      thicknessMm: 19,
      side: "lateral_esquerda",
    });
    const ld = buildModuleLateralEdgeCavilhaHoles({
      panelDepthMm: 560,
      panelHeightMm: 720,
      thicknessMm: 19,
      side: "lateral_direita",
    });
    const cima = buildModuleTopBottomFaceCavilhaHoles({
      tipo: "cima",
      larguraMm: 600,
      profundidadeMm: 560,
      thicknessMm: 19,
      face: "fundo",
    });
    const fundo = buildModuleTopBottomFaceCavilhaHoles({
      tipo: "fundo",
      larguraMm: 600,
      profundidadeMm: 560,
      thicknessMm: 19,
      face: "cima",
    });

    expect(le).toHaveLength(4);
    expect(ld).toHaveLength(4);
    expect(cima).toHaveLength(4);
    expect(fundo).toHaveLength(4);

    expect(le.every((h) => isIndustrialEdgeCavilhaHole(h))).toBe(true);
    expect(
      cima.every((h) =>
        isIndustrialFaceCavilhaHole({
          diameter: h.diametro,
          depth: h.profundidade,
          holeType: h.tipo,
          topDrillable: h.topDrillable,
          holeCatalogId: h.holeCatalogId,
        })
      )
    ).toBe(true);

    const cimaKeys = new Set(cima.map((h) => h.pairedHoleKey));
    expect(cimaKeys).toEqual(
      new Set([
        moduleCavilhaPairKey("le", "top", "front"),
        moduleCavilhaPairKey("le", "top", "back"),
        moduleCavilhaPairKey("ld", "top", "front"),
        moduleCavilhaPairKey("ld", "top", "back"),
      ])
    );

    const leTop = new Set(le.filter((h) => h.pairedHoleKey?.includes("-top-")).map((h) => h.pairedHoleKey));
    const ldTop = new Set(ld.filter((h) => h.pairedHoleKey?.includes("-top-")).map((h) => h.pairedHoleKey));
    expect(new Set([...leTop, ...ldTop])).toEqual(cimaKeys);

    const fundoKeys = new Set(fundo.map((h) => h.pairedHoleKey));
    const leBot = new Set(le.filter((h) => h.pairedHoleKey?.includes("-bottom-")).map((h) => h.pairedHoleKey));
    const ldBot = new Set(ld.filter((h) => h.pairedHoleKey?.includes("-bottom-")).map((h) => h.pairedHoleKey));
    expect(new Set([...leBot, ...ldBot])).toEqual(fundoKeys);

    expect(countCavilha10x40FromEdgeHoles([...le, ...ld])).toBe(8);
  });

  it("calcCavilha (drillingService) já não gera profundidade 10", () => {
    const holes = calculateTechnicalDrillingsForPiece(
      { tipo: "cima", largura: 600, altura: 560, espessura: 19 },
      defaultRulesConfig
    );
    const cav = holes.filter((h) => h.tipo === "cavilha");
    expect(cav).toHaveLength(4);
    expect(cav.every((h) => h.profundidade === CAVILHA_FACE_DEPTH_MM)).toBe(true);
    expect(cav.every((h) => h.diametro === 10)).toBe(true);
    expect(cav.every((h) => h.ferragemId === CAVILHA_10x40_FERRAGEM_ID)).toBe(true);
    expect(cav.every((h) => h.pairedHoleKey)).toBe(true);
  });

  it("XML CIMA Depth=13; LATERAL Depth=30", () => {
    const { cimaXml, latXml } = withIndustrialOutputAuthorization("all", () => {
      const cimaDrill = buildPanelDrillingResult(
        { tipo: "cima", larguraMm: 600, alturaMm: 560, espessuraMm: 19 },
        defaultRulesConfig
      );
      expect(cimaDrill.success).toBe(true);
      const latHoles = buildModuleLateralEdgeCavilhaHoles({
        panelDepthMm: 560,
        panelHeightMm: 682,
        thicknessMm: 19,
        side: "lateral_esquerda",
      });
      const items: CutListItemComPreco[] = [
        {
          id: "cima",
          nome: "CIMA",
          tipo: "cima",
          quantidade: 1,
          dimensoes: { largura: 600, altura: 560, profundidade: 19 },
          espessura: 19,
          material: "mdf",
          drillHoles: cimaDrill.data!.drillHoles,
          precoUnitario: 0,
          precoTotal: 0,
          metadata: { qrCode: "MOD_CIMA_01" },
        },
        {
          id: "lat",
          nome: "LAT_ESQ",
          tipo: "lateral_esquerda",
          quantidade: 1,
          dimensoes: { largura: 560, altura: 682, profundidade: 19 },
          espessura: 19,
          material: "mdf",
          drillHoles: latHoles,
          precoUnitario: 0,
          precoTotal: 0,
          metadata: { qrCode: "MOD_LAT_01" },
        },
      ];
      const files = buildDrillFilesForProject(items, {
        projectName: "MOD",
        boxes: [],
        rules: defaultRulesConfig,
      });
      return {
        cimaXml: files.find((f) => f.xml.includes("<Depth>13.00</Depth>"))?.xml ?? "",
        latXml: files.find((f) => f.xml.includes("<Depth>30.00</Depth>"))?.xml ?? "",
      };
    });

    expect(cimaXml).toContain("<Depth>13.00</Depth>");
    expect(cimaXml).not.toContain("<Depth>10.00</Depth>");
    expect(cimaXml).toContain("<Diameter>10.00</Diameter>");
    expect(latXml).toContain("<Depth>30.00</Depth>");
    expect(latXml).toContain(`<Depth>${CAVILHA_EDGE_DEPTH_MM}.00</Depth>`);
  });

  it("DIV/SEP: cada 10–30 tem par 10–13 com a mesma pairedHoleKey", () => {
    const sep = defaultSeparadorItem({ id: "sep-1", positionMm: 400 });
    const div = defaultDivisorItem({
      id: "div-1",
      linkedSeparadorId: "sep-1",
      positionMm: 281,
    });
    const box = makeDivSepTestBox({
      separadores: [sep],
      divisores: [div],
    });
    const { getExtraHoles } = buildDivSepDrilling(box, box.panelIds, DIV_SEP_TEST_RULES);

    const all = [
      ...getExtraHoles("cima"),
      ...getExtraHoles("fundo"),
      ...getExtraHoles("lateral_esquerda"),
      ...getExtraHoles("lateral_direita"),
      ...getExtraHoles("separador", box.panelIds!.separadores![0]),
      ...getExtraHoles("divisorio", box.panelIds!.divisores![0]),
    ].filter((h) => h.holeType === "cavilha");

    const edges = all.filter((h) => h.topDrillable === false && h.depth === 30);
    const faces = all.filter((h) => h.topDrillable === true && h.depth === 13);
    expect(edges.length).toBeGreaterThan(0);
    expect(faces.length).toBe(edges.length);

    const faceKeys = new Set(faces.map((h) => h.pairedHoleKey));
    for (const e of edges) {
      expect(e.pairedHoleKey).toBeTruthy();
      expect(faceKeys.has(e.pairedHoleKey)).toBe(true);
      expect(e.ferragemId).toBe(CAVILHA_10x40_FERRAGEM_ID);
    }
    expect(all.every((h) => h.depth === 13 || h.depth === 30)).toBe(true);
    expect(all.every((h) => h.depth !== 10)).toBe(true);
  });
});
