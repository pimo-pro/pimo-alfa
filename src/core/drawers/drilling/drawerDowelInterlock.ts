/**
 * SSOT — cavilhas de gaveta com interlock face ? espessura.
 *
 * Face (frente / costa): Ø10 × 13 mm (nunca atravessa).
 * Espessura (laterais): Ø10 × 30 mm com clamp (espessura ? 2 mm).
 * Centro na espessura: X/Z = espessura / 2.
 * Traseira: Y = 39 mm e Y = altura ? 39 mm (par simétrico).
 * Frente: Y da tabela industrial (30 / altura?30, ou altura?41 se lowest).
 */

/** Distância industrial da base ao eixo da corrediça / pino inferior (mm). */
export const DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM = 41;

export const DRAWER_DOWEL_DIAMETER_MM = 10;
export const DRAWER_DOWEL_FACE_DEPTH_MM = 13;
export const DRAWER_DOWEL_EDGE_DEPTH_MM = 30;
/** Folga minima para nao atravessar a espessura no furo de aresta. */
export const DRAWER_DOWEL_EDGE_CLEARANCE_MM = 2;
/** Y do par traseiro medido a partir do bordo inferior. */
export const DRAWER_REAR_DOWEL_Y_FROM_BOTTOM_MM = 39;
/** Y superior da tabela frontal industrial (desde o bordo inferior). */
export const DRAWER_FRONT_DOWEL_Y_FROM_BOTTOM_MM = 30;

/** Centro do furo na espessura (X ou Z KDT). */
export function drawerThicknessCenterMm(espessuraMm: number): number {
  const t = Math.max(0, Number(espessuraMm) || 0);
  return t / 2;
}

/**
 * Profundidade do furo na espessura: min(30, espessura ? 2).
 * Ex.: 16 ? 14; 19 ? 17; ?32 ? 30.
 */
export function clampDrawerEdgeDowelDepthMm(espessuraMm: number): number {
  const t = Math.max(0, Number(espessuraMm) || 0);
  const maxSafe = Math.max(0, t - DRAWER_DOWEL_EDGE_CLEARANCE_MM);
  return Math.min(DRAWER_DOWEL_EDGE_DEPTH_MM, maxSafe);
}

/** Profundidade em face: 13 mm, nunca > espessura ? 1 (defesa). */
export function clampDrawerFaceDowelDepthMm(espessuraMm: number): number {
  const t = Math.max(0, Number(espessuraMm) || 0);
  if (t <= 0) return DRAWER_DOWEL_FACE_DEPTH_MM;
  return Math.min(DRAWER_DOWEL_FACE_DEPTH_MM, Math.max(1, t - 1));
}

/** Y traseiros sincronizados (lateral ? costa). */
export function getDrawerRearDowelYPositionsMm(alturaMm: number): number[] {
  const h = Math.max(0, Number(alturaMm) || 0);
  const y = DRAWER_REAR_DOWEL_Y_FROM_BOTTOM_MM;
  if (h <= 0) return [];
  if (h < y * 2 + 1) return [Math.min(y, h / 2)];
  return [y, h - y];
}

/**
 * Y frontais sincronizados (lateral ? frente) — tabela industrial SSOT.
 * Superior: 30 mm; inferior: altura?30 (ou altura?41 se gaveta mais baixa).
 */
export function getDrawerFrontDowelYPositionsMm(
  alturaMm: number,
  isLowestDrawer?: boolean
): number[] {
  const h = Math.max(0, Number(alturaMm) || 0);
  if (h <= 0) return [];
  const upper = DRAWER_FRONT_DOWEL_Y_FROM_BOTTOM_MM;
  const lower = isLowestDrawer
    ? h - DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM
    : h - DRAWER_FRONT_DOWEL_Y_FROM_BOTTOM_MM;
  if (lower <= upper + 1) return [Math.min(upper, h / 2)];
  return [upper, lower];
}

/** Garante que profundidade nunca atravessa a peca. */
export function assertDowelDoesNotThrough(
  profundidadeMm: number,
  espessuraMm: number
): boolean {
  return profundidadeMm > 0 && profundidadeMm < espessuraMm;
}
