import type { PanelDrillHole } from "../types";
import type { BoxModule } from "../types";
import type { DivisorItem, SeparadorItem } from "./types";

export const DIV_SEP_TEST_RULES = {
  cavilhaLengthRules: [
    { minMm: 60, maxMm: 99, offsetFromEdgeMm: 15 },
    { minMm: 100, maxMm: 150, offsetFromEdgeMm: 30 },
    { minMm: 151, maxMm: 199, offsetFromEdgeMm: 40 },
    { minMm: 200, maxMm: 1200, offsetFromEdgeMm: 60 },
  ],
  cavilhaDiameterMm: 10,
  cavilhaDepthMm: 13,
  parafusoDistanceFromCavilhaMm: 30,
  enableShelfHoles: true,
  enableDivSepCombinations: true,
} as const;

export const DIV_SEP_BOX_DIMS = {
  largura: 600,
  altura: 720,
  profundidade: 560,
} as const;

export const DIV_SEP_ESPESSURA = 19;

export function makeDivSepTestBox(
  overrides: Partial<BoxModule> & {
    divisores?: DivisorItem[];
    separadores?: SeparadorItem[];
  } = {}
): BoxModule {
  const divisores = overrides.divisores ?? [];
  const separadores = overrides.separadores ?? [];
  return {
    id: overrides.id ?? "box-divsep-test",
    nome: overrides.nome ?? "Armario_Test",
    dimensoes: overrides.dimensoes ?? { ...DIV_SEP_BOX_DIMS },
    espessura: overrides.espessura ?? DIV_SEP_ESPESSURA,
    profundidadeExterna: overrides.profundidadeExterna ?? DIV_SEP_BOX_DIMS.profundidade,
    costaAtiva: overrides.costaAtiva ?? true,
    tipoBorda: "reta",
    tipoFundo: "integrado",
    models: [],
    prateleiras: 0,
    portaTipo: "sem_porta",
    gavetas: 0,
    alturaGaveta: 0,
    doorsLayer: [],
    drawersLayer: [],
    divisores,
    separadores,
    panelIds: {
      cima: "pid-cima",
      fundo: "pid-fundo",
      lateral_esquerda: "pid-le",
      lateral_direita: "pid-ld",
      costa: "pid-costa",
      prateleiras: [],
      portas: [],
      gavetas: [],
      divisores: divisores.map((_d, i) => overrides.panelIds?.divisores?.[i] ?? `pid-div-${i + 1}`),
      separadores: separadores.map((_s, i) => overrides.panelIds?.separadores?.[i] ?? `pid-sep-${i + 1}`),
      ...overrides.panelIds,
    },
    cutList: [],
    cutListComPreco: [],
    ferragens: [],
    precoTotalPecas: 0,
    estrutura3D: null,
    ...overrides,
  } as BoxModule;
}

export function defaultDivisorItem(overrides: Partial<DivisorItem> = {}): DivisorItem {
  return {
    id: "div-1",
    positionMm: 281,
    referenceEdge: "left",
    ...overrides,
  };
}

export function defaultSeparadorItem(overrides: Partial<SeparadorItem> = {}): SeparadorItem {
  return {
    id: "sep-1",
    positionMm: 341,
    referenceEdge: "bottom",
    ...overrides,
  };
}

export type HoleSignature = {
  x: number;
  y: number;
  diameter: number;
  depth: number;
  holeType?: string;
  face?: string;
};

export function holeSignature(h: PanelDrillHole): HoleSignature {
  return {
    x: roundMm(h.x),
    y: roundMm(h.y),
    diameter: roundMm(h.diameter),
    depth: roundMm(h.depth),
    holeType: h.holeType,
    face: h.face,
  };
}

export function roundMm(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function holesEqual(a: HoleSignature, b: HoleSignature): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.diameter === b.diameter &&
    a.depth === b.depth &&
    a.holeType === b.holeType &&
    a.face === b.face
  );
}

export function baselineHolesMissingFromExtended(
  baseline: HoleSignature[],
  extended: HoleSignature[]
): HoleSignature[] {
  return baseline.filter((hole) => !extended.some((ext) => holesEqual(ext, hole)));
}

export function parafusoOffsetsFromCavilha(
  holes: PanelDrillHole[],
  parafusoDistanceMm: number
): { cavilhaCount: number; validPairCount: number } {
  const cavilhas = holes.filter((h) => h.holeType === "cavilha");
  const parafusos = holes.filter((h) => h.holeType === "parafuso");
  let validPairCount = 0;

  for (const cav of cavilhas) {
    const pairs = parafusos.filter(
      (p) =>
        roundMm(p.y) === roundMm(cav.y) &&
        roundMm(Math.abs(p.x - cav.x)) === parafusoDistanceMm
    );
    if (pairs.length >= 2) validPairCount += 1;
  }

  return { cavilhaCount: cavilhas.length, validPairCount };
}
