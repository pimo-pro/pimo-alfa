import type { ProjectRoomConfig, ProjectRoomOpening } from "../../3d/viewer-engine/room/roomEngineTypes";
import type { RoomWallLabel } from "../../3d/viewer-engine/room/roomEngineTypes";
import { wallLengthMm } from "../kitchenFinish/roomContext";
import type { AnalyzedWallRun, WallRunAxis } from "./autoRoomFillTypes";

const END_RECESS_MM = 80;
const OPENING_CLEARANCE_MM = 40;
const CORNER_VERTEX_TOLERANCE_MM = 5;
const CORNER_ANGLE_MIN = 85;
const CORNER_ANGLE_MAX = 95;

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

/** Tangentes no vértice (sentido ao longo da parede, para dentro da sala). */
const CORNER_TANGENTS: Record<string, { a: [number, number]; b: [number, number] }> = {
  "sul|oeste": { a: [1, 0], b: [0, 1] },
  "sul|este": { a: [1, 0], b: [0, 1] },
  "norte|este": { a: [-1, 0], b: [0, -1] },
  "norte|oeste": { a: [-1, 0], b: [0, -1] },
  "este|sul": { a: [0, 1], b: [1, 0] },
  "este|norte": { a: [0, -1], b: [-1, 0] },
  "oeste|sul": { a: [0, 1], b: [1, 0] },
  "oeste|norte": { a: [0, -1], b: [-1, 0] },
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

function expectedWallPosition(
  label: RoomWallLabel,
  widthMm: number,
  depthMm: number
): { x: number; z: number } {
  switch (label) {
    case "sul":
      return { x: widthMm / 2, z: 0 };
    case "este":
      return { x: widthMm, z: depthMm / 2 };
    case "norte":
      return { x: widthMm / 2, z: depthMm };
    case "oeste":
      return { x: 0, z: depthMm / 2 };
    default:
      return { x: widthMm / 2, z: depthMm / 2 };
  }
}

function isWallAtCanonicalPosition(
  room: ProjectRoomConfig,
  label: RoomWallLabel
): boolean {
  const wall = room.walls.find((w) => w.label === label);
  if (!wall?.position) return false;
  const expected = expectedWallPosition(label, room.widthMm, room.depthMm);
  return (
    Math.abs(wall.position.x - expected.x) <= CORNER_VERTEX_TOLERANCE_MM &&
    Math.abs(wall.position.z - expected.z) <= CORNER_VERTEX_TOLERANCE_MM
  );
}

function cornerAngleValid(labelA: RoomWallLabel, labelB: RoomWallLabel): boolean {
  const key = `${labelA}|${labelB}`;
  const alt = `${labelB}|${labelA}`;
  const tangents = CORNER_TANGENTS[key] ?? CORNER_TANGENTS[alt];
  if (!tangents) return false;
  const [ax, az] = tangents.a;
  const [bx, bz] = tangents.b;
  const dot = ax * bx + az * bz;
  const magA = Math.hypot(ax, az);
  const magB = Math.hypot(bx, bz);
  if (magA < 1e-6 || magB < 1e-6) return false;
  const cos = Math.max(-1, Math.min(1, dot / (magA * magB)));
  const deg = (Math.acos(cos) * 180) / Math.PI;
  return deg >= CORNER_ANGLE_MIN && deg <= CORNER_ANGLE_MAX;
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
): Array<{ wallIds: [string, string]; x_mm: number; z_mm: number; valid: boolean }> {
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
      const angleOk = cornerAngleValid(a, b);
      const posOk =
        isWallAtCanonicalPosition(room, a) && isWallAtCanonicalPosition(room, b);
      return {
        wallIds: [idA, idB] as [string, string],
        x_mm: x,
        z_mm: z,
        valid: angleOk && posOk,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c != null);
}

function wallHasValidCorner(
  corners: Array<{ wallIds: [string, string]; valid: boolean }>,
  wallId: string,
  partnerLabel: RoomWallLabel | null,
  room: ProjectRoomConfig
): boolean {
  if (!partnerLabel) return false;
  const partner = room.walls.find((w) => w.label === partnerLabel);
  if (!partner) return false;
  return corners.some(
    (c) => c.valid && c.wallIds.includes(wallId) && c.wallIds.includes(partner.id)
  );
}

export function analyzeRoomWalls(room: ProjectRoomConfig): AnalyzedWallRun[] {
  const widthMm = room.widthMm;
  const depthMm = room.depthMm;
  const corners = detectRoomCorners(room);

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
        cornerAtStart:
          hasStartCorner &&
          wallHasValidCorner(corners, wall.id, geom.startCornerLabel, room),
        cornerAtEnd:
          hasEndCorner &&
          wallHasValidCorner(corners, wall.id, geom.endCornerLabel, room),
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
