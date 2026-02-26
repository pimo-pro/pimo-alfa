/**
 * Drawer
 * 
 * Representa uma gaveta completa com todas as suas peças:
 * - Frente (externa, móvel)
 * - Corpo (interno, móvel junto com a frente)
 * - Laterais, fundo e traseira (dentro do corpo)
 */

import type { DrawerCalculatedSpecs } from "./DrawerParametrics";

export interface DrawerPiece {
  width: number;
  height: number;
  depth: number;
  positionX: number;
  positionY: number;
  positionZ: number;
}

export interface Drawer {
  id: string;
  parentBoxId: string;
  
  // Tipo
  type: "normal" | "pro";
  sideMaterial: "wood" | "aluminum";
  
  // Especificações calculadas
  specs: DrawerCalculatedSpecs;
  
  // Peças individuais (posições locais relativas ao grupo da gaveta)
  pieces: {
    front: DrawerPiece;
    body: {
      width: number;
      height: number;
      depth: number;
    };
    leftSide: DrawerPiece;
    rightSide: DrawerPiece;
    bottom: DrawerPiece;
    back: DrawerPiece;
  };
  
  // Estado de movimento
  motion: {
    isOpen: boolean;
    openProgress: number;      // 0 = fechada, 1 = aberta
    currentOffset: number;     // Deslocamento atual em mm
  };
  
  // Posição no box
  position: {
    x: number;
    y: number;
    z: number;
  };
  
  // Material
  materialId?: string;
}

/**
 * Cria uma gaveta a partir das especificações calculadas
 * REESCRITO: Peças montadas corretamente, sem gaps, encostadas
 */
export function createDrawer(
  id: string,
  parentBoxId: string,
  specs: DrawerCalculatedSpecs,
  position: { x: number; y: number; z: number },
  type: "normal" | "pro" = "normal"
): Drawer {
  // Dimensões das peças
  const frontThickness = specs.front.thickness;
  const sideThickness = specs.leftSide.width;
  const bottomThickness = specs.bottom.thickness;
  const backThickness = specs.back.thickness;
  const bodyWidth = specs.body.width;
  const bodyHeight = specs.body.height;
  const bodyDepth = specs.body.depth;

  return {
    id,
    parentBoxId,
    type,
    sideMaterial: type === "pro" ? "aluminum" : "wood",
    specs,
    pieces: {
      // ===== FRENTE =====
      // Colada ao corpo, flush com a face frontal do box
      // Centro da geometria na origem Z
      front: {
        width: specs.front.width,
        height: specs.front.height,
        depth: frontThickness,
        positionX: 0,
        positionY: 0,
        positionZ: specs.positioning.frontOffsetZ,
      },
      
      // ===== CORPO (REFERÊNCIA) =====
      // Origem: face frontal interna (logo atrás da frente)
      body: {
        width: bodyWidth,
        height: bodyHeight,
        depth: bodyDepth,
      },
      
      // ===== LATERAL ESQUERDA =====
      // Encostada na borda esquerda do corpo
      // Centro em Z no meio do corpo
      leftSide: {
        width: specs.leftSide.width,
        height: specs.leftSide.height,
        depth: specs.leftSide.depth,
        positionX: -bodyWidth / 2 + sideThickness / 2,
        positionY: 0,
        positionZ: -bodyDepth / 2,
      },
      
      // ===== LATERAL DIREITA =====
      // Encostada na borda direita do corpo
      // Centro em Z no meio do corpo
      rightSide: {
        width: specs.rightSide.width,
        height: specs.rightSide.height,
        depth: specs.rightSide.depth,
        positionX: bodyWidth / 2 - sideThickness / 2,
        positionY: 0,
        positionZ: -bodyDepth / 2,
      },
      
      // ===== FUNDO =====
      // Entre as laterais (com encaixe de 5mm cada lado)
      // Embaixo do corpo
      // Centro em Z no meio do corpo
      bottom: {
        width: specs.bottom.width,
        height: bottomThickness,
        depth: specs.bottom.height,
        positionX: 0,
        positionY: -bodyHeight / 2 + bottomThickness / 2,
        positionZ: -bodyDepth / 2,
      },
      
      // ===== TRASEIRA =====
      // No fundo do corpo, entre as laterais
      // 10mm mais curta (fundo passa por baixo)
      back: {
        width: specs.back.width,
        height: specs.back.height,
        depth: backThickness,
        positionX: 0,
        positionY: 0,
        positionZ: -bodyDepth + backThickness / 2,
      },
    },
    motion: {
      isOpen: false,
      openProgress: 0,
      currentOffset: 0,
    },
    position,
  };
}

/**
 * Atualiza o estado de abertura da gaveta
 */
export function updateDrawerMotion(
  drawer: Drawer,
  isOpen: boolean,
  progress: number
): Drawer {
  const maxOffset = drawer.specs.positioning.pullDistance;
  const currentOffset = maxOffset * progress;

  return {
    ...drawer,
    motion: {
      isOpen,
      openProgress: progress,
      currentOffset,
    },
  };
}

/**
 * Retorna a posição absoluta da frente (considerando movimento)
 */
export function getFrontAbsolutePosition(drawer: Drawer): {
  x: number;
  y: number;
  z: number;
} {
  return {
    x: drawer.position.x + drawer.pieces.front.positionX,
    y: drawer.position.y + drawer.pieces.front.positionY,
    z: drawer.position.z + drawer.pieces.front.positionZ + drawer.motion.currentOffset,
  };
}

/**
 * Retorna a posição absoluta do corpo (considerando movimento)
 */
export function getBodyAbsolutePosition(drawer: Drawer): {
  x: number;
  y: number;
  z: number;
} {
  return {
    x: drawer.position.x,
    y: drawer.position.y,
    z: drawer.position.z + drawer.motion.currentOffset,
  };
}
