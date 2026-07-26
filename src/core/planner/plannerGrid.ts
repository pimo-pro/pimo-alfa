/**
 * plannerGrid.ts — Grelha de cozinha (snap industrial 50 mm).
 * Não altera medidas dos módulos da Kitchen Library.
 */

export const PLANNER_SNAP_MM = 50;

export type PlannerWallZone = "north" | "south" | "east" | "west";

export type PlannerGridConfig = {
  widthMm: number;
  heightMm: number;
  /** Profundidade lógica da planta (mm). */
  depthMm: number;
  snapMm: number;
};

export type PlannerGridCell = {
  xMm: number;
  yMm: number;
  wallZone: PlannerWallZone | null;
  isCorner: boolean;
  isRodape: boolean;
};

export type PlannerGrid = {
  config: PlannerGridConfig;
  cols: number;
  rows: number;
  wallZones: PlannerWallZone[];
  cornerZones: Array<{ xMm: number; yMm: number; corner: "NW" | "NE" | "SW" | "SE" }>;
  rodapeBandMm: number;
};

export const DEFAULT_PLANNER_GRID: PlannerGridConfig = {
  widthMm: 3600,
  heightMm: 2400,
  depthMm: 600,
  snapMm: PLANNER_SNAP_MM,
};

export function snapToGrid(valueMm: number, snapMm: number = PLANNER_SNAP_MM): number {
  const s = Math.max(1, snapMm);
  return Math.round(valueMm / s) * s;
}

export function clampToGrid(
  xMm: number,
  yMm: number,
  pieceW: number,
  pieceH: number,
  grid: PlannerGridConfig
): { xMm: number; yMm: number } {
  const maxX = Math.max(0, grid.widthMm - pieceW);
  const maxY = Math.max(0, grid.heightMm - pieceH);
  return {
    xMm: Math.min(maxX, Math.max(0, snapToGrid(xMm, grid.snapMm))),
    yMm: Math.min(maxY, Math.max(0, snapToGrid(yMm, grid.snapMm))),
  };
}

/**
 * Constrói grelha com zonas de parede, canto e rodapé (documental).
 */
export function buildPlannerGrid(
  config: Partial<PlannerGridConfig> = {},
  options?: { rodapeHeightMm?: number }
): PlannerGrid {
  const cfg: PlannerGridConfig = {
    ...DEFAULT_PLANNER_GRID,
    ...config,
    snapMm: config.snapMm ?? PLANNER_SNAP_MM,
  };
  const rodapeBandMm = options?.rodapeHeightMm ?? 100;
  const cols = Math.max(1, Math.floor(cfg.widthMm / cfg.snapMm));
  const rows = Math.max(1, Math.floor(cfg.heightMm / cfg.snapMm));

  return {
    config: cfg,
    cols,
    rows,
    wallZones: ["north", "south", "east", "west"],
    cornerZones: [
      { xMm: 0, yMm: 0, corner: "SW" },
      { xMm: cfg.widthMm, yMm: 0, corner: "SE" },
      { xMm: 0, yMm: cfg.heightMm, corner: "NW" },
      { xMm: cfg.widthMm, yMm: cfg.heightMm, corner: "NE" },
    ],
    rodapeBandMm,
  };
}

export function resolveWallZone(
  xMm: number,
  yMm: number,
  grid: PlannerGridConfig,
  bandMm = 600
): PlannerWallZone | null {
  if (yMm <= bandMm) return "south";
  if (yMm >= grid.heightMm - bandMm) return "north";
  if (xMm <= bandMm) return "west";
  if (xMm >= grid.widthMm - bandMm) return "east";
  return null;
}
