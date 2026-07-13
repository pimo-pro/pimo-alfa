import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { divSepRulesStore } from "../../admin/rules/divSepRules/rulesStore";
import { DIV_SEP_RULES_DEFAULTS } from "../../admin/rules/divSepRules/rulesDefaults";
import { defaultRulesConfig } from "../rules/rulesConfig";
import {
  boxUsesDivShelfMode,
  buildDivShelfDrilling,
  resolveShelfWidthForDivSide,
  resolveVerticalCompartments,
} from "./shelfDrilling";
import { defaultDivisorItem, defaultSeparadorItem, makeDivSepTestBox, roundMm } from "./divSepTestHelpers";

const SHELF_RULES = {
  ...defaultRulesConfig,
  furos: {
    ...defaultRulesConfig.furos,
    tecnicos: {
      ...defaultRulesConfig.furos.tecnicos,
      prateleira: {
        ...defaultRulesConfig.furos.tecnicos.prateleira,
        margemTopo: 80,
        margemBase: 80,
        minFurosPorColuna: 4,
      },
    },
  },
};

describe("buildDivShelfDrilling — prateleiras com DIV", () => {
  beforeEach(() => {
    divSepRulesStore.patch({ enableShelfHoles: true });
  });

  const sep = defaultSeparadorItem({ id: "sep-shelf", positionMm: 400 });
  const div = defaultDivisorItem({
    id: "div-shelf",
    positionMm: 281,
    prateleiraLado: "direita",
  });
  const box = makeDivSepTestBox({
    dimensoes: { largura: 600, altura: 900, profundidade: 560 },
    prateleiras: 2,
    separadores: [sep],
    divisores: [div],
    panelIds: {
      divisores: ["pid-div-shelf"],
    },
  });

  it("activa modo prateleira com DIV", () => {
    expect(boxUsesDivShelfMode(box)).toBe(true);
  });

  it("cria compartimentos verticais delimitados pelos SEP", () => {
    const zones = resolveVerticalCompartments(box);
    expect(zones.length).toBeGreaterThanOrEqual(1);
  });

  it("fura apenas a lateral escolhida e o DIV", () => {
    const result = buildDivShelfDrilling(box, box.panelIds, SHELF_RULES);
    expect(result).not.toBeNull();
    expect(result!.lateral_esquerda.length).toBe(0);
    expect(result!.lateral_direita.length).toBeGreaterThan(0);
    expect(result!.divisorio.get("pid-div-shelf")?.length).toBeGreaterThan(0);
  });

  it("alinha Y dos furos entre lateral e DIV", () => {
    const result = buildDivShelfDrilling(box, box.panelIds, SHELF_RULES)!;
    const lateralYs = [...new Set(result.lateral_direita.map((h) => roundMm(h.y)))].sort((a, b) => a - b);
    const divYs = [...new Set((result.divisorio.get("pid-div-shelf") ?? []).map((h) => roundMm(h.y)))].sort(
      (a, b) => a - b
    );
    expect(divYs).toEqual(lateralYs);
  });

  it("calcula largura da prateleira sem atravessar o DIV", () => {
    const width = resolveShelfWidthForDivSide(box, div);
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThan(box.dimensoes.largura - box.espessura * 2);
  });
});

describe("buildDivShelfDrilling — flag enableShelfHoles", () => {
  afterEach(() => {
    divSepRulesStore.reset();
  });

  it("retorna null quando enableShelfHoles=false nas regras DIV/SEP", () => {
    divSepRulesStore.patch({ enableShelfHoles: false });
    const box = makeDivSepTestBox({
      prateleiras: 2,
      divisores: [defaultDivisorItem()],
    });
    expect(buildDivShelfDrilling(box, box.panelIds, SHELF_RULES)).toBeNull();
    divSepRulesStore.patch({ enableShelfHoles: DIV_SEP_RULES_DEFAULTS.enableShelfHoles });
  });

  it("retorna null quando furos de prateleira estão desactivados nas regras gerais", () => {
    const rules = {
      ...SHELF_RULES,
      furos: {
        ...SHELF_RULES.furos,
        tecnicos: {
          ...SHELF_RULES.furos.tecnicos,
          prateleira: {
            ...SHELF_RULES.furos.tecnicos.prateleira,
            enabled: false,
          },
        },
      },
    };
    const box = makeDivSepTestBox({
      prateleiras: 2,
      divisores: [defaultDivisorItem()],
    });
    expect(buildDivShelfDrilling(box, box.panelIds, rules)).toBeNull();
  });
});
