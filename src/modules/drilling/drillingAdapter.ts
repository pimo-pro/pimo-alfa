import type {
  CutListItem,
  DrillFace,
  DrillType,
  OperationResult,
  PanelDrillHole,
  TechnicalDrillHole,
  ViewerDrillMarkersByPanel,
} from "../../core/types";
import type { RulesConfig } from "../../core/rules/rulesConfig";
import { MIN_MARGEM_DOBRADICA_TOP_BOTTOM_MM, getHingeYPositions, normalizeRulesConfig } from "../../core/rules/rulesConfig";
import { getSettings } from "../../core/settings/settingsService";
import type { PieceType } from "../../core/drilling/drillingService";
import { calculateTechnicalDrillingsForPiece, drillFaceToPanelFace, isTopDrillable } from "../../core/drilling/drillingService";
import { devLogger } from "../../utils/devLogger";

export type PanelDrillingInput = {
  tipo: string;
  larguraMm: number;
  alturaMm: number;
  espessuraMm: number;
  doorHeightMm?: number;
  /** Largura da porta (mm). Para hingeSide top/bottom: posições ao longo da largura; usado em cima/fundo para copiar da porta. */
  doorWidthMm?: number;
  hingeSide?: "left" | "right" | "top" | "bottom";
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
  portaPerDoor: [],
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

  const centerOffset = (lateralHeightMm - doorHeightMm) / 2;
  return doorPositions.map((y) => Math.max(yMinSafe, Math.min(yMaxSafe, y + centerOffset)));
}

/** Posições X (mm) para furação top/bottom: porta = master, painel cima/fundo copia. Mesma lógica que getHingePositionsFromDoorHeight mas ao longo da largura. */
function getHingePositionsFromDoorWidth(
  rules: RulesConfig,
  doorWidthMm: number,
  panelWidthMm: number
): number[] {
  if (!Number.isFinite(doorWidthMm) || doorWidthMm <= 0) return [];
  const numHinges = rules.furos?.tecnicos?.dobradica?.numeroPorPorta ?? 2;
  const doorPositions = getHingeYPositions(doorWidthMm, numHinges, rules);
  if (doorPositions.length === 0) return [];
  if (!Number.isFinite(panelWidthMm) || panelWidthMm <= 0) return doorPositions;

  const margem = MIN_MARGEM_DOBRADICA_TOP_BOTTOM_MM;
  const xMinPanel = margem;
  const xMaxPanel = Math.max(xMinPanel, panelWidthMm - margem);
  const distEntreCalco = rules.furos?.tecnicos?.dobradica_fixacao?.distanciaEntreFurosCalco ?? 32;
  const halfDistHoles = distEntreCalco / 2;
  const xMinSafe = xMinPanel + halfDistHoles;
  const xMaxSafe = Math.max(xMinSafe, xMaxPanel - halfDistHoles);

  const centerOffset = (panelWidthMm - doorWidthMm) / 2;
  return doorPositions.map((x) => Math.max(xMinSafe, Math.min(xMaxSafe, x + centerOffset)));
}

/** Converte furação técnica em furos reais do painel (face A/B via drillingService — docs/matriz-faces-A-B-FINAL.md). */
function toPanelDrillHoles(furacoesTecnicas: TechnicalDrillHole[], pieceType: PieceType): PanelDrillHole[] {
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
      face: drillFaceToPanelFace(h.face, pieceType),
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

  // Distâncias e sideOffset de parafuso e cavilha vêm SEMPRE das configurações globais (sem overrides por projeto)
  const parafusoFront = toFiniteNumber(fu.parafuso.frontDistance, 90);
  const parafusoBack = toFiniteNumber(fu.parafuso.backDistance, 90);
  const parafusoSideOffset = toFiniteNumber(fu.parafuso.sideOffset, 9.5);
  const cavilhaFront = toFiniteNumber(fu.cavilha?.frontDistance, 60);
  const cavilhaBack = toFiniteNumber(fu.cavilha?.backDistance, 60);
  const cavilhaSideOffset = toFiniteNumber(fu.cavilha?.sideOffset, 9.5);

  return {
    ...normalizedRules,
    furos: {
      ...normalizedRules.furos,
      tecnicos: {
        ...normalizedRules.furos.tecnicos,
        parafuso: {
          ...normalizedRules.furos.tecnicos.parafuso,
          distanciaFrente: parafusoFront,
          distanciaFundo: parafusoBack,
          offsetDaBorda: fu.parafuso.offsetDaBorda,
          sideOffset: parafusoSideOffset,
        },
        cavilha: {
          ...normalizedRules.furos.tecnicos.cavilha,
          distanciaFrente: cavilhaFront,
          distanciaFundo: cavilhaBack,
          offsetDaBorda: fu.parafuso.offsetDaBorda,
          sideOffset: cavilhaSideOffset,
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
  const isTopPanel = input.tipo === "cima";
  const isBottomPanel = input.tipo === "fundo";
  const distEntreFixacao = rules.furos.tecnicos.dobradica_fixacao.distanciaEntreFurosCalco;
  const numHinges = rules.furos.tecnicos.dobradica.numeroPorPorta;

  let hingePositions: number[] = [];
  /* Laterais (left/right): posições Y copiadas da altura da porta. */
  if (isLateral && Number.isFinite(input.doorHeightMm)) {
    const lateralPositions = getHingePositionsFromDoorHeight(rules, Number(input.doorHeightMm), input.alturaMm);
    hingePositions = sanitizeHingePositions(lateralPositions, input.alturaMm, distEntreFixacao);
  } else if (isDoor) {
    /* Porta: top/bottom = posições ao longo da largura (X); left/right = ao longo da altura (Y). */
    if (input.hingeSide === "top" || input.hingeSide === "bottom") {
      const rawDoorHinges = getHingeYPositions(input.larguraMm, numHinges, rules);
      hingePositions = sanitizeHingePositions(rawDoorHinges, input.larguraMm, distEntreFixacao);
    } else {
      const rawDoorHinges = getHingeYPositions(input.alturaMm, numHinges, rules);
      hingePositions = sanitizeHingePositions(rawDoorHinges, input.alturaMm, distEntreFixacao);
    }
  } else if ((isTopPanel && input.hingeSide === "top") || (isBottomPanel && input.hingeSide === "bottom")) {
    /* Painel cima/fundo: posições X copiadas da largura da porta (porta = master). Fallback: usar largura do painel. */
    const refWidthMm = Number.isFinite(input.doorWidthMm) ? Number(input.doorWidthMm) : input.larguraMm;
    if (Number.isFinite(refWidthMm) && refWidthMm > 0) {
      const panelPositions = getHingePositionsFromDoorWidth(rules, refWidthMm, input.larguraMm);
      hingePositions = sanitizeHingePositions(panelPositions, input.larguraMm, distEntreFixacao);
    }
  }

  let furacoesTecnicas: TechnicalDrillHole[] = [];
  try {
    furacoesTecnicas = calculateTechnicalDrillingsForPiece(
      {
        tipo: input.tipo,
        largura: input.larguraMm,
        altura: input.alturaMm,
        espessura: input.espessuraMm,
        hingeSide: input.hingeSide,
        hingePositionsMm: hingePositions.length > 0 ? hingePositions : undefined,
      },
      rules
    );
  } catch (err) {
      devLogger.warn(`[drillingAdapter] Error generating technical holes for ${input.tipo}:`, err);
    return { success: false, error: `Erro ao gerar furação para painel ${input.tipo}.` };
  }

  return {
    success: true,
    data: {
      drillHoles: toPanelDrillHoles(furacoesTecnicas, input.tipo as PieceType),
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
  const doorItemsInOrder = cutList.filter((item) => doorTipos.includes(item.tipo));
  const firstDoorItem = doorItemsInOrder[0];
  const canonicalDoorItem =
    cutList.find((item) => item.tipo === "porta_dupla" && /-(2|02)$/.test(String(item.id ?? ""))) ?? firstDoorItem;

  /** Filtra furos da face externa (A): no Viewer mostramos apenas os da face interna (B). */
  const onlyInternalFaceHoles = (holes: PanelDrillHole[]): PanelDrillHole[] =>
    holes.filter((h) => h.face !== "A");

  const portaPerDoor: TechnicalDrillHole[][] = doorItemsInOrder.map((item) =>
    item?.drillHoles?.length
      ? panelDrillHolesToTechnical(onlyInternalFaceHoles(item.drillHoles), "tras")
      : []
  );
  const portaMerged =
    canonicalDoorItem?.drillHoles?.length
      ? panelDrillHolesToTechnical(onlyInternalFaceHoles(canonicalDoorItem.drillHoles), "tras")
      : portaPerDoor[0] ?? [];

  const getHolesFor = (tipo: keyof Omit<ViewerDrillMarkersByPanel, "portaPerDoor">): TechnicalDrillHole[] => {
    if (tipo === "porta") return portaMerged;
    const item = byType.get(tipo);
    if (!item?.drillHoles?.length) return [];
    const face: DrillFace =
      tipo === "cima" ? "fundo" : tipo === "fundo" ? "cima" : tipo === "lateral_esquerda" ? "direita" : "esquerda";
    // Modelo unificado (docs/matriz-faces-A-B-FINAL.md): Viewer mostra apenas face interna (B) em todos os painéis.
    const holesToUse = onlyInternalFaceHoles(item.drillHoles);
    return panelDrillHolesToTechnical(holesToUse, face);
  };

  return {
    success: true,
    data: {
      cima: getHolesFor("cima"),
      fundo: getHolesFor("fundo"),
      lateral_esquerda: getHolesFor("lateral_esquerda"),
      lateral_direita: getHolesFor("lateral_direita"),
      porta: portaMerged,
      portaPerDoor: portaPerDoor.length > 0 ? portaPerDoor : undefined,
    },
  };
}
