import { describe, expect, it } from "vitest";
import { cutlistToPieces } from "../core/cutlayout/cutLayoutEngine";
import {
  buildCutLayoutProPartName,
  cutlistItemsWithCutLayoutProNames,
  piecePrefixForCutLayoutPro,
} from "../core/cutlayout/cutLayoutProPieceNaming";
import { cutlistComPrecoFromBox } from "../core/manufacturing/cutlistFromBoxes";
import { defaultRulesConfig } from "../core/rules/rulesConfig";
import { isDrawerPieceTipo } from "../services/drawerCutlistAdapter";
import {
  buildDrawerScenario,
  minimalBoxWithDrawers,
} from "./drawerCertificationTestHelpers";

const EXPECTED_DRAWER_PREFIXES: Record<string, string> = {
  gaveta_frente: "gav_fre",
  gaveta_lat_esq: "gav_lat",
  gaveta_lat_dir: "gav_lat",
  gaveta_fundo: "gav_fun",
  gaveta_traseira: "gav_tra",
};

describe("Certificação CNC — peças de gaveta", () => {
  it("prefixos Layout PRO corretos por tipo", () => {
    for (const [tipo, prefix] of Object.entries(EXPECTED_DRAWER_PREFIXES)) {
      expect(piecePrefixForCutLayoutPro({ tipo })).toBe(prefix);
    }
  });

  it("nome CNC composto boxPrefix_piecePrefix", () => {
    const name = buildCutLayoutProPartName(
      { tipo: "gaveta_frente", nome: "Gaveta 1 - Frente" },
      "Módulo 1",
      "Projeto Teste"
    );
    expect(name).toMatch(/_gav_fre$/);
  });

  it("espessura, orientação e dimensões corretas na cutlist industrial", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 600,
      boxDepth: 560,
      drawerCount: 1,
    });
    const box = minimalBoxWithDrawers(layers);
    const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const drawerPieces = cutlist.filter((p) => isDrawerPieceTipo(p.tipo));

    const front = drawerPieces.find((p) => p.tipo === "gaveta_frente");
    expect(front?.espessura).toBe(19);
    expect(front?.grainDirection).toBe("horizontal");
    expect(front?.dimensoes.largura).toBe(560);
    expect(front?.dimensoes.altura).toBeGreaterThan(0);

    const lat = drawerPieces.find((p) => p.tipo === "gaveta_lat_esq");
    expect(lat?.espessura).toBe(16);
    expect(lat?.grainDirection).toBe("vertical");

    const fundo = drawerPieces.find((p) => p.tipo === "gaveta_fundo");
    expect(fundo?.espessura).toBe(10);
  });

  it("furos corrediça — diâmetro, profundidade, offsets e face B", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 600,
      boxDepth: 560,
      drawerCount: 1,
    });
    const box = minimalBoxWithDrawers(layers);
    const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const lat = cutlist.find((p) => p.tipo === "gaveta_lat_esq");
    const holes = lat?.drillHoles?.filter((h) => h.holeType === "corredica") ?? [];

    expect(holes).toHaveLength(2);
    holes.forEach((h) => {
      expect(h.diameter).toBeGreaterThan(0);
      expect(h.depth).toBeGreaterThan(0);
      expect(h.face).toBe("B");
      expect(h.x).toBeGreaterThan(0);
      expect(h.y).toBeGreaterThan(0);
    });

    const left = cutlist.find((p) => p.tipo === "gaveta_lat_esq");
    const right = cutlist.find((p) => p.tipo === "gaveta_lat_dir");
    if (left?.drillHoles?.length && right?.drillHoles?.length) {
      expect(left.drillHoles[0].x).toBe(right.drillHoles[0].x);
      expect(left.drillHoles.map((h) => h.y)).toEqual(right.drillHoles.map((h) => h.y));
    }
  });

  it("caixa metálica — sem laterais/fundo/traseira e sem furos laterais", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 400,
      boxDepth: 560,
      drawerCount: 1,
      metalBoxType: "Blum Metabox",
    });
    const box = minimalBoxWithDrawers(layers);
    const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const drawerPieces = cutlist.filter((p) => isDrawerPieceTipo(p.tipo));
    expect(drawerPieces.map((p) => p.tipo)).toEqual(["gaveta_frente"]);
    expect(drawerPieces[0].drillHoles?.filter((h) => h.holeType === "corredica").length ?? 0).toBeGreaterThan(0);
  });

  it("cutlistToPieces + nomes PRO geram partName estável", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 400,
      boxDepth: 560,
      drawerCount: 1,
    });
    const box = minimalBoxWithDrawers(layers, { nome: "Base 01" });
    const raw = cutlistComPrecoFromBox(box, defaultRulesConfig).filter((p) => isDrawerPieceTipo(p.tipo));
    const renamed = cutlistItemsWithCutLayoutProNames(raw, "NP001", { [box.id]: box.nome });
    const pieces = cutlistToPieces(
      renamed.map((item) => ({
        id: item.id,
        nome: item.nome,
        tipo: item.tipo,
        boxId: item.boxId,
        dimensoes: item.dimensoes,
        espessura: item.espessura,
        drillHoles: item.drillHoles,
        quantidade: item.quantidade,
      }))
    );

    expect(pieces.length).toBeGreaterThan(0);
    pieces.forEach((p) => {
      expect(p.partName).toMatch(/_gav_(fre|lat|fun|tra)$/);
      expect(p.largura_mm).toBeGreaterThan(0);
      expect(p.altura_mm).toBeGreaterThan(0);
    });
  });

  it("peças de gaveta expõem drillHoles prontos para export CNC", () => {
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: 600,
      boxDepth: 560,
      drawerCount: 2,
    });
    const box = minimalBoxWithDrawers(layers);
    const items = cutlistComPrecoFromBox(box, defaultRulesConfig).filter((p) => isDrawerPieceTipo(p.tipo));

    const withHoles = items.filter((p) => (p.drillHoles?.length ?? 0) > 0);
    expect(withHoles.length).toBeGreaterThanOrEqual(4);
    withHoles.forEach((item) => {
      item.drillHoles!.forEach((h) => {
        expect(h.diameter).toBeGreaterThan(0);
        expect(h.depth).toBeGreaterThan(0);
        expect(["A", "B", undefined]).toContain(h.face);
      });
    });
  });
});
