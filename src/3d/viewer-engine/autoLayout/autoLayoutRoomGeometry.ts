import type { AutoLayoutOpeningMm, AutoLayoutRoomBoundsMm, WallLayoutDef } from "./autoLayoutTypes";
import { ROOM_LAYOUT_INSET_MM } from "./autoLayoutTypes";

export function buildWallDef(
  wallId: number,
  bounds: AutoLayoutRoomBoundsMm,
  wallOffsetMm: number
): WallLayoutDef | null {
  const inset = ROOM_LAYOUT_INSET_MM + Math.max(0, wallOffsetMm);
  switch (wallId) {
    case 0:
      return {
        wallId: 0,
        axis: "x",
        rangeStart_mm: bounds.minX_mm + inset,
        rangeEnd_mm: bounds.maxX_mm - inset,
        fixedAxis: "z",
        fixedCenter_mm: bounds.minZ_mm + inset,
      };
    case 1:
      return {
        wallId: 1,
        axis: "z",
        rangeStart_mm: bounds.minZ_mm + inset,
        rangeEnd_mm: bounds.maxZ_mm - inset,
        fixedAxis: "x",
        fixedCenter_mm: bounds.maxX_mm - inset,
      };
    case 2:
      return {
        wallId: 2,
        axis: "x",
        rangeStart_mm: bounds.minX_mm + inset,
        rangeEnd_mm: bounds.maxX_mm - inset,
        fixedAxis: "z",
        fixedCenter_mm: bounds.maxZ_mm - inset,
      };
    case 3:
      return {
        wallId: 3,
        axis: "z",
        rangeStart_mm: bounds.minZ_mm + inset,
        rangeEnd_mm: bounds.maxZ_mm - inset,
        fixedAxis: "x",
        fixedCenter_mm: bounds.minX_mm + inset,
      };
    default:
      return null;
  }
}

export function getFreeIntervalsOnWall(
  wall: WallLayoutDef,
  openings: AutoLayoutOpeningMm[],
  moduleSizeAlongAxis_mm: number
): Array<{ start: number; end: number }> {
  const blocked: Array<{ start: number; end: number }> = [];
  for (const o of openings) {
    if (wall.axis === "x") {
      blocked.push({ start: o.minX_mm, end: o.maxX_mm });
    } else {
      blocked.push({ start: o.minZ_mm, end: o.maxZ_mm });
    }
  }
  blocked.sort((a, b) => a.start - b.start);

  const intervals: Array<{ start: number; end: number }> = [];
  let cursor = wall.rangeStart_mm;
  for (const b of blocked) {
    const blockStart = Math.max(wall.rangeStart_mm, b.start);
    const blockEnd = Math.min(wall.rangeEnd_mm, b.end);
    if (blockStart > cursor) {
      intervals.push({ start: cursor, end: blockStart });
    }
    cursor = Math.max(cursor, blockEnd);
  }
  if (cursor < wall.rangeEnd_mm) {
    intervals.push({ start: cursor, end: wall.rangeEnd_mm });
  }

  return intervals.filter((i) => i.end - i.start >= moduleSizeAlongAxis_mm);
}

export function pickLongestInterval(
  intervals: Array<{ start: number; end: number }>
): { start: number; end: number } | null {
  if (!intervals.length) return null;
  return intervals.reduce((best, cur) =>
    cur.end - cur.start > best.end - best.start ? cur : best
  );
}

export function computeEvenPlacementsAlongInterval(
  intervalStart: number,
  intervalEnd: number,
  moduleWidth_mm: number,
  count: number
): number[] {
  if (count <= 0) return [];
  const span = intervalEnd - intervalStart;
  if (span < moduleWidth_mm) return [];
  const gap = count > 1 ? (span - count * moduleWidth_mm) / (count + 1) : (span - moduleWidth_mm) / 2;
  const centers: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const left = intervalStart + gap + i * (moduleWidth_mm + gap);
    centers.push(left + moduleWidth_mm / 2);
  }
  return centers;
}

export function boxCenterOnAxis(
  box: { posicaoX_mm: number; posicaoZ_mm?: number; dimensoes: { largura: number; profundidade: number } },
  axis: "x" | "z"
): number {
  return axis === "x" ? box.posicaoX_mm : (box.posicaoZ_mm ?? 0);
}

export function moduleWidthOnWall(
  box: { dimensoes: { largura: number; profundidade: number }; rotacaoY?: number },
  wall: WallLayoutDef
): number {
  const rot = box.rotacaoY ?? 0;
  const alongX = Math.abs(Math.cos(rot)) > 0.707;
  const width = box.dimensoes.largura;
  const depth = box.dimensoes.profundidade;
  if (wall.axis === "x") {
    return alongX ? width : depth;
  }
  return alongX ? depth : width;
}

export function moduleDepthFromWall(
  box: { dimensoes: { largura: number; profundidade: number }; rotacaoY?: number },
  wall: WallLayoutDef
): number {
  const rot = box.rotacaoY ?? 0;
  const alongX = Math.abs(Math.cos(rot)) > 0.707;
  const width = box.dimensoes.largura;
  const depth = box.dimensoes.profundidade;
  if (wall.axis === "x") {
    return alongX ? depth : width;
  }
  return alongX ? width : depth;
}

export function placementOnWall(
  wall: WallLayoutDef,
  along_mm: number,
  box: {
    dimensoes: { largura: number; profundidade: number; altura: number };
    posicaoY_mm?: number;
    rotacaoY?: number;
  },
  _bounds: AutoLayoutRoomBoundsMm
): { x_mm: number; y_mm: number; z_mm: number } {
  const depth = moduleDepthFromWall(box, wall);
  const y_mm = box.posicaoY_mm ?? box.dimensoes.altura / 2;
  if (wall.fixedAxis === "z") {
    const z_mm =
      wall.wallId === 0
        ? wall.fixedCenter_mm + depth / 2
        : wall.fixedCenter_mm - depth / 2;
    return { x_mm: along_mm, y_mm, z_mm };
  }
  const x_mm =
    wall.wallId === 1
      ? wall.fixedCenter_mm - depth / 2
      : wall.fixedCenter_mm + depth / 2;
  return { x_mm, y_mm, z_mm: along_mm };
}

export function findNearestWallId(
  box: { posicaoX_mm: number; posicaoZ_mm?: number },
  bounds: AutoLayoutRoomBoundsMm,
  wallOffsetMm: number
): number {
  const inset = ROOM_LAYOUT_INSET_MM + Math.max(0, wallOffsetMm);
  const z = box.posicaoZ_mm ?? 0;
  const distFront = Math.abs(z - (bounds.minZ_mm + inset));
  const distBack = Math.abs(z - (bounds.maxZ_mm - inset));
  const distLeft = Math.abs(box.posicaoX_mm - (bounds.minX_mm + inset));
  const distRight = Math.abs(box.posicaoX_mm - (bounds.maxX_mm - inset));
  const min = Math.min(distFront, distBack, distLeft, distRight);
  if (min === distFront) return 0;
  if (min === distRight) return 1;
  if (min === distBack) return 2;
  return 3;
}

export function intervalContaining(
  intervals: Array<{ start: number; end: number }>,
  value: number,
  moduleWidth_mm: number
): { start: number; end: number } | null {
  for (const i of intervals) {
    if (value >= i.start && value <= i.end - moduleWidth_mm) return i;
    if (value + moduleWidth_mm / 2 >= i.start && value - moduleWidth_mm / 2 <= i.end) return i;
  }
  return pickLongestInterval(intervals);
}
