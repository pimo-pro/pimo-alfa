import type { ProjectRoomConfig, ProjectRoomOpening, RoomWallLabel } from "../../3d/viewer-engine/room/roomEngineTypes";
import { getBaseCabinetById } from "../baseCabinets";
import { MIN_GAP_SINK_COOKTOP_MM } from "./autoFillSettings";
import type { AnalyzedWallRun, AutoFillSpecialKind } from "./autoRoomFillTypes";
import { SPECIAL_CATALOG } from "./moduleCatalog";

export type SpecialPlacement = {
  kind: AutoFillSpecialKind;
  alongMm: number;
  widthMm: number;
};

function specWidth(kind: AutoFillSpecialKind): number {
  const spec = SPECIAL_CATALOG[kind];
  const model = getBaseCabinetById(spec.lowerId);
  return model?.widthMm ?? spec.widthMm;
}

function segmentUsable(run: AnalyzedWallRun): { start: number; end: number; length: number } {
  const start = run.segments.reduce((m, s) => Math.min(m, s.startMm), run.runStartMm);
  const end = run.segments.reduce((m, s) => Math.max(m, s.endMm), run.runEndMm);
  return { start, end, length: end - start };
}

function sinkAlongMm(
  run: AnalyzedWallRun,
  room: ProjectRoomConfig,
  span: { start: number; end: number; length: number }
): number {
  const windows = (room.openings ?? []).filter(
    (o) => o.type === "window" && o.wallId === run.wallId
  );
  if (windows.length > 0) {
    const win = windows[0];
    const center = win.xPosMm + win.widthMm / 2;
    const w = specWidth("sink");
    return Math.max(span.start + 40, Math.min(center - w / 2, span.end - w - 40));
  }
  const center = span.start + span.length / 2;
  const fallback = span.start + span.length * 0.28;
  const w = specWidth("sink");
  const atCenter = center - w / 2;
  if (Math.abs(atCenter - fallback) < span.length * 0.15) return atCenter;
  return fallback;
}

function clampAlong(
  along: number,
  width: number,
  span: { start: number; end: number }
): number {
  return Math.max(span.start + 30, Math.min(along, span.end - width - 30));
}

export function buildSpecialsForWall(
  run: AnalyzedWallRun,
  room: ProjectRoomConfig,
  isPrimary: boolean
): SpecialPlacement[] {
  if (!isPrimary) return [];

  const span = segmentUsable(run);
  if (span.length < 2400) return [];

  const sinkW = specWidth("sink");
  const cookW = specWidth("cooktop");
  const ovenW = specWidth("oven");
  const fridgeW = specWidth("fridge");

  const sinkAlong = sinkAlongMm(run, room, span);
  const center = span.start + span.length / 2;

  let cookAlong = center - cookW / 2;
  if (Math.abs(cookAlong + cookW / 2 - (sinkAlong + sinkW / 2)) < MIN_GAP_SINK_COOKTOP_MM) {
    cookAlong = sinkAlong + sinkW + MIN_GAP_SINK_COOKTOP_MM;
  }
  cookAlong = clampAlong(cookAlong, cookW, span);

  let ovenAlong = cookAlong + cookW + 80;
  if (ovenAlong + ovenW > span.end - 100) {
    ovenAlong = cookAlong - ovenW - 80;
  }
  ovenAlong = clampAlong(ovenAlong, ovenW, span);

  const fridgeAlong = clampAlong(span.start + 50, fridgeW, span);

  return [
    { kind: "fridge", alongMm: fridgeAlong, widthMm: fridgeW },
    { kind: "sink", alongMm: sinkAlong, widthMm: sinkW },
    { kind: "cooktop", alongMm: cookAlong, widthMm: cookW },
    { kind: "oven", alongMm: ovenAlong, widthMm: ovenW },
  ];
}

export function hoodPlacementForCooktop(
  _run: AnalyzedWallRun,
  cooktop: SpecialPlacement
): { alongMm: number; widthMm: number } {
  const hoodW = specWidth("hood");
  return {
    alongMm: cooktop.alongMm + cooktop.widthMm / 2 - hoodW / 2,
    widthMm: hoodW,
  };
}

export function segmentHasWindow(
  wallId: string,
  segment: { startMm: number; endMm: number },
  openings: ProjectRoomOpening[]
): boolean {
  return openings.some((o) => {
    if (o.type !== "window" || o.wallId !== wallId) return false;
    const oStart = o.xPosMm;
    const oEnd = o.xPosMm + o.widthMm;
    return oEnd > segment.startMm && oStart < segment.endMm;
  });
}

export function labelFromWallId(
  room: ProjectRoomConfig,
  wallId: string
): RoomWallLabel | null {
  return room.walls.find((w) => w.id === wallId)?.label ?? null;
}
