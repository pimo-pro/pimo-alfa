import type {
  CutListItem,
  DrillFace,
  DrillType,
  OperationResult,
  PanelDrillHole,
  PanelFace,
  TechnicalDrillHole,
  ViewerDrillMarkersByPanel,
} from "../../core/types";
import type { RulesConfig } from "../../core/rules/rulesConfig";
import { MIN_MARGEM_DOBRADICA_TOP_BOTTOM_MM, getHingeYPositions, normalizeRulesConfig } from "../../core/rules/rulesConfig";
import { getSettings } from "../../core/settings/settingsService";
import { calculateTechnicalDrillingsForPiece, isTopDrillable } from "../../core/drilling/drillingService";

export type PanelDrillingInput = {
  tipo: string;
  larguraMm: number;
  alturaMm: number;
  espessuraMm: number;
  doorHeightMm?: number;
};

export type PanelDrillingOutput = {
  drillHoles: PanelDrillHole[];
};

const EMPTY_VIEWER_DRILL_MARKERS: ViewerDrillMarkersByPanel = {
  cima: [],
  fundo: [],
  lateral_esquerda: [],
  lateral_direita: [],
  porta: [],
};

const clampNumber = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

function toFiniteNumber(value: unknown, fallback: number): number {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function sanitizeHingePositions(
  positions: number[] | undefined,
  alturaRefMm: number,
  distEntreFurosCalcoMm: number
): number[] {
  if (!Array.isArray(positions) || !Number.isFinite(alturaRefMm) || alturaRefMm <= 0) return [];
  const margin = MIN_MARGEM_DOBRADICA_TOP_BOTTOM_MM;
  const halfFixationDist = Math.max(0, distEntreFurosCalcoMm / 2);
  const minY = margin + halfFixationDist;
  const maxY = Math.max(minY, alturaRefMm - margin - halfFixationDist);

  return positions
    .map((y) => Number(y))
    .filter((y) => Number.isFinite(y))
    .map((y) => clampNumber(y, minY, maxY));
}

function getHingePositionsFromDoorHeight(
  rules: RulesConfig,
  doorHeightMm: number,
  lateralHeightMm: number
): number[] {
  if (!Number.isFinite(doorHeightMm) || doorHeightMm <= 0) return [];
  const numHinges = rules.furos?.tecnicos?.dobradica?.numeroPorPorta ?? 2;
  const doorPositions = getHingeYPositions(doorHeightMm, numHinges, rules);
  if (doorPositions.length === 0) return [];
  if (!Number.isFinite(lateralHeightMm) || lateralHeightMm <= 0) return doorPositions;

  const margem = MIN_MARGEM_DOBRADICA_TOP_BOTTOM_MM;
  const yMinLateral = margem;
  const yMaxLateral = Math.max(yMinLateral, lateralHeightMm - margem);
  const distEntreCalco = rules.furos?.tecnicos?.dobradica_fixacao?.distanciaEntreFurosCalco ?? 32;
  const halfDistHoles = distEntreCalco / 2;
  const yMinSafe = yMinLateral + halfDistHoles;
  const yMaxSafe = Math.max(yMinSafe, yMaxLateral - halfDistHoles);

  return doorPositions.map((y) => Math.max(yMinSafe, Math.min(yMaxSafe, y)));
}

/** Mapeia DrillFace (geometria) para face do painel A/B (A = frente/cima/exterior, B = fundo/tras/interior). */
function drillFaceToPanelFace(face: DrillFace): PanelFace {
  switch (face) {
    case "frente":
    case "cima":
    case "esquerda":
      return "A";
    case "tras":
    case "fundo":
    case "direita":
    default:
      return "B";
  }
}

/** Converte furação técnica em furos reais do painel (com face A/B). */
function toPanelDrillHoles(furacoesTecnicas: TechnicalDrillHole[]): PanelDrillHole[] {
  return furacoesTecnicas.map((h) => {
    const holeType = h.tipo as DrillType;
    const topByFace = isTopDrillable(h.face);
    const topDrillable =
      topByFace ||
      holeType === "dobradica" ||
      holeType === "dobradica_fixacao" ||
      holeType === "dobradica_parafuso_uniao" ||
      holeType === "prateleira";
    return {
      x: h.x,
      y: h.y,
      diameter: h.diametro,
      depth: h.profundidade,
      holeType,
      face: drillFaceToPanelFace(h.face),
      topDrillable,
    };
  });
}

export function buildEffectiveDrillingRules(rules: RulesConfig): RulesConfig {
  const normalizedRules = normalizeRulesConfig(rules);
  const settings = getSettings();
  const fu = settings?.furação;
  if (!fu?.parafuso || !fu?.prateleira || !fu?.dobradica) return normalizedRules;

  const pr = fu.prateleira;
  const df = fu.dobradicaFixacao;
  const minFuros = clampNumber(toFiniteNumber(pr.minFuros, normalizedRules.furos.tecnicos.prateleira.minFurosPorColuna), 2, 100);
  const maxFurosRaw = clampNumber(toFiniteNumber(pr.maxFuros, normalizedRules.furos.tecnicos.prateleira.maxFurosPorColuna), 2, 100);
  const maxFuros = Math.max(minFuros, maxFurosRaw);
  const distanciaDaBordaPrateleira = clampNumber(
    toFiniteNumber(pr.distanciaDaBorda, normalizedRules.furos.tecnicos.prateleira.distanciaDaBorda),
    5,
    120
  );

  return {
    ...normalizedRules,
    furos: {
      ...normalizedRules.furos,
      tecnicos: {
        ...normalizedRules.furos.tecnicos,
        parafuso: {
          ...normalizedRules.furos.tecnicos.parafuso,
          distanciaFrente: fu.parafuso.distanciaFrenteParafuso,
          distanciaFundo: fu.parafuso.distanciaFrenteParafuso,
          offsetDaBorda: fu.parafuso.offsetDaBorda,
        },
        cavilha: {
          ...normalizedRules.furos.tecnicos.cavilha,
          distanciaFrente: fu.parafuso.distanciaFrenteCavilha,
          distanciaFundo: fu.parafuso.distanciaFrenteCavilha,
          offsetDaBorda: fu.parafuso.offsetDaBorda,
        },
        prateleira: {
          ...normalizedRules.furos.tecnicos.prateleira,
          margemTopo: pr.margemTop,
          margemBase: pr.margemBottom,
          margemFrente: distanciaDaBordaPrateleira,
          margemFundo: distanciaDaBordaPrateleira,
          minFurosPorColuna: minFuros,
          maxFurosPorColuna: maxFuros,
          espacamentoVertical: pr.espacamentoVertical,
          distanciaDaBorda: distanciaDaBordaPrateleira,
        },
        dobradica: {
          ...normalizedRules.furos.tecnicos.dobradica,
          distanciaCentroDaBorda: toFiniteNumber(fu.dobradica.distanciaCentroDaBorda, normalizedRules.furos.tecnicos.dobradica.distanciaCentroDaBorda) || 22.5,
          distanciaDobradiçaTopo: fu.dobradica.distanciaDobradiçaTopo,
          distanciaDobradiçaFundo: fu.dobradica.distanciaDobradiçaFundo,
          numeroPorPorta: Math.max(2, fu.dobradica.numeroPorPorta ?? normalizedRules.furos.tecnicos.dobradica.numeroPorPorta ?? 2),
          distribuicaoAutomatica:
            fu.dobradica.distribuicaoAutomatica ?? normalizedRules.furos.tecnicos.dobradica.distribuicaoAutomatica ?? true,
        },
        ...(df && {
          dobradica_fixacao: {
            ...normalizedRules.furos.tecnicos.dobradica_fixacao,
            distanciaDaBordaCalco: clampNumber(
              toFiniteNumber(df.distanciaDaBordaCalco, normalizedRules.furos.tecnicos.dobradica_fixacao.distanciaDaBordaCalco),
              10,
              80
            ),
            // Parafuso união: sempre 53 mm (padrão ferragem). Valor 60 = legado (regra de prateleira) → forçar 53.
            distanciaDaBordaParafusoUniao: (() => {
              const v = toFiniteNumber(
                df.distanciaDaBordaParafusoUniao,
                normalizedRules.furos.tecnicos.dobradica_fixacao.distanciaDaBordaParafusoUniao
              );
              const legacyShelf = Math.abs(v - 60) < 1;
              return clampNumber(legacyShelf ? 53 : (v || 53), 20, 120);
            })(),
            distanciaEntreFurosCalco:
              df.distanciaEntreFurosCalco ?? normalizedRules.furos.tecnicos.dobradica_fixacao.distanciaEntreFurosCalco,
            profundidadeFuro: df.profundidadeFuro,
            diametro: df.diametro ?? normalizedRules.furos.tecnicos.dobradica_fixacao.diametro,
            diametroParafusoUniao:
              df.diametroParafusoUniao ?? normalizedRules.furos.tecnicos.dobradica_fixacao.diametroParafusoUniao,
            profundidadeParafusoUniao:
              df.profundidadeParafusoUniao ?? normalizedRules.furos.tecnicos.dobradica_fixacao.profundidadeParafusoUniao,
          },
        }),
      },
    },
  };
}

export function buildPanelDrilling(
  input: PanelDrillingInput,
  rules: RulesConfig
): PanelDrillingOutput {
  const result = buildPanelDrillingResult(input, rules);
  return result.success ? result.data ?? { drillHoles: [] } : { drillHoles: [] };
}

export function buildPanelDrillingResult(
  input: PanelDrillingInput,
  rules: RulesConfig
): OperationResult<PanelDrillingOutput> {
  if (!Number.isFinite(input.larguraMm) || !Number.isFinite(input.alturaMm) || !Number.isFinite(input.espessuraMm)) {
    return { success: false, error: "Dimensões inválidas para cálculo de furação." };
  }

  const isLateral = input.tipo === "lateral_esquerda" || input.tipo === "lateral_direita";
  const isDoor = input.tipo === "porta_simples" || input.tipo === "porta_dupla" || input.tipo === "porta_correr";
  const distEntreFixacao = rules.furos.tecnicos.dobradica_fixacao.distanciaEntreFurosCalco;

  let hingePositions: number[] = [];
  if (isLateral && Number.isFinite(input.doorHeightMm)) {
    const lateralPositions = getHingePositionsFromDoorHeight(rules, Number(input.doorHeightMm), input.alturaMm);
    hingePositions = sanitizeHingePositions(lateralPositions, input.alturaMm, distEntreFixacao);
  } else if (isDoor) {
    const rawDoorHinges = getHingeYPositions(input.alturaMm, rules.furos.tecnicos.dobradica.numeroPorPorta, rules);
    hingePositions = sanitizeHingePositions(rawDoorHinges, input.alturaMm, distEntreFixacao);
  }

  let furacoesTecnicas: TechnicalDrillHole[] = [];
  try {
    furacoesTecnicas = calculateTechnicalDrillingsForPiece(
      {
        tipo: input.tipo,
        largura: input.larguraMm,
        altura: input.alturaMm,
        espessura: input.espessuraMm,
        hingePositionsMm: hingePositions.length > 0 ? hingePositions : undefined,
      },
      rules
    );
  } catch (err) {
    console.warn(`[drillingAdapter] Error generating technical holes for ${input.tipo}:`, err);
    return { success: false, error: `Erro ao gerar furação para painel ${input.tipo}.` };
  }

  return {
    success: true,
    data: {
      drillHoles: toPanelDrillHoles(furacoesTecnicas),
    },
  };
}

export function buildViewerDrillMarkersByPanel(cutList: CutListItem[] | undefined): ViewerDrillMarkersByPanel {
  const result = buildViewerDrillMarkersByPanelResult(cutList);
  return result.success ? result.data ?? EMPTY_VIEWER_DRILL_MARKERS : EMPTY_VIEWER_DRILL_MARKERS;
}

/** Converte PanelDrillHole[] em TechnicalDrillHole[] para o viewer (face padrão por painel). */
function panelDrillHolesToTechnical(
  holes: PanelDrillHole[] | undefined,
  defaultFace: DrillFace
): TechnicalDrillHole[] {
  if (!holes?.length) return [];
  return holes.map((h) => ({
    x: h.x,
    y: h.y,
    diametro: h.diameter,
    profundidade: h.depth,
    tipo: (h.holeType ?? "parafuso") as DrillType,
    face: defaultFace,
  }));
}

export function buildViewerDrillMarkersByPanelResult(
  cutList: CutListItem[] | undefined
): OperationResult<ViewerDrillMarkersByPanel> {
  if (!Array.isArray(cutList) || cutList.length === 0) {
    return { success: true, data: EMPTY_VIEWER_DRILL_MARKERS };
  }

  const byType = new Map(cutList.map((item) => [item.tipo, item]));
  const doorTipos = ["porta_simples", "porta_dupla", "porta_correr"];
  const firstDoorItem = cutList.find((item) => doorTipos.includes(item.tipo));

  const getHolesFor = (tipo: keyof ViewerDrillMarkersByPanel): TechnicalDrillHole[] => {
    if (tipo === "porta") {
      if (!firstDoorItem?.drillHoles?.length) return [];
      return panelDrillHolesToTechnical(firstDoorItem.drillHoles, "tras");
    }
    const item = byType.get(tipo);
    if (!item?.drillHoles?.length) return [];
    const face: DrillFace =
      tipo === "cima" ? "cima" : tipo === "fundo" ? "fundo" : tipo === "lateral_esquerda" ? "direita" : "esquerda";
    return panelDrillHolesToTechnical(item.drillHoles, face);
  };

  return {
    success: true,
    data: {
      cima: getHolesFor("cima"),
      fundo: getHolesFor("fundo"),
      lateral_esquerda: getHolesFor("lateral_esquerda"),
      lateral_direita: getHolesFor("lateral_direita"),
      porta: getHolesFor("porta"),
    },
  };
}
