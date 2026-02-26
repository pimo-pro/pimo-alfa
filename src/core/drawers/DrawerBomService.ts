/**
 * DrawerBomService
 * 
 * Extrai todas as peças de gavetas para a BOM (Bill of Materials).
 * Garante que TODAS as peças aparecem na lista:
 * - Frente
 * - Laterais (esquerda/direita)
 * - Fundo
 * - Traseira
 * - Corrediças (hardware)
 * - Parafusos/ferragens
 */

import type { Drawer } from "./Drawer";
import type { DrawerGroup } from "./DrawerGroup";

export interface DrawerPieceForBom {
  drawerId: string;
  drawerIndex: number;
  boxId: string;
  pieceType: "front" | "leftSide" | "rightSide" | "bottom" | "back";
  pieceName: string;
  
  // Dimensões em mm
  width: number;
  height: number;
  depth: number;
  
  // Material
  materialId?: string;
  materialType: "wood" | "aluminum";
  
  // Quantidade
  quantity: number;
  
  // Área/volume
  areaM2: number;
  volumeM3: number;
}

export interface DrawerHardwareForBom {
  drawerId: string;
  drawerIndex: number;
  boxId: string;
  hardwareType: "slide" | "screw" | "handle";
  hardwareName: string;
  
  // Corrediças
  slideLength?: number;  // mm
  slideType?: "normal" | "pro";
  
  // Quantidade
  quantity: number;
}

/**
 * Extrai todas as peças de madeira de uma gaveta
 */
export function extractDrawerPiecesForBom(drawer: Drawer): DrawerPieceForBom[] {
  const pieces: DrawerPieceForBom[] = [];
  
  // Helper para calcular área
  const calcArea = (w: number, h: number) => (w * h) / 1_000_000; // mm² → m²
  const calcVolume = (w: number, h: number, d: number) => (w * h * d) / 1_000_000_000; // mm³ → m³
  
  // FRENTE
  pieces.push({
    drawerId: drawer.id,
    drawerIndex: 0, // Será preenchido pelo grupo
    boxId: drawer.parentBoxId,
    pieceType: "front",
    pieceName: "Frente da Gaveta",
    width: drawer.pieces.front.width,
    height: drawer.pieces.front.height,
    depth: drawer.pieces.front.depth,
    materialId: drawer.materialId,
    materialType: "wood",
    quantity: 1,
    areaM2: calcArea(drawer.pieces.front.width, drawer.pieces.front.height),
    volumeM3: calcVolume(
      drawer.pieces.front.width,
      drawer.pieces.front.height,
      drawer.pieces.front.depth
    ),
  });
  
  // LATERAL ESQUERDA (se não for tipo PRO)
  if (drawer.type === "normal" && drawer.pieces.leftSide.width > 0) {
    pieces.push({
      drawerId: drawer.id,
      drawerIndex: 0,
      boxId: drawer.parentBoxId,
      pieceType: "leftSide",
      pieceName: "Lateral Esquerda",
      width: drawer.pieces.leftSide.width,
      height: drawer.pieces.leftSide.height,
      depth: drawer.pieces.leftSide.depth,
      materialId: drawer.materialId,
      materialType: "wood",
      quantity: 1,
      areaM2: calcArea(drawer.pieces.leftSide.height, drawer.pieces.leftSide.depth),
      volumeM3: calcVolume(
        drawer.pieces.leftSide.width,
        drawer.pieces.leftSide.height,
        drawer.pieces.leftSide.depth
      ),
    });
  }
  
  // LATERAL DIREITA (se não for tipo PRO)
  if (drawer.type === "normal" && drawer.pieces.rightSide.width > 0) {
    pieces.push({
      drawerId: drawer.id,
      drawerIndex: 0,
      boxId: drawer.parentBoxId,
      pieceType: "rightSide",
      pieceName: "Lateral Direita",
      width: drawer.pieces.rightSide.width,
      height: drawer.pieces.rightSide.height,
      depth: drawer.pieces.rightSide.depth,
      materialId: drawer.materialId,
      materialType: "wood",
      quantity: 1,
      areaM2: calcArea(drawer.pieces.rightSide.height, drawer.pieces.rightSide.depth),
      volumeM3: calcVolume(
        drawer.pieces.rightSide.width,
        drawer.pieces.rightSide.height,
        drawer.pieces.rightSide.depth
      ),
    });
  }
  
  // FUNDO (se não for tipo PRO)
  if (drawer.type === "normal" && drawer.specs.bottom.thickness > 0) {
    pieces.push({
      drawerId: drawer.id,
      drawerIndex: 0,
      boxId: drawer.parentBoxId,
      pieceType: "bottom",
      pieceName: "Fundo da Gaveta",
      width: drawer.pieces.bottom.width,
      height: drawer.pieces.bottom.height,  // thickness no modelo
      depth: drawer.pieces.bottom.depth,
      materialId: drawer.materialId,
      materialType: "wood",
      quantity: 1,
      areaM2: calcArea(drawer.pieces.bottom.width, drawer.pieces.bottom.depth),
      volumeM3: calcVolume(
        drawer.pieces.bottom.width,
        drawer.pieces.bottom.height,
        drawer.pieces.bottom.depth
      ),
    });
  }
  
  // TRASEIRA
  pieces.push({
    drawerId: drawer.id,
    drawerIndex: 0,
    boxId: drawer.parentBoxId,
    pieceType: "back",
    pieceName: "Traseira da Gaveta",
    width: drawer.pieces.back.width,
    height: drawer.pieces.back.height,
    depth: drawer.pieces.back.depth,
    materialId: drawer.materialId,
    materialType: "wood",
    quantity: 1,
    areaM2: calcArea(drawer.pieces.back.width, drawer.pieces.back.height),
    volumeM3: calcVolume(
      drawer.pieces.back.width,
      drawer.pieces.back.height,
      drawer.pieces.back.depth
    ),
  });
  
  return pieces;
}

/**
 * Extrai ferragens (corrediças, parafusos, puxadores) de uma gaveta
 */
export function extractDrawerHardwareForBom(drawer: Drawer): DrawerHardwareForBom[] {
  const hardware: DrawerHardwareForBom[] = [];
  
  // CORREDIÇAS (2 por gaveta: uma de cada lado)
  hardware.push({
    drawerId: drawer.id,
    drawerIndex: 0,
    boxId: drawer.parentBoxId,
    hardwareType: "slide",
    hardwareName: drawer.type === "pro" 
      ? "Corrediça Telescópica PRO" 
      : "Corrediça Telescópica Normal",
    slideLength: drawer.specs.body.depth,
    slideType: drawer.type,
    quantity: 2, // Uma de cada lado
  });
  
  // PARAFUSOS (estimativa: 8 por gaveta)
  hardware.push({
    drawerId: drawer.id,
    drawerIndex: 0,
    boxId: drawer.parentBoxId,
    hardwareType: "screw",
    hardwareName: "Parafuso 4x30mm",
    quantity: 8,
  });
  
  // PUXADOR (1 por gaveta)
  hardware.push({
    drawerId: drawer.id,
    drawerIndex: 0,
    boxId: drawer.parentBoxId,
    hardwareType: "handle",
    hardwareName: "Puxador",
    quantity: 1,
  });
  
  return hardware;
}

/**
 * Extrai todas as peças de todas as gavetas de um grupo
 */
export function extractDrawerGroupPiecesForBom(
  group: DrawerGroup
): DrawerPieceForBom[] {
  const allPieces: DrawerPieceForBom[] = [];
  
  group.drawers.forEach((drawer, index) => {
    const pieces = extractDrawerPiecesForBom(drawer);
    
    // Preenche o índice real da gaveta no grupo
    pieces.forEach((piece) => {
      piece.drawerIndex = index + 1; // 1-based
      allPieces.push(piece);
    });
  });
  
  return allPieces;
}

/**
 * Extrai todas as ferragens de todas as gavetas de um grupo
 */
export function extractDrawerGroupHardwareForBom(
  group: DrawerGroup
): DrawerHardwareForBom[] {
  const allHardware: DrawerHardwareForBom[] = [];
  
  group.drawers.forEach((drawer, index) => {
    const hardware = extractDrawerHardwareForBom(drawer);
    
    // Preenche o índice real da gaveta no grupo
    hardware.forEach((hw) => {
      hw.drawerIndex = index + 1; // 1-based
      allHardware.push(hw);
    });
  });
  
  return allHardware;
}

/**
 * Resume as peças por tipo (para agrupamento na BOM)
 */
export function summarizeDrawerPieces(pieces: DrawerPieceForBom[]): {
  pieceType: string;
  totalQuantity: number;
  totalAreaM2: number;
  totalVolumeM3: number;
  averageWidth: number;
  averageHeight: number;
  averageDepth: number;
}[] {
  const grouped = new Map<string, DrawerPieceForBom[]>();
  
  pieces.forEach((piece) => {
    const key = `${piece.pieceType}-${piece.materialId ?? "default"}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(piece);
  });
  
  const summary: {
    pieceType: string;
    totalQuantity: number;
    totalAreaM2: number;
    totalVolumeM3: number;
    averageWidth: number;
    averageHeight: number;
    averageDepth: number;
  }[] = [];
  
  grouped.forEach((items, key) => {
    const totalQuantity = items.reduce((sum, p) => sum + p.quantity, 0);
    const totalAreaM2 = items.reduce((sum, p) => sum + p.areaM2, 0);
    const totalVolumeM3 = items.reduce((sum, p) => sum + p.volumeM3, 0);
    const avgWidth = items.reduce((sum, p) => sum + p.width, 0) / items.length;
    const avgHeight = items.reduce((sum, p) => sum + p.height, 0) / items.length;
    const avgDepth = items.reduce((sum, p) => sum + p.depth, 0) / items.length;
    
    summary.push({
      pieceType: key,
      totalQuantity,
      totalAreaM2,
      totalVolumeM3,
      averageWidth: avgWidth,
      averageHeight: avgHeight,
      averageDepth: avgDepth,
    });
  });
  
  return summary;
}

/**
 * Resume as ferragens por tipo (para agrupamento na BOM)
 */
export function summarizeDrawerHardware(hardware: DrawerHardwareForBom[]): {
  hardwareType: string;
  hardwareName: string;
  totalQuantity: number;
}[] {
  const grouped = new Map<string, DrawerHardwareForBom[]>();
  
  hardware.forEach((hw) => {
    const key = `${hw.hardwareType}-${hw.hardwareName}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(hw);
  });
  
  const summary: {
    hardwareType: string;
    hardwareName: string;
    totalQuantity: number;
  }[] = [];
  
    grouped.forEach((items) => {
    const totalQuantity = items.reduce((sum, hw) => sum + hw.quantity, 0);
    const firstItem = items[0];
    
    summary.push({
      hardwareType: firstItem.hardwareType,
      hardwareName: firstItem.hardwareName,
      totalQuantity,
    });
  });
  
  return summary;
}
