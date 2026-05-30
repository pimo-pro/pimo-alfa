import type { ProjectRoomConfig, ProjectRoomOpening } from "../../3d/viewer-engine/room/roomEngineTypes";
import type { RoomWallLabel } from "../../3d/viewer-engine/room/roomEngineTypes";
import { wallLengthMm } from "../kitchenFinish/roomContext";
import type { AnalyzedWallRun, WallRunAxis } from "./autoRoomFillTypes";

const END_RECESS_MM = 80;
const OPENING_CLEARANCE_MM = 40;

type WallGeom = {
  label: RoomWallLabel;
  axis: WallRunAxis;
  fixedCoordMm: number;
  runStartMm: number;
  runEndMm: number;
  rotacaoY_rad: number;
  inwardNormal: { x: number; z: number };
  startCornerLabel: RoomWallLabel | null;
  endCornerLabel: RoomWallLabel | null;
};

const WALL_GEOM: Partial<Record<RoomWallLabel, WallGeom>> = {
  sul: {
    label: "sul",
    axis: "x",
    fixedCoordMm: 0,
    runStartMm: 0,
    runEndMm: 0,
    rotacaoY_rad: 0,
    inwardNormal: { x: 0, z: 1 },
    startCornerLabel: "oeste",
    endCornerLabel: "este",
  },
  norte: {
    label: "norte",
    axis: "x",
    fixedCoordMm: 0,
    runStartMm: 0,
    runEndMm: 0,
    rotacaoY_rad: Math.PI,
    inwardNormal: { x: 0, z: -1 },
    startCornerLabel: "este",
    endCornerLabel: "oeste",
  },
  este: {
    label: "este",
    axis: "z",
    fixedCoordMm: 0,
    runStartMm: 0,
    runEndMm: 0,
    rotacaoY_rad: -Math.PI / 2,
    inwardNormal: { x: -1, z: 0 },
    startCornerLabel: "sul",
    endCornerLabel: "norte",
  },
  oeste: {
    label: "oeste",
    axis: "z",
    fixedCoordMm: 0,
    runStartMm: 0,
    runEndMm: 0,
    rotacaoY_rad: Math.PI / 2,
    inwardNormal: { x: 1, z: 0 },
    startCornerLabel: "norte",
    endCornerLabel: "sul",
  },
};

function resolveRunEnd(geom: WallGeom, widthMm: number, depthMm: number): WallGeom {
  const g = { ...geom };
  if (g.label === "sul" || g.label === "norte") {
    g.fixedCoordMm = g.label === "sul" ? 0 : depthMm;
    g.runEndMm = widthMm;
  } else {
    g.fixedCoordMm = g.label === "oeste" ? 0 : widthMm;
    g.runEndMm = depthMm;
  }
  return g;
}

function forbiddenRangesForWall(
  wallId: string,
  openings: ProjectRoomOpening[],
  runStart: number,
  runEnd: number
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  for (const o of openings) {
    if (o.wallId !== wallId) continue;
    const start = Math.max(runStart, o.xPosMm - OPENING_CLEARANCE_MM);
    const end = Math.min(runEnd, o.xPosMm + o.widthMm + OPENING_CLEARANCE_MM);
    if (end > start) ranges.push({ start, end });
  }
  return ranges.sort((a, b) => a.start - b.start);
}

function subtractRanges(
  spanStart: number,
  spanEnd: number,
  forbidden: Array<{ start: number; end: number }>
): Array<{ startMm: number; endMm: number; lengthMm: number }> {
  let cursor = spanStart;
  const segments: Array<{ startMm: number; endMm: number; lengthMm: number }> = [];
  for (const zone of forbidden) {
    if (zone.start > cursor) {
      const endMm = Math.min(zone.start, spanEnd);
      if (endMm - cursor >= 200) {
        segments.push({ startMm: cursor, endMm, lengthMm: endMm - cursor });
      }
    }
    cursor = Math.max(cursor, zone.end);
  }
  if (spanEnd - cursor >= 200) {
    segments.push({ startMm: cursor, endMm: spanEnd, lengthMm: spanEnd - cursor });
  }
  return segments;
}

export function detectRoomCorners(
  room: ProjectRoomConfig
): Array<{ wallIds: [string, string]; x_mm: number; z_mm: number }> {
  const w = room.widthMm;
  const d = room.depthMm;
  const byLabel = new Map(room.walls.map((wall) => [wall.label, wall.id]));
  const pairs: Array<[RoomWallLabel, RoomWallLabel, number, number]> = [
    ["sul", "oeste", 0, 0],
    ["sul", "este", w, 0],
    ["norte", "este", w, d],
    ["norte", "oeste", 0, d],
  ];
  return pairs
    .map(([a, b, x, z]) => {
      const idA = byLabel.get(a);
      const idB = byLabel.get(b);
      if (!idA || !idB) return null;
      return { wallIds: [idA, idB] as [string, string], x_mm: x, z_mm: z };
    })
    .filter((c): c is NonNullable<typeof c> => c != null);
}

export function analyzeRoomWalls(room: ProjectRoomConfig): AnalyzedWallRun[] {
  const widthMm = room.widthMm;
  const depthMm = room.depthMm;
  const corners = detectRoomCorners(room);
  const cornerWallIds = new Set(corners.flatMap((c) => c.wallIds));

  return room.walls
    .filter((wall) => WALL_GEOM[wall.label] != null)
    .map((wall) => {
      const geom = resolveRunEnd(WALL_GEOM[wall.label]!, widthMm, depthMm);
      const lengthMm = wallLengthMm(wall);
      const runStart = geom.runStartMm + END_RECESS_MM;
      const runEnd = Math.max(runStart, geom.runEndMm - END_RECESS_MM);
      const forbidden = forbiddenRangesForWall(wall.id, room.openings ?? [], runStart, runEnd);
      const segments = subtractRanges(runStart, runEnd, forbidden);

      const hasStartCorner =
        geom.startCornerLabel != null &&
        room.walls.some((w) => w.label === geom.startCornerLabel);
      const hasEndCorner =
        geom.endCornerLabel != null && room.walls.some((w) => w.label === geom.endCornerLabel);

      return {
        wall,
        wallId: wall.id,
        label: wall.label,
        lengthMm,
        axis: geom.axis,
        fixedCoordMm: geom.fixedCoordMm,
        runStartMm: runStart,
        runEndMm: runEnd,
        rotacaoY_rad: geom.rotacaoY_rad,
        inwardNormal: geom.inwardNormal,
        cornerAtStart: hasStartCorner && cornerWallIds.has(wall.id),
        cornerAtEnd: hasEndCorner && cornerWallIds.has(wall.id),
        segments,
      } satisfies AnalyzedWallRun;
    })
    .filter((run) => run.segments.some((s) => s.lengthMm >= 600));
}

export function runAlongToWorld(
  run: AnalyzedWallRun,
  alongMm: number,
  depthMm: number,
  heightMm: number
): { x: number; z: number; y: number } {
  const offset = depthMm / 2 + 25;
  const n = run.inwardNormal;
  if (run.axis === "x") {
    return {
      x: alongMm,
      z: run.fixedCoordMm + n.z * offset,
      y: heightMm / 2,
    };
  }
  return {
    x: run.fixedCoordMm + n.x * offset,
    z: alongMm,
    y: heightMm / 2,
  };
}
