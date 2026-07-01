import type { PanelDrillHole } from "../types";

const DOOR_HINGE_HOLE_TYPES = new Set([
  "dobradica",
  "dobradica_fixacao",
  "dobradica_parafuso_uniao",
]);

/** Espelha furos de dobradiça da porta: xNovo = largura − xAntigo (mesma altura Y). */
export function mirrorDoorHingeHolesX(
  holes: PanelDrillHole[],
  panelWidthMm: number
): PanelDrillHole[] {
  const w = Math.max(1, panelWidthMm);
  return holes.map((hole) => {
    if (!DOOR_HINGE_HOLE_TYPES.has(hole.holeType ?? "")) return hole;
    return { ...hole, x: w - hole.x };
  });
}

export function isDoorHingeHole(holeType: string | undefined): boolean {
  return DOOR_HINGE_HOLE_TYPES.has(holeType ?? "");
}
