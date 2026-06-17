/**
 * DrawerParametrics
 *
 * Calcula dimensoes reais para o sistema europeu de gavetas:
 * - Frente overlay externa, fora da caixa.
 * - Corpo atras da frente, com folgas para corredicas.
 * - Laterais/traseira 70 mm mais baixas que a frente.
 * - Profundidade nominal escolhida a partir de settings.gavetas.
 */

import {
  settingsDefaults,
  type DrawerHandlePosition,
  type DrawerHandleType,
  type DrawerMetalBoxType,
  type DrawerSlideType,
  type SettingsSchema,
} from "../settings/settingsSchema";
import { devLogger } from "../../utils/devLogger";

export interface DrawerDimensions {
  // Box de referência (dimensões internas)
  boxInternalWidth: number;
  /** Largura externa do módulo (overlay da frente, alinhada à porta). */
  boxExternalWidth: number;
  boxInternalHeight: number;
  boxInternalDepth: number;
  boxThickness: number;

  // Altura desta gaveta específica (proporcional ao número de gavetas)
  drawerHeight: number;

  // Número total de gavetas no box (para cálculos proporcionais)
  totalDrawers: number;

  // Tipo de gaveta
  type: "normal" | "pro";
}

export interface DrawerPieceSpec {
  width: number;
  height: number;
  depth: number;
}

export interface DrawerCalculatedSpecs {
  // Frente (maior - cobre abertura)
  front: DrawerPieceSpec & { thickness: number };
  
  // Corpo (menor - espaço para corrediças)
  body: {
    width: number;
    height: number;
    depth: number;
  };
  
  // Laterais
  leftSide: DrawerPieceSpec;
  rightSide: DrawerPieceSpec;
  
  // Fundo
  bottom: DrawerPieceSpec & { thickness: number };
  
  // Traseira
  back: DrawerPieceSpec & { thickness: number };
  
  // Posicionamento
  positioning: {
    frontOffsetZ: number;      // +19mm à frente
    bodyOffsetZ: number;       // Centro do corpo
    pullDistance: number;      // Distância máxima de abertura
  };

  slide: {
    type: DrawerSlideType;
    softClose: boolean;
    capacityKg: 30 | 40 | 50 | 70;
    cursoTotalMm: number;
  };

  metalBox: {
    type: DrawerMetalBoxType;
    enabled: boolean;
    height: number;
    compatibleDepths: number[];
  };

  handle: {
    type: DrawerHandleType;
    position: DrawerHandlePosition;
    offsetMm: number;
  };

  validation: {
    warnings: string[];
  };

  /** Profundidade nominal (corrediça) e recuo aplicado (FASE 6). */
  nominalDepthMm: number;
  runnerClearanceMm: number;
  
  // Gaps/folgas
  gaps: {
    frontGap: number;          // 1mm cada lado
    sideGap: number;           // 7mm cada lado (corrediças)
    bottomSlots: {
      front: number;           // 5mm - fundo entra na frente
      sides: number;           // 5mm - fundo entra nas laterais
      back: number;            // 5mm - fundo entra na traseira
    };
  };
}

export type DrawerParametricSettings = SettingsSchema["gavetas"];

/** Overrides por gaveta vindos da UI (drawersLayer.metadata + campos espelhados). */
export type DrawerParametricOverrides = {
  nominalDepthMm?: number;
  slideType?: DrawerSlideType;
  metalBoxType?: DrawerMetalBoxType;
  softClose?: boolean;
  drawerType?: "normal" | "pro";
};

const MIN_BODY_DEPTH_MM = 50;
const MIN_MM = 1;
const SOFT_CLOSE_COMPATIBLE_SLIDES = new Set<DrawerSlideType>([
  "Blum Tandem",
  "Blum Movento",
  "Hettich InnoTech",
  "Hettich ArciTech",
  "Hafele Matrix",
]);

function clampMm(value: number, min = MIN_MM): number {
  return Math.max(min, Number.isFinite(value) ? value : min);
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function normalizeDepths(depths: unknown, fallback: number[]): number[] {
  const parsed = Array.isArray(depths)
    ? depths
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
        .sort((a, b) => a - b)
    : [];
  return parsed.length > 0 ? parsed : fallback;
}

function resolveDrawerSettings(
  settings?: Partial<DrawerParametricSettings>,
  availableDepths?: number[]
): DrawerParametricSettings {
  const defaults = settingsDefaults.gavetas;
  return {
    ...defaults,
    ...settings,
    gavetaFolgaFrenteMm: normalizePositiveNumber(settings?.gavetaFolgaFrenteMm, defaults.gavetaFolgaFrenteMm),
    gavetaFolgaLateralMm: normalizePositiveNumber(settings?.gavetaFolgaLateralMm, defaults.gavetaFolgaLateralMm),
    gavetaEspessuraFrenteMm: normalizePositiveNumber(settings?.gavetaEspessuraFrenteMm, defaults.gavetaEspessuraFrenteMm),
    gavetaEspessuraLateralMm: normalizePositiveNumber(settings?.gavetaEspessuraLateralMm, defaults.gavetaEspessuraLateralMm),
    gavetaEspessuraTraseiraMm: normalizePositiveNumber(settings?.gavetaEspessuraTraseiraMm, defaults.gavetaEspessuraTraseiraMm),
    gavetaEspessuraFundoMm: normalizePositiveNumber(settings?.gavetaEspessuraFundoMm, defaults.gavetaEspessuraFundoMm),
    gavetaRecuoCorpoMm: normalizePositiveNumber(settings?.gavetaRecuoCorpoMm, defaults.gavetaRecuoCorpoMm),
    gavetaRecuoProfundidadeCorredicaMm: normalizePositiveNumber(
      settings?.gavetaRecuoProfundidadeCorredicaMm,
      defaults.gavetaRecuoProfundidadeCorredicaMm
    ),
    gavetaProfundidadesDisponiveisMm: normalizeDepths(
      settings?.gavetaProfundidadesDisponiveisMm ?? availableDepths,
      defaults.gavetaProfundidadesDisponiveisMm
    ),
    gavetaAlturaModoPadrao:
      settings?.gavetaAlturaModoPadrao === "top_small_mid_medium_bottom_large" || settings?.gavetaAlturaModoPadrao === "custom"
        ? settings.gavetaAlturaModoPadrao
        : "equal",
  };
}

function chooseNominalDepth(boxInternalDepth: number, availableDepths: number[]): number {
  const sorted = normalizeDepths(availableDepths, settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm);
  const fitting = sorted.filter((depth) => depth <= boxInternalDepth);
  return fitting.length > 0 ? fitting[fitting.length - 1] : sorted[0];
}

function resolveNominalDepth(
  boxInternalDepth: number,
  availableDepths: number[],
  overrideMm?: number
): number {
  if (overrideMm != null && Number.isFinite(overrideMm) && overrideMm > 0) {
    return Math.min(overrideMm, boxInternalDepth);
  }
  return chooseNominalDepth(boxInternalDepth, availableDepths);
}

function applyDrawerParametricOverrides(
  settings: DrawerParametricSettings,
  overrides?: DrawerParametricOverrides
): DrawerParametricSettings {
  if (!overrides) return settings;

  const next = { ...settings };
  if (overrides.slideType) next.gavetaTipoCorredica = overrides.slideType;
  if (overrides.metalBoxType) next.gavetaTipoCaixaMetalica = overrides.metalBoxType;
  if (typeof overrides.softClose === "boolean") next.gavetaSoftClose = overrides.softClose;
  return next;
}

function resolveSlideCourse(settings: DrawerParametricSettings, bodyDepth: number): number {
  const override = Number(settings.gavetaCursoTotalMm);
  if (Number.isFinite(override) && override > 0) return Math.min(override, bodyDepth);
  if (settings.gavetaTipoCorredica === "Blum Tandem" || settings.gavetaTipoCorredica === "Blum Movento") {
    return bodyDepth;
  }
  return bodyDepth;
}

/**
 * Calcula todas as dimensões de uma gaveta
 * baseado em regras reais de marcenaria
 */
export function calculateDrawerSpecs(
  dimensions: DrawerDimensions,
  availableDepths: number[],
  drawerSettings?: Partial<DrawerParametricSettings>,
  overrides?: DrawerParametricOverrides
): DrawerCalculatedSpecs {
  const {
    boxInternalWidth,
    boxExternalWidth,
    boxInternalDepth,
    drawerHeight,
    type,
  } = dimensions;
  const baseSettings = resolveDrawerSettings(drawerSettings, availableDepths);
  const settings = applyDrawerParametricOverrides(baseSettings, overrides);
  const drawerType = overrides?.drawerType ?? type;
  const frontGap = settings.gavetaFolgaFrenteMm;
  const sideGap = settings.gavetaFolgaLateralMm;
  const frontThickness = settings.gavetaEspessuraFrenteMm;
  const sideThickness = settings.gavetaEspessuraLateralMm;
  const bottomThickness = settings.gavetaEspessuraFundoMm;
  const backThickness = settings.gavetaEspessuraTraseiraMm;
  const bodyRecess = settings.gavetaRecuoCorpoMm;
  const runnerClearanceMm = settings.gavetaRecuoProfundidadeCorredicaMm;
  const availableDepthRules = settings.gavetaValidarProfundidadeCompativel
    ? settings.gavetaProfundidadesCompativeisMm
    : settings.gavetaProfundidadesDisponiveisMm;
  const nominalDepth = resolveNominalDepth(
    boxInternalDepth,
    availableDepthRules,
    overrides?.nominalDepthMm
  );
  const metalBoxEnabled = settings.gavetaTipoCaixaMetalica !== "Nenhuma" || drawerType === "pro";
  const metalBoxType = metalBoxEnabled
    ? settings.gavetaTipoCaixaMetalica !== "Nenhuma"
      ? settings.gavetaTipoCaixaMetalica
      : "Genérica"
    : "Nenhuma";
  const warnings: string[] = [];

  // ===== FRENTE =====
  // Frente overlay externa: largura do módulo com folga industrial (como porta), 1 mm por lado.
  const externalWidth =
    Number.isFinite(boxExternalWidth) && boxExternalWidth > 0
      ? boxExternalWidth
      : boxInternalWidth + 2 * dimensions.boxThickness;
  const frontWidth = clampMm(externalWidth - 2 * frontGap);
  const frontHeight = clampMm(drawerHeight - 2);

  // ===== CORPO =====
  // Padrao europeu: corpo com folga lateral, profundidade nominal e altura 70 mm abaixo da frente.
  const bodyWidth = clampMm(boxInternalWidth - (2 * sideGap));
  const bodyHeight = clampMm(frontHeight - bodyRecess);
  const bodyDepth = clampMm(nominalDepth - runnerClearanceMm);
  const woodBodyHeight = metalBoxEnabled && settings.gavetaAlturaCaixaMetalicaMm > 0
    ? settings.gavetaAlturaCaixaMetalicaMm
    : bodyHeight;

  // ===== LATERAIS =====
  const leftSideWidth = metalBoxEnabled ? 0 : sideThickness;
  const leftSideHeight = metalBoxEnabled ? 0 : bodyHeight;
  const leftSideDepth = metalBoxEnabled ? 0 : bodyDepth;

  const rightSideWidth = metalBoxEnabled ? 0 : sideThickness;
  const rightSideHeight = metalBoxEnabled ? 0 : bodyHeight;
  const rightSideDepth = metalBoxEnabled ? 0 : bodyDepth;

  // ===== TRASEIRA =====
  const backWidth = metalBoxEnabled ? 0 : clampMm(bodyWidth - (2 * sideThickness));
  const backHeight = metalBoxEnabled ? 0 : bodyHeight;

  // ===== FUNDO =====
  const bottomWidth = metalBoxEnabled ? 0 : backWidth;
  const bottomDepth = metalBoxEnabled ? 0 : bodyDepth;

  // ===== POSICIONAMENTO =====
  const frontOffsetZ = 0;
  const bodyOffsetZ = -(frontThickness / 2 + bodyDepth / 2);
  const pullDistance = resolveSlideCourse(settings, bodyDepth);

  if (frontHeight < settings.gavetaAlturaMinimaMm) {
    warnings.push(`Altura da frente abaixo do minimo (${settings.gavetaAlturaMinimaMm}mm).`);
  }
  if (frontHeight > settings.gavetaAlturaMaximaMm) {
    warnings.push(`Altura da frente acima do maximo (${settings.gavetaAlturaMaximaMm}mm).`);
  }
  if (settings.gavetaValidarSoftCloseCompativel && settings.gavetaSoftClose && !SOFT_CLOSE_COMPATIBLE_SLIDES.has(settings.gavetaTipoCorredica)) {
    warnings.push(`Soft-close nao validado para ${settings.gavetaTipoCorredica}.`);
  }
  if (metalBoxEnabled && settings.gavetaAlturaCaixaMetalicaMm > 0 && frontHeight < settings.gavetaAlturaCaixaMetalicaMm) {
    warnings.push(`Frente abaixo da altura da caixa metalica (${settings.gavetaAlturaCaixaMetalicaMm}mm).`);
  }
  if (
    overrides?.nominalDepthMm != null &&
    overrides.nominalDepthMm > boxInternalDepth
  ) {
    warnings.push(
      `Profundidade nominal ${overrides.nominalDepthMm}mm excede profundidade interna (${boxInternalDepth}mm).`
    );
  }
  if (bodyDepth < MIN_BODY_DEPTH_MM) {
    warnings.push(
      `Profundidade do corpo (${bodyDepth}mm) abaixo do minimo industrial (${MIN_BODY_DEPTH_MM}mm).`
    );
  }
  if (
    settings.gavetaValidarProfundidadeCompativel &&
    !availableDepthRules.includes(nominalDepth)
  ) {
    warnings.push(`Profundidade nominal ${nominalDepth}mm incompativel com caixa metalica/corredica.`);
  }

  return {
    front: {
      width: frontWidth,
      height: frontHeight,
      depth: frontThickness,
      thickness: frontThickness,
    },
    body: {
      width: bodyWidth,
      height: woodBodyHeight,
      depth: bodyDepth,
    },
    leftSide: {
      width: leftSideWidth,
      height: leftSideHeight,
      depth: leftSideDepth,
    },
    rightSide: {
      width: rightSideWidth,
      height: rightSideHeight,
      depth: rightSideDepth,
    },
    bottom: {
      width: bottomWidth,
      height: bottomDepth,
      depth: bottomThickness,
      thickness: bottomThickness,
    },
    back: {
      width: backWidth,
      height: backHeight,
      depth: backThickness,
      thickness: backThickness,
    },
    positioning: {
      frontOffsetZ,
      bodyOffsetZ,
      pullDistance,
    },
    slide: {
      type: settings.gavetaTipoCorredica,
      softClose: settings.gavetaSoftClose,
      capacityKg: settings.gavetaCapacidadeCargaKg,
      cursoTotalMm: pullDistance,
    },
    metalBox: {
      type: metalBoxType,
      enabled: metalBoxEnabled,
      height: settings.gavetaAlturaCaixaMetalicaMm,
      compatibleDepths: settings.gavetaProfundidadesCompativeisMm,
    },
    handle: {
      type: settings.gavetaTipoHandle,
      position: settings.gavetaPosicaoHandle,
      offsetMm: settings.gavetaOffsetHandleMm,
    },
    validation: {
      warnings,
    },
    nominalDepthMm: nominalDepth,
    runnerClearanceMm: runnerClearanceMm,
    gaps: {
      frontGap,
      sideGap,
      bottomSlots: {
        front: 0,
        sides: 0,
        back: 0,
      },
    },
  };
}

/**
 * Valida se as dimensões calculadas são válidas
 */
export function validateDrawerSpecs(specs: DrawerCalculatedSpecs): boolean {
  // Frente deve ser maior que corpo
  if (specs.front.width <= specs.body.width) {
    devLogger.warn("DrawerParametrics: frente deve ser maior que corpo");
    return false;
  }

  if (specs.body.depth <= 0 || specs.positioning.pullDistance > specs.body.depth) {
    devLogger.warn("DrawerParametrics: curso de abertura invalido");
    return false;
  }

  if (!specs.metalBox.enabled && (specs.leftSide.width <= 0 || specs.back.thickness <= 0 || specs.bottom.thickness <= 0)) {
    devLogger.warn("DrawerParametrics: espessuras invalidas");
    return false;
  }

  return true;
}

/**
 * Calcula bounding box total da gaveta (fechada)
 */
export function getDrawerBoundingBox(specs: DrawerCalculatedSpecs): {
  width: number;
  height: number;
  depth: number;
} {
  return {
    width: specs.front.width,
    height: specs.front.height,
    depth: specs.front.thickness + specs.body.depth,
  };
}
