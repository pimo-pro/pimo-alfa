import { describe, expect, it } from "vitest";
import {
  addDesignPanel,
  createIndustrialDesignBox,
  findDesignPanel,
  getInnerDimensions,
  insertDesignHoleWithCavilhaPairing,
  isLeftLateral,
  nextDesignId,
  removeDesignDrillHole,
} from "./index";

describe("cavilhaPairing", () => {
  it("lateral → fundo: gera cavilha_10x13 no fundo com pairedHoleId cruzado", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const lateralLe = box.panels.find((p) => isLeftLateral(p))!;
    const fundo = box.panels.find((p) => p.tipo === "fundo")!;

    const depthPos = 80;
    const result = insertDesignHoleWithCavilhaPairing(
      box,
      lateralLe.id,
      "cavilha_10x30",
      depthPos,
      30,
      "espessura"
    );

    expect(result.pairedPanelId).toBe(fundo.id);
    expect(result.pairedHole?.holeTypeId).toBe("cavilha_10x13");
    expect(result.pairedHole?.face).toBe("face");
    expect(result.hole.pairedHoleId).toBe(result.pairedHole?.id);
    expect(result.pairedHole?.pairedHoleId).toBe(result.hole.id);

    const updatedFundo = findDesignPanel(result.box, fundo.id)!;
    expect(updatedFundo.drillHoles).toHaveLength(1);
    expect(updatedFundo.drillHoles[0].yMm).toBeCloseTo(depthPos, 0);
    expect(updatedFundo.drillHoles[0].holeTypeId).toBe("cavilha_10x13");
  });

  it("prateleira → lateral: gera cavilha correspondente na lateral", () => {
    const inner = getInnerDimensions(
      createIndustrialDesignBox({ outerWidthMm: 600, outerHeightMm: 720, outerDepthMm: 500 })
    );
    let box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const lateralLe = box.panels.find((p) => isLeftLateral(p))!;
    const shelfHeight = 350;

    box = addDesignPanel(box, {
      tipo: "prateleira",
      widthMm: inner.larguraInterna,
      heightMm: inner.profundidadeInterna,
      thicknessMm: 19,
      materialId: "default",
      positionMm: { x: 19, y: shelfHeight, z: 10 },
    });
    const prateleira = box.panels.find((p) => p.tipo === "prateleira")!;

    box = {
      ...box,
      constraints: [
        ...box.constraints,
        {
          id: nextDesignId("constraint"),
          panelAId: prateleira.id,
          panelBId: lateralLe.id,
          tipo: "encaixe_cavilha",
        },
      ],
    };

    const depthPos = 100;
    const result = insertDesignHoleWithCavilhaPairing(
      box,
      prateleira.id,
      "cavilha_10x30",
      50,
      depthPos,
      "espessura"
    );

    expect(result.pairedPanelId).toBe(lateralLe.id);
    expect(result.pairedHole?.holeTypeId).toBe("cavilha_10x13");
    expect(result.pairedHole?.xMm).toBeCloseTo(depthPos, 0);
    expect(result.pairedHole?.yMm).toBeCloseTo(shelfHeight, 0);

    const updatedLateral = findDesignPanel(result.box, lateralLe.id)!;
    expect(updatedLateral.drillHoles).toHaveLength(1);
    expect(updatedLateral.drillHoles[0].pairedHoleId).toBe(result.hole.id);
  });

  it("furo não-cavilha não gera par", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const cima = box.panels.find((p) => p.tipo === "cima")!;
    const result = insertDesignHoleWithCavilhaPairing(
      box,
      cima.id,
      "tecnico_prateleira",
      100,
      50,
      "face"
    );
    expect(result.pairedHole).toBeUndefined();
    expect(result.hole.pairedHoleId).toBeUndefined();
  });

  it("lateral superior → cima: selecciona constraint de cima (não fundo)", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const lateralLe = box.panels.find((p) => isLeftLateral(p))!;
    const cima = box.panels.find((p) => p.tipo === "cima")!;

    const result = insertDesignHoleWithCavilhaPairing(
      box,
      lateralLe.id,
      "cavilha_10x30",
      90,
      lateralLe.heightMm - 20,
      "espessura"
    );

    expect(result.pairedPanelId).toBe(cima.id);
    const updatedCima = findDesignPanel(result.box, cima.id)!;
    expect(updatedCima.drillHoles).toHaveLength(1);
    expect(updatedCima.drillHoles[0].yMm).toBeCloseTo(90, 0);
  });

  it("removeDesignDrillHole remove par cavilha em ambos os painéis", () => {
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
    const fundo = findDesignPanel(result.box, result.pairedPanelId!)!;
    expect(fundo.drillHoles).toHaveLength(1);

    const cleaned = removeDesignDrillHole(result.box, lateralLe.id, result.hole.id);
    expect(findDesignPanel(cleaned, lateralLe.id)!.drillHoles).toHaveLength(0);
    expect(findDesignPanel(cleaned, fundo.id)!.drillHoles).toHaveLength(0);
  });
});
