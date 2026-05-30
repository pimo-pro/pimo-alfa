/** Tipos do overlay de régua interna (dimensões da cavidade). */

export type InternalCavityMeasurements = {
  boxId: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
};

export type BoxCavityBoundsLocal = {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  centerX: number;
  centerY: number;
  centerZ: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
};
