import { describe, it, expect } from "vitest";
import {
  buildOrlaPiecesForBox,
  computeOrlaFerragem,
  aggregateOrlaRowsForFerragensTotaisPdf,
  syncOrlaPiecesForProject,
} from "./orlaCalculator";
import { getOrlaEdgeLengthsMm } from "./orlaEdgeLengths";
import type { BoxModule, CutListItem } from "../types";
import type { OrlaPreset } from "./orlaTypes";

const PRESET: OrlaPreset = {
  id: "pvc_08_23",
  nome: "Branco PVC 0.8\u00d723 mm",
  tipo: "PVC",
  espessuraMm: 0.8,
  larguraMm: 23,
  cor: "#fff",
  precoPorMetro: 1.25,
};

function piece(
  id: string,
  tipo: string,
  dims: { largura: number; altura: number; profundidade?: number },
  qty = 1
): CutListItem {
  return {
    id,
    nome: tipo,
    tipo,
    quantidade: qty,
    dimensoes: { largura: dims.largura, altura: dims.altura, profundidade: dims.profundidade ?? 18 },
    espessura: dims.profundidade ?? 18,
    material: "MDF Branco 19mm",
    metadata: { panelId: id },
  } as CutListItem;
}

function boxWith(cutList: CutListItem[], presetId: string | null = PRESET.id): BoxModule {
  return {
    id: "b1",
    nome: "Caixa 1",
    material: "mdf_branco",
    orlaPresetId: presetId ?? undefined,
    cutList,
    dimensoes: { largura: 600, altura: 720, profundidade: 560 },
  } as BoxModule;
}

describe("orlaCalculator industrial", () => {
  it("costa = 0 m; gav_frent_int so topo; porta 4 lados", () => {
    const items = [
      piece("c1", "costa", { largura: 600, altura: 720 }),
      piece("g1", "gav_frent_int", { largura: 500, altura: 150 }),
      piece("p1", "porta_simples", { largura: 598, altura: 718 }),
    ];
    const box = boxWith(items);
    const orlaPieces = buildOrlaPiecesForBox(box, PRESET.id, {});
    expect(orlaPieces.c1).toBeUndefined();
    expect(orlaPieces.g1?.sides.front.enabled).toBe(true);
    expect(orlaPieces.g1?.sides.back.enabled).toBe(false);
    expect(orlaPieces.p1?.sides.left.enabled).toBe(true);

    const ferragem = computeOrlaFerragem({
      boxes: [{ ...box, cutList: items }],
      orlaPresets: [PRESET],
      orlaPieces,
      orlaJuntoPairs: [],
    });
    // gaveta: 500mm; porta: 2*(598+718)=2632mm
    expect(ferragem.metrosTotal).toBeCloseTo(0.5 + 2.632, 3);
  });

  it("edge lengths: gav_frent_int = largura no front", () => {
    const edges = getOrlaEdgeLengthsMm(piece("g", "gav_frent_int", { largura: 412, altura: 140 }));
    expect(edges.front).toBe(412);
    expect(edges.back + edges.left + edges.right).toBe(0);
  });

  it("preset null limpa pecas da caixa", () => {
    const box = boxWith([piece("p1", "porta_simples", { largura: 600, altura: 700 })]);
    const withOrla = buildOrlaPiecesForBox(box, PRESET.id, {});
    expect(withOrla.p1).toBeDefined();
    const cleared = buildOrlaPiecesForBox(box, null, withOrla);
    expect(cleared.p1).toBeUndefined();
  });

  it("PDF aggregate: metros, material sem espessura, ref nome+espessura", () => {
    const items = [piece("p1", "porta_simples", { largura: 1000, altura: 500 })];
    const box = boxWith(items);
    const orlaPieces = buildOrlaPiecesForBox(box, PRESET.id, {}, [], [PRESET]);
    const ferragem = computeOrlaFerragem({
      boxes: [{ ...box, cutList: items }],
      orlaPresets: [PRESET],
      orlaPieces,
      orlaJuntoPairs: [],
    });
    const rows = aggregateOrlaRowsForFerragensTotaisPdf(
      ferragem,
      [PRESET],
      [box],
      "mdf_branco",
      "MDF Branco 19mm"
    );
    expect(rows.length).toBe(1);
    expect(rows[0]!.material).toBe("MDF Branco");
    expect(rows[0]!.material).not.toMatch(/19\s*mm/i);
    expect(rows[0]!.quantidade).toBeCloseTo(3, 2); // 2*(1000+500)/1000
    expect(rows[0]!.medida).toMatch(/3\.00 m/);
    expect(rows[0]!.ref).toBe("Branco PVC 0.8mm");
    expect(rows[0]!.ref).not.toMatch(/23mm/);
    expect(rows[0]!.preco).toBe(1.25);
  });

  it("PDF agrega materia por peca (nao so a da caixa)", () => {
    const carvalhoPreset: OrlaPreset = {
      id: "carvalho_pvc",
      nome: "Carvalho PVC 0.8\u00d723 mm",
      tipo: "PVC",
      espessuraMm: 0.8,
      larguraMm: 23,
      cor: "#c4a574",
      precoPorMetro: 1.45,
    };
    const presets = [PRESET, carvalhoPreset];
    const items = [
      { ...piece("cima1", "cima", { largura: 600, altura: 560 }), material: "MDF Branco 19mm" },
      {
        ...piece("porta1", "porta_simples", { largura: 598, altura: 700 }),
        material: "Carvalho 19mm",
        materialId: "carvalho-19",
      },
      {
        ...piece("fundo1", "fundo", { largura: 560, altura: 400 }),
        material: "MDF Branco 19mm",
      },
    ];
    const box = boxWith(items);
    const orlaPieces = buildOrlaPiecesForBox(box, PRESET.id, {}, [], presets);
    expect(orlaPieces.cima1?.orlaMaterialLabel).toMatch(/MDF Branco/i);
    expect(orlaPieces.porta1?.orlaMaterialLabel).toMatch(/Carvalho/i);
    expect(orlaPieces.porta1?.sides.front.presetId).toBe(carvalhoPreset.id);
    expect(orlaPieces.fundo1?.orlaMaterialLabel).toMatch(/MDF Branco/i);

    const ferragem = computeOrlaFerragem({
      boxes: [{ ...box, cutList: items }],
      orlaPresets: presets,
      orlaPieces,
      orlaJuntoPairs: [],
    });
    const rows = aggregateOrlaRowsForFerragensTotaisPdf(ferragem, presets, [box]);
    const mats = rows.map((r) => r.material).sort();
    expect(mats.some((m) => /Carvalho/i.test(m))).toBe(true);
    expect(mats.some((m) => /MDF Branco/i.test(m))).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it("gaveta_traseira so topo; nao mistura com costa do modulo", () => {
    const items = [
      piece("c1", "costa", { largura: 600, altura: 720 }),
      piece("t1", "gaveta_traseira", { largura: 480, altura: 120, profundidade: 16 }),
    ];
    const box = boxWith(items);
    const orlaPieces = buildOrlaPiecesForBox(box, PRESET.id, {});
    expect(orlaPieces.c1).toBeUndefined();
    expect(orlaPieces.t1?.sides.front.enabled).toBe(true);
    expect(orlaPieces.t1?.sides.back.enabled).toBe(false);
    const ferragem = computeOrlaFerragem({
      boxes: [{ ...box, cutList: items }],
      orlaPresets: [PRESET],
      orlaPieces,
      orlaJuntoPairs: [],
    });
    expect(ferragem.metrosTotal).toBeCloseTo(0.48, 3);
  });

  it("inclui remate extra no calculo", () => {
    const box = boxWith([piece("cima1", "cima", { largura: 600, altura: 560 })]);
    const remate = piece("r1", "remate", { largura: 2000, altura: 100 });
    (remate as CutListItem & { boxId: string }).boxId = "b1";
    const orlaPieces = buildOrlaPiecesForBox(box, PRESET.id, {}, [remate]);
    expect(orlaPieces.r1?.sides.front.enabled).toBe(true);
    const ferragem = computeOrlaFerragem({
      boxes: [{ ...box, cutList: box.cutList }],
      orlaPresets: [PRESET],
      orlaPieces,
      orlaJuntoPairs: [],
      extraCutListItems: [remate as CutListItem & { boxId: string }],
    });
    expect(ferragem.metrosTotal).toBeGreaterThan(2);
  });

  it("sync com defaultPreset aplica orla a caixa sem orlaPresetId (sem prateleira)", () => {
    const items = [piece("cima1", "cima", { largura: 560, altura: 400, profundidade: 19 })];
    const box = boxWith(items, null);
    expect(box.orlaPresetId).toBeUndefined();
    const orlaPieces = syncOrlaPiecesForProject([box], {}, PRESET.id);
    expect(orlaPieces.cima1?.sides.front.enabled).toBe(true);
    const ferragem = computeOrlaFerragem({
      boxes: [{ ...box, cutList: items }],
      orlaPresets: [PRESET],
      orlaPieces,
      orlaJuntoPairs: [],
    });
    expect(ferragem.metrosTotal).toBeGreaterThan(0);
  });

  it("prateleira nunca recebe orla", () => {
    const items = [piece("prat1", "prateleira", { largura: 560, altura: 400, profundidade: 19 })];
    const box = boxWith(items);
    const orlaPieces = buildOrlaPiecesForBox(box, PRESET.id, {});
    expect(orlaPieces.prat1).toBeUndefined();
    const ferragem = computeOrlaFerragem({
      boxes: [{ ...box, cutList: items }],
      orlaPresets: [PRESET],
      orlaPieces,
      orlaJuntoPairs: [],
    });
    expect(ferragem.metrosTotal).toBe(0);
  });

  it("sync com orlaPresetId null nao aplica default", () => {
    const items = [piece("cima1", "cima", { largura: 560, altura: 400, profundidade: 19 })];
    const box = { ...boxWith(items, null), orlaPresetId: null as string | null };
    const orlaPieces = syncOrlaPiecesForProject([box], {}, PRESET.id);
    expect(orlaPieces.cima1).toBeUndefined();
  });
});
