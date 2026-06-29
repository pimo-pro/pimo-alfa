import { describe, expect, it } from "vitest";
import {
  addDesignPanel,
  applyAutoAdjustPanelToInnerSpace,
  aabbHasVolumeOverlap,
  autoAdjustPanelToInnerSpace,
  computePanelAabb,
  createIndustrialDesignBox,
  DesignValidationError,
  getInnerDimensions,
  insertDesignHoleWithCavilhaPairing,
  isLeftLateral,
  validateIndustrialDesignBox,
  validateInternalPanelDimensions,
} from "./index";

describe("validateInternalPanelDimensions", () => {
  it("prateleira maior que espaço interno → alerta (warning)", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const inner = getInnerDimensions(box);
    const issues = validateInternalPanelDimensions(box, {
      id: "shelf-1",
      tipo: "prateleira",
      widthMm: inner.larguraInterna + 50,
      heightMm: inner.profundidadeInterna + 20,
      thicknessMm: 19,
      materialId: "default",
      drillHoles: [],
    });
    expect(issues.some((i) => i.code === "PANEL_EXCEEDS_INNER_WIDTH")).toBe(true);
    expect(issues.some((i) => i.code === "PANEL_EXCEEDS_INNER_DEPTH")).toBe(true);
    expect(issues.every((i) => i.severity === "warning")).toBe(true);
  });

  it("autoAdjustPanelToInnerSpace encaixa prateleira no espaço interno", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const inner = getInnerDimensions(box);
    const oversized = {
      id: "shelf-1",
      tipo: "prateleira" as const,
      widthMm: inner.larguraInterna + 100,
      heightMm: inner.profundidadeInterna + 80,
      thicknessMm: 19,
      materialId: "default",
      drillHoles: [],
    };
    const adjusted = autoAdjustPanelToInnerSpace(box, oversized);
    expect(adjusted.widthMm).toBe(inner.larguraInterna);
    expect(adjusted.heightMm).toBe(inner.profundidadeInterna);
  });
});

describe("interpenetração", () => {
  it("divisória atravessando lateral → bloqueio", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const inner = getInnerDimensions(box);

    expect(() =>
      addDesignPanel(box, {
        tipo: "divisoria",
        widthMm: inner.profundidadeInterna,
        heightMm: inner.alturaInterna,
        thicknessMm: 19,
        materialId: "default",
        positionMm: { x: 2, y: 19, z: 10 },
      })
    ).toThrow(DesignValidationError);

    const issues = validateIndustrialDesignBox({
      ...box,
      panels: [
        ...box.panels,
        {
          id: "div-bad",
          tipo: "divisoria",
          widthMm: inner.profundidadeInterna,
          heightMm: inner.alturaInterna,
          thicknessMm: 19,
          materialId: "default",
          drillHoles: [],
          positionMm: { x: 2, y: 19, z: 10 },
        },
      ],
    });
    expect(
      issues.some(
        (i) => i.code === "PANEL_OUTSIDE_CAVITY" || i.code === "PANEL_INTERPENETRATION"
      )
    ).toBe(true);
  });

  it("painel deslocado para dentro de outro → bloqueio", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const inner = getInnerDimensions(box);
    const cavity = { x: 19, y: 300, z: 10 };

    const withFirstShelf = addDesignPanel(box, {
      tipo: "prateleira",
      widthMm: inner.larguraInterna,
      heightMm: inner.profundidadeInterna,
      thicknessMm: 19,
      materialId: "default",
      positionMm: cavity,
    });

    expect(() =>
      addDesignPanel(withFirstShelf, {
        id: "shelf-2",
        tipo: "prateleira",
        widthMm: inner.larguraInterna,
        heightMm: inner.profundidadeInterna,
        thicknessMm: 19,
        materialId: "default",
        positionMm: cavity,
      })
    ).toThrow(DesignValidationError);
  });
});

describe("furos", () => {
  it("inserção de furo colidente → impedir", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const lateralLe = box.panels.find((p) => isLeftLateral(p))!;

    const first = insertDesignHoleWithCavilhaPairing(
      box,
      lateralLe.id,
      "cavilha_10x30",
      80,
      30,
      "espessura"
    );

    expect(() =>
      insertDesignHoleWithCavilhaPairing(
        first.box,
        lateralLe.id,
        "cavilha_10x30",
        82,
        32,
        "espessura"
      )
    ).toThrow(DesignValidationError);
  });

  it("furo fora dos limites → impedir", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const cima = box.panels.find((p) => p.tipo === "cima")!;

    expect(() =>
      insertDesignHoleWithCavilhaPairing(box, cima.id, "cavilha_10x30", -5, 50, "espessura")
    ).toThrow(DesignValidationError);
  });
});

describe("applyAutoAdjustPanelToInnerSpace", () => {
  it("ajusta dimensões de prateleira oversized no modelo", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const inner = getInnerDimensions(box);

    let withShelf: ReturnType<typeof createIndustrialDesignBox> = {
      ...box,
      panels: [
        ...box.panels,
        {
          id: "shelf-big",
          tipo: "prateleira",
          widthMm: inner.larguraInterna + 40,
          heightMm: inner.profundidadeInterna,
          thicknessMm: 19,
          materialId: "default",
          drillHoles: [],
          positionMm: { x: 19, y: 200, z: 10 },
        },
      ],
    };

    const warnings = validateIndustrialDesignBox(withShelf).filter((i) => i.severity === "warning");
    expect(warnings.some((i) => i.code === "PANEL_EXCEEDS_INNER_WIDTH")).toBe(true);

    withShelf = applyAutoAdjustPanelToInnerSpace(withShelf, "shelf-big");
    const shelf = withShelf.panels.find((p) => p.id === "shelf-big")!;
    expect(shelf.widthMm).toBe(inner.larguraInterna);
    expect(validateIndustrialDesignBox(withShelf).filter((i) => i.code === "PANEL_EXCEEDS_INNER_WIDTH")).toHaveLength(0);
  });
});

describe("computePanelAabb", () => {
  it("prateleira dentro da cavidade não intersecta lateral em volume", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const inner = getInnerDimensions(box);
    const shelf = {
      id: "s",
      tipo: "prateleira" as const,
      widthMm: inner.larguraInterna,
      heightMm: inner.profundidadeInterna,
      thicknessMm: 19,
      materialId: "default",
      drillHoles: [],
      positionMm: { x: 19, y: 200, z: 10 },
    };
    const shelfAabb = computePanelAabb(box, shelf);
    const lateral = box.panels.find((p) => isLeftLateral(p))!;
    const lateralAabb = computePanelAabb(box, lateral);
    expect(aabbHasVolumeOverlap(shelfAabb, lateralAabb)).toBe(false);
  });
});
