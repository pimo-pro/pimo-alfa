/**
 * Modelo de feature de cavilha (dowel) para o sistema industrial.
 * Usado em Nesting (face), 3D e DRILL (lateral).
 */

export type DowelFace = "cima" | "fundo" | "lat_dir" | "lat_esq";

export type DowelRole = "host" | "mate";

/** Registro interno de um furo de cavilha. */
export interface DowelFeature {
  /** ID da peça ou shortCode/QR. */
  pieceId: string;
  /** Posição (x, y, z) no sistema local da peça (mm). */
  x: number;
  y: number;
  z: number;
  face: DowelFace;
  diameter: number;
  depth: number;
  role: DowelRole;
}

export const DOWEL_DIAMETER_MM = 10;
export const DRILL_LATERAL_DEPTH_MM = 30;
