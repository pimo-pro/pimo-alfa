/**
 * Representa uma sala com dimensões em metros.
 * Usado pelo RoomManager para criar e posicionar paredes e piso.
 */
export class Room {
  /** Largura (eixo X) em metros. */
  width: number;
  /** Profundidade (eixo Z) em metros. */
  depth: number;
  /** Altura (eixo Y) em metros. */
  height: number;
  /** Origem X da sala no mundo (metros). Centro da sala em X = originX + width/2. */
  originX: number;
  /** Origem Z da sala no mundo (metros). Centro da sala em Z = originZ + depth/2. */
  originZ: number;

  constructor(
    width: number,
    depth: number,
    height: number,
    originX = 0,
    originZ = 0
  ) {
    this.width = Math.max(0.1, width);
    this.depth = Math.max(0.1, depth);
    this.height = Math.max(0.1, height);
    this.originX = originX;
    this.originZ = originZ;
  }

  get minX(): number {
    return this.originX;
  }
  get maxX(): number {
    return this.originX + this.width;
  }
  get minZ(): number {
    return this.originZ;
  }
  get maxZ(): number {
    return this.originZ + this.depth;
  }
  get minY(): number {
    return 0;
  }
  get maxY(): number {
    return this.height;
  }
  get centerX(): number {
    return this.originX + this.width / 2;
  }
  get centerZ(): number {
    return this.originZ + this.depth / 2;
  }
}

/** Dimensões padrão da sala: 4m × 5m × 2.7m */
export const DEFAULT_ROOM_WIDTH = 4;
export const DEFAULT_ROOM_DEPTH = 5;
export const DEFAULT_ROOM_HEIGHT = 2.7;
