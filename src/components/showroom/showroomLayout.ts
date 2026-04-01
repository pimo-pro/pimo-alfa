/** Espaçamento fixo entre centros dos projetos na grelha XZ (showroom). */
export const SHOWROOM_SPACING_MM = 3000;

export type ShowroomOffsetMm = {
  xMm: number;
  zMm: number;
};

/**
 * Grelha XZ centrada na origem: distribui `count` posições em ~sqrt(count) colunas.
 */
export function computeShowroomGridOffsets(count: number, spacingMm: number): ShowroomOffsetMm[] {
  if (count <= 0 || spacingMm <= 0) return [];
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  const widthMm = (cols - 1) * spacingMm;
  const depthMm = (rows - 1) * spacingMm;
  const x0 = -widthMm / 2;
  const z0 = -depthMm / 2;
  const out: ShowroomOffsetMm[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    out.push({ xMm: x0 + col * spacingMm, zMm: z0 + row * spacingMm });
  }
  return out;
}
