import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { divSepRulesStore } from "../../admin/rules/divSepRules/rulesStore";
import { DIV_SEP_RULES_DEFAULTS } from "../../admin/rules/divSepRules/rulesDefaults";
import { defaultRulesConfig } from "../rules/rulesConfig";
import { getDivSepInternalDims, resolveDivisorDimensions } from "./dimensions";
import { resolveSeparadorBottomY } from "./coupling";
import {
  boxUsesDivShelfMode,
  buildDivShelfDrilling,
  countDivShelfPanels,
  MIN_ABOVE_SEP_SHELF_HEIGHT_MM,
  resolveDivShelfPlacementZones,
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

function toAbsoluteLateralYs(boxHeight: number, ys: number[]): number[] {
  return ys.map((y) => roundMm(boxHeight - y)).sort((a, b) => a - b);
}

function toAbsoluteDivYs(divTopY: number, ys: number[]): number[] {
  return ys.map((y) => roundMm(divTopY - y)).sort((a, b) => a - b);
}

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
    expect(zones.some((zone) => zone.shelfEnabled)).toBe(true);
    expect(zones.some((zone) => !zone.shelfEnabled)).toBe(true);
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
    const divDims = resolveDivisorDimensions(box, div);
    const divTopY = getDivSepInternalDims(box).espessura + divDims.alturaMm;
    const lateralYs = [
      ...new Set(toAbsoluteLateralYs(box.dimensoes.altura, result.lateral_direita.map((h) => roundMm(h.y)))),
    ];
    const divYs = [
      ...new Set(toAbsoluteDivYs(divTopY, (result.divisorio.get("pid-div-shelf") ?? []).map((h) => roundMm(h.y)))),
    ];
    expect(divYs).toEqual(lateralYs);
  });

  it("usa passo industrial exacto de 32 mm por compartimento", () => {
    const result = buildDivShelfDrilling(box, box.panelIds, SHELF_RULES)!;
    const cfg = SHELF_RULES.furos.tecnicos.prateleira;
    const absoluteYs = [...new Set(toAbsoluteLateralYs(box.dimensoes.altura, result.lateral_direita.map((h) => roundMm(h.y))))];
    for (const zone of resolveVerticalCompartments(box).filter((z) => z.shelfEnabled)) {
      const minY = roundMm(zone.yMin + (cfg.margemBase ?? 0));
      const maxY = roundMm(zone.yMax - (cfg.margemTopo ?? 0));
      const zoneYs = absoluteYs.filter((y) => y >= minY && y <= maxY);
      const steps = zoneYs.slice(1).map((y, index) => roundMm(y - zoneYs[index]!));
      expect(new Set(steps)).toEqual(new Set([32]));
    }
  });

  it("deduplica furos laterais com múltiplos DIV no mesmo lado", () => {
    const multiDivBox = makeDivSepTestBox({
      dimensoes: { largura: 900, altura: 900, profundidade: 560 },
      prateleiras: 2,
      separadores: [sep],
      divisores: [
        defaultDivisorItem({ id: "div-a", positionMm: 200, prateleiraLado: "direita" }),
        defaultDivisorItem({ id: "div-b", positionMm: 500, prateleiraLado: "direita" }),
      ],
    });
    const result = buildDivShelfDrilling(multiDivBox, multiDivBox.panelIds, SHELF_RULES)!;
    const signatures = new Set(
      result.lateral_direita.map((h) => [roundMm(h.x), roundMm(h.y), roundMm(h.diameter), roundMm(h.depth)].join("|"))
    );
    expect(signatures.size).toBe(result.lateral_direita.length);
  });

  it("respeita compartimentos com SEP sem furos fora da grelha util", () => {
    const result = buildDivShelfDrilling(box, box.panelIds, SHELF_RULES)!;
    const zones = resolveVerticalCompartments(box).filter((zone) => zone.shelfEnabled);
    const absoluteYs = [
      ...new Set(toAbsoluteLateralYs(box.dimensoes.altura, result.lateral_direita.map((h) => roundMm(h.y)))),
    ];
    const cfg = SHELF_RULES.furos.tecnicos.prateleira;
    for (const y of absoluteYs) {
      const inSomeZone = zones.some((zone) => {
        const minY = roundMm(zone.yMin + (cfg.margemBase ?? 0));
        const maxY = roundMm(zone.yMax - (cfg.margemTopo ?? 0));
        return y >= minY && y <= maxY;
      });
      expect(inSomeZone).toBe(true);
    }
  });

  it("calcula largura da prateleira sem atravessar o DIV", () => {
    const width = resolveShelfWidthForDivSide(box, div);
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThan(box.dimensoes.largura - box.espessura * 2);
  });

  it("com DIV+SEP, nenhum furo de prateleira acima do SEP", () => {
    const linkedDiv = defaultDivisorItem({
      id: "div-linked-shelf",
      positionMm: 281,
      linkedSeparadorId: "sep-shelf",
      prateleiraLado: "direita",
    });
    const linkedBox = makeDivSepTestBox({
      dimensoes: { largura: 600, altura: 900, profundidade: 560 },
      prateleiras: 2,
      separadores: [sep],
      divisores: [linkedDiv],
      panelIds: { divisores: ["pid-div-linked-shelf"] },
    });
    const result = buildDivShelfDrilling(linkedBox, linkedBox.panelIds, SHELF_RULES);
    expect(result).not.toBeNull();

    const sepBottomY = roundMm(resolveSeparadorBottomY(linkedBox, sep));
    const cfg = SHELF_RULES.furos.tecnicos.prateleira;
    const margemBase = cfg.margemBase ?? 0;
    const forbiddenMinY = roundMm(sepBottomY + margemBase);
    const disabledZones = resolveVerticalCompartments(linkedBox).filter((zone) => !zone.shelfEnabled);

    const absoluteYs = [
      ...new Set(
        toAbsoluteLateralYs(
          linkedBox.dimensoes.altura,
          result!.lateral_direita.map((h) => roundMm(h.y))
        )
      ),
    ];

    expect(absoluteYs.length).toBeGreaterThan(0);
    expect(absoluteYs.every((y) => y < forbiddenMinY)).toBe(true);
    for (const y of absoluteYs) {
      const inDisabledZone = disabledZones.some((zone) => {
        const minY = roundMm(zone.yMin + margemBase);
        const maxY = roundMm(zone.yMax - (cfg.margemTopo ?? 0));
        return y >= minY && y <= maxY;
      });
      expect(inDisabledZone).toBe(false);
    }
  });

  it("com prateleiras, o DIV recebe furos no lado correspondente", () => {
    const right = buildDivShelfDrilling(box, box.panelIds, SHELF_RULES)!;
    const rightHoles = right.divisorio.get("pid-div-shelf") ?? [];
    expect(rightHoles.length).toBeGreaterThan(0);
    expect(rightHoles.every((h) => h.face === "A")).toBe(true);

    const leftDiv = defaultDivisorItem({
      id: "div-left-shelf",
      positionMm: 281,
      prateleiraLado: "esquerda",
    });
    const leftBox = makeDivSepTestBox({
      dimensoes: { largura: 600, altura: 900, profundidade: 560 },
      prateleiras: 2,
      separadores: [sep],
      divisores: [leftDiv],
      panelIds: { divisores: ["pid-div-left-shelf"] },
    });
    const left = buildDivShelfDrilling(leftBox, leftBox.panelIds, SHELF_RULES)!;
    expect(left.lateral_direita.length).toBe(0);
    expect(left.lateral_esquerda.length).toBeGreaterThan(0);
    const leftHoles = left.divisorio.get("pid-div-left-shelf") ?? [];
    expect(leftHoles.length).toBeGreaterThan(0);
    expect(leftHoles.every((h) => h.face === "B")).toBe(true);
  });

  it("DIV e lateral têm grelha idêntica", () => {
    const result = buildDivShelfDrilling(box, box.panelIds, SHELF_RULES)!;
    const divDims = resolveDivisorDimensions(box, div);
    const divTopY = getDivSepInternalDims(box).espessura + divDims.alturaMm;
    const lateralYs = [
      ...new Set(toAbsoluteLateralYs(box.dimensoes.altura, result.lateral_direita.map((h) => roundMm(h.y)))),
    ];
    const divYs = [
      ...new Set(toAbsoluteDivYs(divTopY, (result.divisorio.get("pid-div-shelf") ?? []).map((h) => roundMm(h.y)))),
    ];
    expect(divYs.length).toBeGreaterThan(0);
    expect(divYs).toEqual(lateralYs);
  });

  it("nenhum furo no DIV acima do SEP", () => {
    const linkedDiv = defaultDivisorItem({
      id: "div-no-above",
      positionMm: 281,
      linkedSeparadorId: "sep-shelf",
      prateleiraLado: "direita",
    });
    const linkedBox = makeDivSepTestBox({
      dimensoes: { largura: 600, altura: 900, profundidade: 560 },
      prateleiras: 2,
      separadores: [sep],
      divisores: [linkedDiv],
      panelIds: { divisores: ["pid-div-no-above"] },
    });
    const result = buildDivShelfDrilling(linkedBox, linkedBox.panelIds, SHELF_RULES)!;
    const divDims = resolveDivisorDimensions(linkedBox, linkedDiv);
    const divTopY = getDivSepInternalDims(linkedBox).espessura + divDims.alturaMm;
    const sepBottomY = roundMm(resolveSeparadorBottomY(linkedBox, sep));
    const divYs = [
      ...new Set(
        toAbsoluteDivYs(divTopY, (result.divisorio.get("pid-div-no-above") ?? []).map((h) => roundMm(h.y)))
      ),
    ];
    expect(divYs.length).toBeGreaterThan(0);
    expect(divYs.every((y) => y < sepBottomY)).toBe(true);
  });

  it("usa panelId industrial divisorio-N quando panelIds.divisores está vazio", () => {
    const bare = makeDivSepTestBox({
      dimensoes: { largura: 600, altura: 900, profundidade: 560 },
      prateleiras: 2,
      separadores: [sep],
      divisores: [defaultDivisorItem({ id: "uuid-only", prateleiraLado: "direita" })],
    });
    bare.panelIds = { ...bare.panelIds!, divisores: [] };
    const result = buildDivShelfDrilling(bare, bare.panelIds, SHELF_RULES)!;
    expect(result.divisorio.get("divisorio-1")?.length ?? 0).toBeGreaterThan(0);
    expect(result.divisorio.get("uuid-only")?.length ?? 0).toBeGreaterThan(0);
  });

  it(`desactiva zona acima do SEP quando altura < ${MIN_ABOVE_SEP_SHELF_HEIGHT_MM} mm`, () => {
    const zones = resolveVerticalCompartments(box);
    const topZone = zones[zones.length - 1]!;
    expect(topZone.yMax - topZone.yMin).toBeLessThan(MIN_ABOVE_SEP_SHELF_HEIGHT_MM);
    expect(topZone.shelfEnabled).toBe(false);
  });

  it("com N prateleiras e DIV+SEP, countDivShelfPanels = N (sem duplicar acima do SEP)", () => {
    const linkedDiv = defaultDivisorItem({
      id: "div-count",
      positionMm: 281,
      linkedSeparadorId: "sep-shelf",
      prateleiraLado: "direita",
    });
    const linkedBox = makeDivSepTestBox({
      dimensoes: { largura: 600, altura: 900, profundidade: 560 },
      prateleiras: 2,
      separadores: [sep],
      divisores: [linkedDiv],
    });
    expect(resolveVerticalCompartments(linkedBox).length).toBeGreaterThanOrEqual(2);
    expect(resolveDivShelfPlacementZones(linkedBox, linkedDiv)).toHaveLength(1);
    expect(countDivShelfPanels(linkedBox)).toBe(2);
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
