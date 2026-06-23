import { describe, expect, it } from "vitest";
import { cutlistComPrecoFromBox } from "../core/manufacturing/cutlistFromBoxes";
import { defaultRulesConfig } from "../core/rules/rulesConfig";
import {
  DRAWER_SLIDES_PER_DRAWER,
  extractDrawerHardwareSummaryFromLayerItems,
  extractDrawerIndustrialBomFromLayerItems,
  isDrawerPieceTipo,
} from "../services/drawerCutlistAdapter";
import {
  buildDrawerScenario,
  classifyDrawerPieceForEtiqueta,
  minimalBoxWithDrawers,
} from "./drawerCertificationTestHelpers";

const EXPECTED_ETIQUETA_KINDS: Record<string, string> = {
  gaveta_frente_int: "FRENTE_GAVETA",
  gaveta_frente_ext: "FRENTE_GAVETA",
  gaveta_frente: "FRENTE_GAVETA",
  gaveta_lat_esq: "GAV_LATERAIS",
  gaveta_lat_dir: "GAV_LATERAIS",
  gaveta_fundo: "FUNDO_GAVETA",
  gaveta_traseira: "GAV_TRAS",
};

describe("Certificação PDF — etiquetas e BOM de gavetas", () => {
  it("classifica tipos de peça para etiquetas industriais", () => {
    for (const [tipo, kind] of Object.entries(EXPECTED_ETIQUETA_KINDS)) {
      expect(classifyDrawerPieceForEtiqueta(tipo, `Gaveta 1 - ${tipo}`)).toBe(kind);
    }
    expect(classifyDrawerPieceForEtiqueta("gaveta_frente", "CAIXA1_GAV_FREN")).toBe("FRENTE_GAVETA");
    expect(classifyDrawerPieceForEtiqueta("gaveta_lat_esq", "PEC_GAV_LAT")).toBe("GAV_LATERAIS");
  });

  it("medidas na cutlist coincidem com layers", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 600,
      boxDepth: 560,
      drawerCount: 2,
    });
    const box = minimalBoxWithDrawers(layers, { gavetas: 2 });
    const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const drawerPieces = cutlist.filter((p) => isDrawerPieceTipo(p.tipo));

    drawerPieces
      .filter((p) => p.tipo === "gaveta_frente_ext")
      .forEach((p, i) => {
        expect(p.dimensoes.largura).toBe(layers[i].width);
        expect(p.dimensoes.altura).toBe(layers[i].height);
        expect(p.espessura).toBe(layers[i].frontThickness);
      });
  });

  it("materiais propagados nas peças de gaveta", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 400,
      boxDepth: 560,
      drawerCount: 1,
    });
    const box = minimalBoxWithDrawers(layers);
    const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const drawerPieces = cutlist.filter((p) => isDrawerPieceTipo(p.tipo));
    drawerPieces.forEach((p) => {
      expect(p.material).toBeTruthy();
      expect(p.espessura).toBeGreaterThan(0);
    });
  });

  it("ferragens — 2 corrediças por gaveta, softClose e slideType", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 400,
      boxDepth: 560,
      drawerCount: 3,
      slideType: "Blum Movento",
      softClose: true,
    });
    const hardware = extractDrawerHardwareSummaryFromLayerItems(layers);
    expect(hardware).toHaveLength(3);
    hardware.forEach((h) => {
      expect(h.slideQuantity).toBe(DRAWER_SLIDES_PER_DRAWER);
      expect(h.slideType).toBe("Blum Movento");
      expect(h.softClose).toBe(true);
      expect(h.slideLengthMm).toBeGreaterThan(0);
    });

    const bom = extractDrawerIndustrialBomFromLayerItems(layers);
    expect(bom.pieces.length).toBe(18);
    expect(bom.hardware.length).toBe(3);
  });

  it("sem peças duplicadas por id na cutlist", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 600,
      boxDepth: 560,
      drawerCount: 4,
    });
    const box = minimalBoxWithDrawers(layers, { gavetas: 4 });
    const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const drawerPieces = cutlist.filter((p) => isDrawerPieceTipo(p.tipo));
    const ids = drawerPieces.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sem peças faltando — 6 tipos por gaveta normal", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 600,
      boxDepth: 560,
      drawerCount: 2,
    });
    const box = minimalBoxWithDrawers(layers);
    const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const drawerPieces = cutlist.filter((p) => isDrawerPieceTipo(p.tipo));
    const required = [
      "gaveta_frente_int",
      "gaveta_frente_ext",
      "gaveta_lat_esq",
      "gaveta_lat_dir",
      "gaveta_fundo",
      "gaveta_traseira",
    ];
    required.forEach((tipo) => {
      expect(drawerPieces.filter((p) => p.tipo === tipo).length).toBe(2);
    });
  });

  it("caixa metálica — etiqueta só FRENTE_GAVETA", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 400,
      boxDepth: 560,
      drawerCount: 1,
      metalBoxType: "Blum Metabox",
    });
    const box = minimalBoxWithDrawers(layers);
    const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const kinds = cutlist
      .filter((p) => isDrawerPieceTipo(p.tipo))
      .map((p) => classifyDrawerPieceForEtiqueta(p.tipo, p.nome));
    expect(kinds).toEqual(["FRENTE_GAVETA", "FRENTE_GAVETA"]);
  });
});
