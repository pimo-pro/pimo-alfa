import { describe, it, expect } from "vitest";
import {
  buildOrlaPiecesForBox,
  computeOrlaFerragem,
  aggregateOrlaRowsForFerragensTotaisPdf,
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

  it("PDF aggregate: metros, material sem espessura, ref com mm", () => {
    const items = [piece("p1", "porta_simples", { largura: 1000, altura: 500 })];
    const box = boxWith(items);
    const orlaPieces = buildOrlaPiecesForBox(box, PRESET.id, {});
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
    expect(rows[0]!.material).not.toMatch(/19\s*mm/i);
    expect(rows[0]!.quantidade).toBeCloseTo(3, 2); // 2*(1000+500)/1000
    expect(rows[0]!.medida).toMatch(/3\.00 m/);
    expect(rows[0]!.ref).toMatch(/0\.8mm/);
    expect(rows[0]!.ref).toMatch(/23mm/);
    expect(rows[0]!.preco).toBe(1.25);
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
});
