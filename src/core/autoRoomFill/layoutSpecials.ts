import type { ProjectRoomConfig, RoomWallLabel } from "../../3d/viewer-engine/room/roomEngineTypes";
import { getBaseCabinetById } from "../baseCabinets";
import { MIN_GAP_SINK_COOKTOP_MM } from "./autoFillSettings";
import type { AnalyzedWallRun, KitchenLayoutType } from "./autoRoomFillTypes";
import { SPECIAL_CATALOG } from "./moduleCatalog";
import type { SpecialPlacement } from "./specialPlacement";

function specWidth(kind: keyof typeof SPECIAL_CATALOG): number {
  const spec = SPECIAL_CATALOG[kind];
  return getBaseCabinetById(spec.lowerId)?.widthMm ?? spec.widthMm;
}

function spanOf(run: AnalyzedWallRun) {
  const start = run.segments.reduce((m, s) => Math.min(m, s.startMm), run.runStartMm);
  const end = run.segments.reduce((m, s) => Math.max(m, s.endMm), run.runEndMm);
  return { start, end, length: end - start };
}

function clampAlong(along: number, width: number, span: { start: number; end: number }) {
  return Math.max(span.start + 40, Math.min(along, span.end - width - 40));
}

function wallHasWindow(room: ProjectRoomConfig, wallId: string): boolean {
  return (room.openings ?? []).some((o) => o.type === "window" && o.wallId === wallId);
}

function sinkOnWall(run: AnalyzedWallRun, room: ProjectRoomConfig): SpecialPlacement {
  const span = spanOf(run);
  const w = specWidth("sink");
  const windows = (room.openings ?? []).filter(
    (o) => o.type === "window" && o.wallId === run.wallId
  );
  let along = span.start + span.length * 0.28;
  if (windows.length > 0) {
    const win = windows[0];
    along = win.xPosMm + win.widthMm / 2 - w / 2;
  } else {
    along = span.start + span.length / 2 - w / 2;
  }
  return { kind: "sink", alongMm: clampAlong(along, w, span), widthMm: w };
}

/** Especialidades para layout I (parede única) — mesma lógica 1.2. */
export function buildSpecialsLayoutI(
  run: AnalyzedWallRun,
  room: ProjectRoomConfig
): SpecialPlacement[] {
  const span = spanOf(run);
  if (span.length < 2000) return [];

  const sink = sinkOnWall(run, room);
  const cookW = specWidth("cooktop");
  const ovenW = specWidth("oven");
  const fridgeW = specWidth("fridge");

  let cookAlong = span.start + span.length / 2 - cookW / 2;
  if (cookAlong + cookW / 2 < sink.alongMm + sink.widthMm + MIN_GAP_SINK_COOKTOP_MM) {
    cookAlong = sink.alongMm + sink.widthMm + MIN_GAP_SINK_COOKTOP_MM;
  }
  const cook = {
    kind: "cooktop" as const,
    alongMm: clampAlong(cookAlong, cookW, span),
    widthMm: cookW,
  };

  let ovenAlong = cook.alongMm + cookW + 80;
  if (ovenAlong + ovenW > span.end - 80) ovenAlong = cook.alongMm - ovenW - 80;

  return [
    { kind: "fridge", alongMm: clampAlong(span.start + 50, fridgeW, span), widthMm: fridgeW },
    sink,
    cook,
    { kind: "oven", alongMm: clampAlong(ovenAlong, ovenW, span), widthMm: ovenW },
  ];
}

/** Layout L — pia na parede com janela; fogão na outra; frigo na parede mais longa. */
export function buildSpecialsLayoutL(
  room: ProjectRoomConfig,
  runs: AnalyzedWallRun[],
  labels: [RoomWallLabel, RoomWallLabel]
): Partial<Record<RoomWallLabel, SpecialPlacement[]>> {
  const byLabel = new Map(runs.map((r) => [r.label, r]));
  const runA = byLabel.get(labels[0]);
  const runB = byLabel.get(labels[1]);
  if (!runA || !runB) return {};

  const lenA = spanOf(runA).length;
  const lenB = spanOf(runB).length;
  const longRun = lenA >= lenB ? runA : runB;
  const shortRun = longRun === runA ? runB : runA;
  const windowRun = wallHasWindow(room, runA.wallId)
    ? runA
    : wallHasWindow(room, runB.wallId)
      ? runB
      : shortRun;
  const otherRun = windowRun === runA ? runB : runA;

  const sink = sinkOnWall(windowRun, room);
  const cookW = specWidth("cooktop");
  const spanOther = spanOf(otherRun);
  let cookAlong = spanOther.start + spanOther.length / 2 - cookW / 2;
  if (otherRun.label === windowRun.label) {
    cookAlong = sink.alongMm + sink.widthMm + MIN_GAP_SINK_COOKTOP_MM;
  }
  const cook: SpecialPlacement = {
    kind: "cooktop",
    alongMm: clampAlong(cookAlong, cookW, spanOther),
    widthMm: cookW,
  };

  const fridgeW = specWidth("fridge");
  const spanLong = spanOf(longRun);
  const fridge: SpecialPlacement = {
    kind: "fridge",
    alongMm: clampAlong(spanLong.start + 50, fridgeW, spanLong),
    widthMm: fridgeW,
  };

  const result: Partial<Record<RoomWallLabel, SpecialPlacement[]>> = {};
  if (longRun.label === windowRun.label) {
    result[windowRun.label] = [fridge, sink];
    result[otherRun.label] = [cook];
  } else if (longRun.label === otherRun.label) {
    result[windowRun.label] = [sink];
    result[otherRun.label] = [fridge, cook];
  } else {
    result[windowRun.label] = [sink];
    result[otherRun.label] = [cook];
    result[longRun.label] = [fridge];
  }
  return result;
}

/** Layout U — pia na parede central; fogão numa lateral; frigo na extremidade oposta. */
export function buildSpecialsLayoutU(
  room: ProjectRoomConfig,
  runs: AnalyzedWallRun[],
  chain: RoomWallLabel[]
): Partial<Record<RoomWallLabel, SpecialPlacement[]>> {
  if (chain.length < 3) return {};
  const byLabel = new Map(runs.map((r) => [r.label, r]));
  const left = byLabel.get(chain[0]);
  const center = byLabel.get(chain[1]);
  const right = byLabel.get(chain[2]);
  if (!left || !center || !right) return {};

  const sink = sinkOnWall(center, room);
  const cookW = specWidth("cooktop");
  const spanRight = spanOf(right);
  const cook: SpecialPlacement = {
    kind: "cooktop",
    alongMm: clampAlong(spanRight.start + spanRight.length * 0.35, cookW, spanRight),
    widthMm: cookW,
  };

  const ovenW = specWidth("oven");
  const oven: SpecialPlacement = {
    kind: "oven",
    alongMm: clampAlong(cook.alongMm + cookW + 60, ovenW, spanRight),
    widthMm: ovenW,
  };

  const fridgeW = specWidth("fridge");
  const spanLeft = spanOf(left);
  const fridge: SpecialPlacement = {
    kind: "fridge",
    alongMm: clampAlong(spanLeft.start + 50, fridgeW, spanLeft),
    widthMm: fridgeW,
  };

  return {
    [center.label]: [sink],
    [right.label]: [cook, oven],
    [left.label]: [fridge],
  };
}

export function buildSpecialsForLayout(
  layoutType: KitchenLayoutType,
  room: ProjectRoomConfig,
  runs: AnalyzedWallRun[],
  wallLabels: RoomWallLabel[],
  detection: import("./autoRoomFillTypes").LayoutDetectionResult
): Partial<Record<RoomWallLabel, SpecialPlacement[]>> {
  const byLabel = new Map(runs.map((r) => [r.label, r]));
  switch (layoutType) {
    case "I": {
      const run = byLabel.get(detection.primaryLabel);
      return run ? { [run.label]: buildSpecialsLayoutI(run, room) } : {};
    }
    case "L": {
      const pair = detection.lPair ?? (wallLabels.length >= 2 ? [wallLabels[0], wallLabels[1]] : null);
      if (!pair) return {};
      return buildSpecialsLayoutL(room, runs, pair);
    }
    case "U": {
      const chain = detection.uChain ?? wallLabels;
      if (chain.length < 3) return {};
      return buildSpecialsLayoutU(room, runs, chain);
    }
    case "island": {
      const run = byLabel.get(detection.primaryLabel);
      if (!run) return {};
      return { [run.label]: buildSpecialsLayoutI(run, room).filter((s) => s.kind === "fridge") };
    }
    default:
      return {};
  }
}
