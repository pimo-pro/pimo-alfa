import { mergeSkylineSegments } from "./strategySkyline";
import { splitGuillotineRect, pruneContainedFreeRects } from "./strategyGuillotine";

const EPS = 0.001;

type PlacementCandidate = { x: number; y: number; w: number; h: number; rotation: number };
type SkylineSegment = { x: number; y: number };
type Shelf = { y: number; height: number; nextX: number };
type FreeRect = { x: number; y: number; w: number; h: number };
type StrategyState = { skyline: SkylineSegment[] } | { shelves: Shelf[] } | { freeRects: FreeRect[] };

export function initStrategyState(strategy: "skyline" | "shelf" | "guillotine", sheet: { largura_mm: number; altura_mm: number }): StrategyState {
  if (strategy === "skyline") return { skyline: [{ x: 0, y: 0 }, { x: sheet.largura_mm, y: 0 }] };
  if (strategy === "shelf") return { shelves: [] };
  return { freeRects: [{ x: 0, y: 0, w: sheet.largura_mm, h: sheet.altura_mm }] };
}

function getSkylineYAt(skyline: SkylineSegment[], x: number): number {
  for (let i = 0; i < skyline.length - 1; i++) {
    if (skyline[i].x <= x && x < skyline[i + 1].x) return skyline[i].y;
  }
  return skyline.length > 0 ? skyline[skyline.length - 1].y : 0;
}

function updateSkyline(
  skyline: SkylineSegment[],
  x: number,
  y: number,
  w: number,
  h: number,
  kerf: number
): SkylineSegment[] {
  const newH = y + h + kerf;
  const xEnd = x + w;
  const out: SkylineSegment[] = [];
  let i = 0;
  while (i < skyline.length && skyline[i].x < x) {
    out.push(skyline[i]);
    i++;
  }
  out.push({ x, y: newH });
  const heightAtEnd = getSkylineYAt(skyline, xEnd);
  while (i < skyline.length && skyline[i].x <= xEnd) i++;
  out.push({ x: xEnd, y: heightAtEnd });
  while (i < skyline.length) {
    out.push(skyline[i]);
    i++;
  }
  return mergeSkylineSegments(out);
}

export function updateStrategyState(
  strategy: "skyline" | "shelf" | "guillotine",
  state: StrategyState,
  placement: PlacementCandidate,
  kerf: number
): StrategyState {
  if (strategy === "skyline") {
    const sk = state as { skyline: SkylineSegment[] };
    return { skyline: updateSkyline(sk.skyline, placement.x, placement.y, placement.w, placement.h, kerf) };
  }
  if (strategy === "shelf") {
    const sh = state as { shelves: Shelf[] };
    const shelves = [...sh.shelves];
    const shelfIndex = shelves.findIndex((s) => Math.abs(s.y - placement.y) < EPS);
    if (shelfIndex >= 0) {
      shelves[shelfIndex] = {
        ...shelves[shelfIndex],
        height: Math.max(shelves[shelfIndex].height, placement.h),
        nextX: placement.x + placement.w + kerf,
      };
    } else {
      shelves.push({ y: placement.y, height: placement.h, nextX: placement.x + placement.w + kerf });
    }
    return { shelves };
  }

  const gu = state as { freeRects: FreeRect[] };
  const freeRects = [...gu.freeRects];
  const idx = freeRects.findIndex(
    (r) =>
      placement.x >= r.x - EPS &&
      placement.y >= r.y - EPS &&
      placement.x + placement.w <= r.x + r.w + EPS &&
      placement.y + placement.h <= r.y + r.h + EPS
  );
  if (idx >= 0) {
    const [used] = freeRects.splice(idx, 1);
    const split = splitGuillotineRect(used, placement.w, placement.h, kerf);
    freeRects.push(...split.filter((r) => r.w > EPS && r.h > EPS));
  }
  return { freeRects: pruneContainedFreeRects(freeRects) };
}
