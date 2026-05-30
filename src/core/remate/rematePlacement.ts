import type { ProjectRemate, RematePosition, RemateType } from "./remateTypes";

const AVISTA_DEPTH_MM = 100;

export type StructuralBoundsM = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerY: number;
  centerZ: number;
};

export function getStructuralBoundsM(widthM: number, heightM: number, depthM: number): StructuralBoundsM {
  const halfW = widthM / 2;
  const halfH = heightM / 2;
  const halfD = depthM / 2;
  return {
    minX: -halfW,
    maxX: halfW,
    minY: -halfH,
    maxY: halfH,
    minZ: -halfD,
    maxZ: halfD,
    centerX: 0,
    centerY: 0,
    centerZ: 0,
  };
}

export type RematePlacementLocal = {
  position: [number, number, number];
  rotation: [number, number, number];
};

/**
 * Posição inicial no espaço local do box (centro na origem, Y para cima).
 * Não inclui portas no bounds — usa dimensões estruturais do caixote.
 */
export function computeRematePlacementLocal(
  remate: ProjectRemate,
  bounds: StructuralBoundsM
): RematePlacementLocal {
  const w = remate.dimensions.widthMm / 1000;
  const h = remate.dimensions.heightMm / 1000;
  const d = remate.dimensions.depthMm / 1000;
  const cx = bounds.centerX;
  const cy = bounds.centerY;
  const cz = bounds.centerZ;

  if (remate.position === "rodape" || remate.faceKind === "RODAPE") {
    return {
      position: [cx, bounds.minY - h / 2 - 0.002, bounds.maxZ + d / 2],
      rotation: [0, 0, 0],
    };
  }

  if (remate.type === "L" && remate.partIndex === 1) {
    return {
      position: [bounds.maxX + w / 2, cy, bounds.maxZ - d / 2],
      rotation: [0, 0, 0],
    };
  }

  if (remate.type === "L" && remate.partIndex === 2) {
    return {
      position: [bounds.maxX - w / 2, bounds.minY + h / 2, bounds.maxZ + d / 2],
      rotation: [0, 0, 0],
    };
  }

  if (remate.position === "dir") {
    return { position: [bounds.maxX + w / 2, cy, cz], rotation: [0, 0, 0] };
  }
  if (remate.position === "esq") {
    return { position: [bounds.minX - w / 2, cy, cz], rotation: [0, 0, 0] };
  }
  if (remate.position === "cima") {
    return { position: [cx, bounds.maxY + h / 2, cz], rotation: [0, 0, 0] };
  }
  if (remate.position === "baixo") {
    return { position: [cx, bounds.minY - h / 2, cz], rotation: [0, 0, 0] };
  }

  return { position: [cx, cy, bounds.maxZ + d / 2], rotation: [0, 0, 0] };
}

export function getDefaultDepthMmForRemate(type: RemateType, position: RematePosition): number {
  if (position === "rodape" || type === "rodape") return 18;
  return type === "completo" ? 600 : AVISTA_DEPTH_MM;
}
