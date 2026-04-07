/**
 * DrawerParametrics - REESCRITO PARA MARCENARIA REAL
 * 
 * Calcula dimensões reais de gavetas fabricáveis:
 * - Frente: cobre abertura (larguraInterna - 2mm)
 * - Corpo: espaço para corrediças (larguraInterna - 14mm)
 * - Laterais: encostadas no corpo
 * - Fundo: entra 5mm em todas as peças
 * - Traseira: 10mm mais curta (fundo passa por baixo)
 */

import { devLogger } from "../../utils/devLogger";

export interface DrawerDimensions {
  // Box de referência (dimensões internas)
  boxInternalWidth: number;
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

/**
 * CONSTANTES DE MARCENARIA REAL
 * Baseadas em padrões globais de fabricação de gavetas
 */

// Folgas externas (entre gaveta e box)
const FRONT_GAP_MM = 1;                    // Folga da frente (1mm cada lado)
const SIDE_GAP_MM = 7;                     // Folga lateral para corrediças (7mm cada lado)

// Espessuras de peças
const FRONT_THICKNESS_MM = 19;             // Espessura da frente
const SIDE_THICKNESS_MM = 15;              // Espessura das laterais (madeira)
const BOTTOM_THICKNESS_MM = 10;            // Espessura do fundo
const BACK_THICKNESS_MM = 15;              // Espessura da traseira

// Reduções do corpo em relação à gaveta total
const BODY_HEIGHT_REDUCTION_MM = 6;        // Corpo menor que altura disponível
const BODY_DEPTH_REDUCTION_MM = 30;        // Corpo menor que profundidade (espaço corrediças)
const BACK_HEIGHT_REDUCTION_MM = 10;       // Traseira mais curta (fundo passa por baixo)

// Encaixes do fundo (marcenaria real)
const BOTTOM_SLOT_INTO_FRONT_MM = 5;       // Fundo entra 5mm na frente
const BOTTOM_SLOT_INTO_SIDES_MM = 5;       // Fundo entra 5mm em cada lateral
const BOTTOM_SLOT_INTO_BACK_MM = 5;        // Fundo entra 5mm sob a traseira

/**
 * Calcula todas as dimensões de uma gaveta
 * baseado em regras reais de marcenaria
 */
export function calculateDrawerSpecs(
  dimensions: DrawerDimensions,
  _availableDepths: number[]
): DrawerCalculatedSpecs {
  const {
    boxInternalWidth,
    boxInternalDepth,
    drawerHeight,
    type: _type,
  } = dimensions;

  // ===== FRENTE =====
  // Frente cobre a abertura com folga mínima (1mm cada lado)
  // Fica FLUSH com o box, colada ao corpo
  const frontWidth = Math.max(1, boxInternalWidth - (2 * FRONT_GAP_MM));
  const frontHeight = Math.max(1, drawerHeight - (2 * FRONT_GAP_MM));
  const frontThickness = FRONT_THICKNESS_MM;

  // ===== CORPO =====
  // Corpo menor que a frente:
  // - largura: -14mm (7mm cada lado para corrediças)
  // - altura: -4mm (respiro/folga vertical)
  // - profundidade: -30mm (espaço para corrediças traseiras)
  const bodyWidth = Math.max(1, boxInternalWidth - (2 * SIDE_GAP_MM));
  const bodyHeight = Math.max(1, drawerHeight - BODY_HEIGHT_REDUCTION_MM);
  const bodyDepth = Math.max(1, boxInternalDepth - BODY_DEPTH_REDUCTION_MM);

  // ===== LATERAIS =====
  // A frente cobre a abertura com folga de 1mm de cada lado
  // Laterais têm a altura do corpo e profundidade do corpo
  // Espessura fixa de 15mm (madeira)
  const sideThickness = SIDE_THICKNESS_MM;
  const leftSideWidth = sideThickness;
  const leftSideHeight = bodyHeight;
  const leftSideDepth = bodyDepth;

  const rightSideWidth = sideThickness;
  const rightSideHeight = bodyHeight;
  const rightSideDepth = bodyDepth;

  // ===== TRASEIRA =====
  // Traseira tem largura do corpo, mas é 10mm mais curta
  // (o fundo passa por baixo e é parafusado)
  const backWidth = bodyWidth;
  const backHeight = Math.max(1, bodyHeight - BACK_HEIGHT_REDUCTION_MM);
  const backThickness = BACK_THICKNESS_MM;

  // ===== FUNDO =====
  // Fundo entra 5mm em todas as outras peças (encaixe real de marcenaria)
  const bottomThickness = BOTTOM_THICKNESS_MM;
  // Largura: entre as laterais (corpo - 10mm, 5mm cada lado)
  const bottomWidth = Math.max(1, bodyWidth - (2 * BOTTOM_SLOT_INTO_SIDES_MM));
  // Profundidade: da frente até a traseira (corpo - 10mm)
  const bottomDepth = Math.max(
    1,
    bodyDepth - BOTTOM_SLOT_INTO_FRONT_MM - BOTTOM_SLOT_INTO_BACK_MM
  );

  // ===== POSICIONAMENTO =====
  const frontOffsetZ = frontThickness / 2;
  const bodyOffsetZ = 0;
  const pullDistance = bodyDepth;

  return {
    front: {
      width: frontWidth,
      height: frontHeight,
      depth: frontThickness,
      thickness: frontThickness,
    },
    body: {
      width: bodyWidth,
      height: bodyHeight,
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
    gaps: {
      frontGap: FRONT_GAP_MM,
      sideGap: SIDE_GAP_MM,
      bottomSlots: {
        front: BOTTOM_SLOT_INTO_FRONT_MM,
        sides: BOTTOM_SLOT_INTO_SIDES_MM,
        back: BOTTOM_SLOT_INTO_BACK_MM,
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

  // Diferença deve ser exatamente 12mm (6mm cada lado)
  const widthDiff = specs.front.width - specs.body.width;
  const expectedDiff = (FRONT_GAP_MM + SIDE_GAP_MM) * 2;
  if (Math.abs(widthDiff - expectedDiff) > 0.1) {
    devLogger.warn(`DrawerParametrics: diferença incorreta (${widthDiff}mm, esperado ${expectedDiff}mm)`);
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
