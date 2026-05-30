import type { RoomWallLabel } from "../../3d/viewer-engine/room/roomEngineTypes";
import type {
  AnalyzedWallRun,
  AutoFillAllowUpperByWall,
  AutoFillGenerateOptions,
  AutoFillWallSelection,
} from "./autoRoomFillTypes";
import { AUTO_FILL_WALL_LABELS, EMPTY_WALL_SELECTION } from "./autoRoomFillTypes";

export { EMPTY_WALL_SELECTION, EMPTY_ALLOW_UPPER } from "./autoRoomFillTypes";

export const MIN_ROOM_DEPTH_FOR_UPPER_MM = 450;
export const MIN_GAP_SINK_COOKTOP_MM = 600;
export const FILLER_PANEL_WIDTH_MM = 20;
export const FILLER_CATALOG_ID = "base-200-garravera";

export function normalizeWallSelection(
  raw: Partial<AutoFillWallSelection> | undefined
): AutoFillWallSelection {
  return {
    sul: raw?.sul === true,
    este: raw?.este === true,
    norte: raw?.norte === true,
    oeste: raw?.oeste === true,
  };
}

export function normalizeAllowUpper(
  raw: Partial<AutoFillAllowUpperByWall> | undefined,
  primaryLabel: RoomWallLabel | null
): AutoFillAllowUpperByWall {
  const base = {
    sul: false,
    este: false,
    norte: false,
    oeste: false,
  };
  if (!raw) {
    if (primaryLabel) base[primaryLabel] = true;
    return base;
  }
  for (const label of AUTO_FILL_WALL_LABELS) {
    base[label] = raw[label] === true;
  }
  if (!AUTO_FILL_WALL_LABELS.some((l) => base[l]) && primaryLabel) {
    base[primaryLabel] = true;
  }
  return base;
}

export function pickPrimaryWallRun(runs: AnalyzedWallRun[]): AnalyzedWallRun {
  return runs.reduce((best, run) => {
    const bestLen = best.segments.reduce((m, s) => m + s.lengthMm, 0);
    const len = run.segments.reduce((m, s) => m + s.lengthMm, 0);
    return len > bestLen ? run : best;
  }, runs[0]);
}

/** Paredes a preencher: seleção do utilizador ou só a mais longa se nenhuma marcada. */
export function resolveWallsToFill(
  runs: AnalyzedWallRun[],
  selection: AutoFillWallSelection
): { runs: AnalyzedWallRun[]; primary: AnalyzedWallRun } {
  const primary = pickPrimaryWallRun(runs);
  const anySelected = AUTO_FILL_WALL_LABELS.some((label) => selection[label]);
  if (!anySelected) {
    return { runs: runs.filter((r) => r.label === primary.label), primary };
  }
  return {
    runs: runs.filter((r) => selection[r.label]),
    primary,
  };
}

export function buildGenerateOptions(
  wallSelection: Partial<AutoFillWallSelection> | undefined,
  allowUpperModules: Partial<AutoFillAllowUpperByWall> | undefined,
  runs: AnalyzedWallRun[]
): AutoFillGenerateOptions {
  const primary = pickPrimaryWallRun(runs);
  return {
    wallSelection: normalizeWallSelection(wallSelection),
    allowUpperModules: normalizeAllowUpper(allowUpperModules, primary.label),
  };
}

export function wallSelectionFromLabels(labels: RoomWallLabel[]): AutoFillWallSelection {
  const sel = { ...EMPTY_WALL_SELECTION };
  for (const label of labels) sel[label] = true;
  return sel;
}

export function roomDepthAlongWall(
  label: RoomWallLabel,
  roomWidthMm: number,
  roomDepthMm: number
): number {
  return label === "sul" || label === "norte" ? roomDepthMm : roomWidthMm;
}
