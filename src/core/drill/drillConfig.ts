import { getDrillingConfig } from "../settings/settingsService";

export const DRILL_DOWEL_DIAMETER_MM = 10;
export const DRILL_DOWEL_DEPTH_MM = 30;
export const DRILL_DOWEL_DEFAULT_FRONT_MM = 60;
export const DRILL_DOWEL_DEFAULT_BACK_MM = 60;

export function getDrillFrontDistance(): number {
  // lê de getDrillingConfig().cavilha.frontDistance com fallback
  try {
    const cfg = getDrillingConfig();
    return Number(cfg?.cavilha?.frontDistance) || DRILL_DOWEL_DEFAULT_FRONT_MM;
  } catch {
    return DRILL_DOWEL_DEFAULT_FRONT_MM;
  }
}

export function getDrillBackDistance(): number {
  try {
    const cfg = getDrillingConfig();
    return Number(cfg?.cavilha?.backDistance) || DRILL_DOWEL_DEFAULT_BACK_MM;
  } catch {
    return DRILL_DOWEL_DEFAULT_BACK_MM;
  }
}
