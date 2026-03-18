import type { BaseCabinetModel } from "../../../core/baseCabinets/types";

export const PI_BASE_WIDTHS_MM = [
  300, 350, 400, 450, 500, 550, 600, 650, 700, 750,
  800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200,
] as const;

export const PI_BASE_BOX_HEIGHT_MM = 760;
export const PI_BASE_DEPTH_MM = 560;
export const PI_BASE_FEET_HEIGHT_MM = 100;
export const PI_BASE_TOTAL_HEIGHT_MM = PI_BASE_BOX_HEIGHT_MM + PI_BASE_FEET_HEIGHT_MM;

export const PI_BASE_MODELS: BaseCabinetModel[] = PI_BASE_WIDTHS_MM.map((widthMm) => ({
  id: `pi-base-${widthMm}-3gavetas`,
  nome: `Base PI ${widthMm}mm`,
  widthMm,
  heightMm: PI_BASE_BOX_HEIGHT_MM,
  depthMm: PI_BASE_DEPTH_MM,
  doors: 0,
  shelves: 0,
  drawers: 3,
  grupoCatalogo: "pi",
  categoria: "base",
}));

export function isPiBaseCabinetId(baseCabinetId: string | undefined | null): boolean {
  return typeof baseCabinetId === "string" && baseCabinetId.startsWith("pi-base-");
}

