/**
 * Núcleo paramétrico de dimensões / medições do viewer.
 * Funções puras (metros no mundo 3D ou px em 2D), sem ViewerCore nem Three.js.
 * Alimenta régua externa (AABB vs caixa/parede/chão) e medição interna (segmentos).
 */

export type Vec3 = { x: number; y: number; z: number };

/** Caixa alinhada aos eixos no espaço mundo (m). */
export type Aabb3 = { min: Vec3; max: Vec3 };

export type RoomBoundsXZ = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type ParametricRulerKind = "box" | "wall" | "floor";

/** Medida paramétrica equivalente ao contrato visual da régua (pontos + gap). */
export type ParametricRulerHit = {
  kind: ParametricRulerKind;
  distanceM: number;
  start: Vec3;
  end: Vec3;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function vsub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vadd(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vscale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vdot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vdist(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Melhor medição de separação entre duas AABBs ao longo dos eixos quando há
 * sobreposição nas outras duas dimensões (mesma lógica da régua caixa–caixa).
 */
export function nearestBoxGapBetweenPair(selected: Aabb3, other: Aabb3): ParametricRulerHit | null {
  const s = selected;
  const o = other;
  let best: ParametricRulerHit | null = null;

  const consider = (hit: ParametricRulerHit | null) => {
    if (!hit) return;
    if (!best || hit.distanceM < best.distanceM) best = hit;
  };

  const overlapY = Math.min(s.max.y, o.max.y) - Math.max(s.min.y, o.min.y);
  const overlapZ = Math.min(s.max.z, o.max.z) - Math.max(s.min.z, o.min.z);
  if (overlapY > 0 && overlapZ > 0) {
    const yMid = (Math.max(s.min.y, o.min.y) + Math.min(s.max.y, o.max.y)) * 0.5;
    const zMid = (Math.max(s.min.z, o.min.z) + Math.min(s.max.z, o.max.z)) * 0.5;
    const y = clamp(yMid, s.min.y, s.max.y);
    const z = clamp(zMid, s.min.z, s.max.z);
    if (s.max.x <= o.min.x) {
      const distanceM = o.min.x - s.max.x;
      consider({
        kind: "box",
        distanceM,
        start: { x: s.max.x, y, z },
        end: { x: o.min.x, y, z },
      });
    } else if (o.max.x <= s.min.x) {
      const distanceM = s.min.x - o.max.x;
      consider({
        kind: "box",
        distanceM,
        start: { x: s.min.x, y, z },
        end: { x: o.max.x, y, z },
      });
    }
  }

  const overlapX = Math.min(s.max.x, o.max.x) - Math.max(s.min.x, o.min.x);
  if (overlapX > 0 && overlapZ > 0) {
    const xMid = (Math.max(s.min.x, o.min.x) + Math.min(s.max.x, o.max.x)) * 0.5;
    const zMid = (Math.max(s.min.z, o.min.z) + Math.min(s.max.z, o.max.z)) * 0.5;
    const x = clamp(xMid, s.min.x, s.max.x);
    const z = clamp(zMid, s.min.z, s.max.z);
    if (s.max.y <= o.min.y) {
      const distanceM = o.min.y - s.max.y;
      consider({
        kind: "box",
        distanceM,
        start: { x, y: s.max.y, z },
        end: { x, y: o.min.y, z },
      });
    } else if (o.max.y <= s.min.y) {
      const distanceM = s.min.y - o.max.y;
      consider({
        kind: "box",
        distanceM,
        start: { x, y: s.min.y, z },
        end: { x, y: o.max.y, z },
      });
    }
  }

  if (overlapX > 0 && overlapY > 0) {
    const xMid = (Math.max(s.min.x, o.min.x) + Math.min(s.max.x, o.max.x)) * 0.5;
    const yMid = (Math.max(s.min.y, o.min.y) + Math.min(s.max.y, o.max.y)) * 0.5;
    const x = clamp(xMid, s.min.x, s.max.x);
    const y = clamp(yMid, s.min.y, s.max.y);
    if (s.max.z <= o.min.z) {
      const distanceM = o.min.z - s.max.z;
      consider({
        kind: "box",
        distanceM,
        start: { x, y, z: s.max.z },
        end: { x, y, z: o.min.z },
      });
    } else if (o.max.z <= s.min.z) {
      const distanceM = s.min.z - o.max.z;
      consider({
        kind: "box",
        distanceM,
        start: { x, y, z: s.min.z },
        end: { x, y, z: o.max.z },
      });
    }
  }

  return best;
}

/** Distâncias às quatro paredes “virtuais” do retângulo da sala (eixo X/Z). */
export function wallClearanceMeasurements(box: Aabb3, room: RoomBoundsXZ): ParametricRulerHit[] {
  const candidates: ParametricRulerHit[] = [];
  const centerY = (box.min.y + box.max.y) * 0.5;
  const centerX = (box.min.x + box.max.x) * 0.5;
  const centerZ = (box.min.z + box.max.z) * 0.5;

  const distMinX = box.min.x - room.minX;
  if (distMinX >= 0) {
    candidates.push({
      kind: "wall",
      distanceM: distMinX,
      start: { x: box.min.x, y: centerY, z: centerZ },
      end: { x: room.minX, y: centerY, z: centerZ },
    });
  }
  const distMaxX = room.maxX - box.max.x;
  if (distMaxX >= 0) {
    candidates.push({
      kind: "wall",
      distanceM: distMaxX,
      start: { x: box.max.x, y: centerY, z: centerZ },
      end: { x: room.maxX, y: centerY, z: centerZ },
    });
  }
  const distMinZ = box.min.z - room.minZ;
  if (distMinZ >= 0) {
    candidates.push({
      kind: "wall",
      distanceM: distMinZ,
      start: { x: centerX, y: centerY, z: box.min.z },
      end: { x: centerX, y: centerY, z: room.minZ },
    });
  }
  const distMaxZ = room.maxZ - box.max.z;
  if (distMaxZ >= 0) {
    candidates.push({
      kind: "wall",
      distanceM: distMaxZ,
      start: { x: centerX, y: centerY, z: box.max.z },
      end: { x: centerX, y: centerY, z: room.maxZ },
    });
  }

  return candidates;
}

export function nearestWallMeasurement(box: Aabb3, room: RoomBoundsXZ): ParametricRulerHit | null {
  return shortestByDistanceM(wallClearanceMeasurements(box, room));
}

export function floorClearanceMeasurement(
  box: Aabb3,
  floorY: number,
  minGapM = 1e-6
): ParametricRulerHit | null {
  const distanceM = box.min.y - floorY;
  if (distanceM < minGapM) return null;
  const centerX = (box.min.x + box.max.x) * 0.5;
  const centerZ = (box.min.z + box.max.z) * 0.5;
  return {
    kind: "floor",
    distanceM,
    start: { x: centerX, y: box.min.y, z: centerZ },
    end: { x: centerX, y: floorY, z: centerZ },
  };
}

/** Quadrado da distância do ponto 2D ao segmento AB (para picking de aresta em tela). */
export function distancePointToSegment2DSquared(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const abX = bx - ax;
  const abY = by - ay;
  const apX = px - ax;
  const apY = py - ay;
  const abLenSq = abX * abX + abY * abY;
  if (abLenSq <= 1e-8) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }
  const t = clamp((apX * abX + apY * abY) / abLenSq, 0, 1);
  const cx = ax + abX * t;
  const cy = ay + abY * t;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy;
}

export function closestPointOnSegment3D(point: Vec3, segStart: Vec3, segEnd: Vec3): Vec3 {
  const seg = vsub(segEnd, segStart);
  const lenSq = vdot(seg, seg);
  if (lenSq <= 1e-10) return { ...segStart };
  const t = clamp(vdot(vsub(point, segStart), seg) / lenSq, 0, 1);
  return vadd(segStart, vscale(seg, t));
}

/** Menor distância entre dois segmentos 3D (com extremos nos segmentos). */
export function closestPointsBetweenSegments3D(
  p1: Vec3,
  q1: Vec3,
  p2: Vec3,
  q2: Vec3
): { pointA: Vec3; pointB: Vec3; distance: number } {
  const d1 = vsub(q1, p1);
  const d2 = vsub(q2, p2);
  const r = vsub(p1, p2);
  const a = vdot(d1, d1);
  const e = vdot(d2, d2);
  const f = vdot(d2, r);

  let s = 0;
  let t = 0;
  const eps = 1e-10;
  if (a <= eps && e <= eps) {
    return { pointA: { ...p1 }, pointB: { ...p2 }, distance: vdist(p1, p2) };
  }
  if (a <= eps) {
    s = 0;
    t = clamp(f / e, 0, 1);
  } else {
    const c = vdot(d1, r);
    if (e <= eps) {
      t = 0;
      s = clamp(-c / a, 0, 1);
    } else {
      const b = vdot(d1, d2);
      const denom = a * e - b * b;
      if (Math.abs(denom) > eps) {
        s = clamp((b * f - c * e) / denom, 0, 1);
      } else {
        s = 0;
      }
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a, 0, 1);
      }
    }
  }

  const pointA0 = vadd(p1, vscale(d1, s));
  const pointB0 = vadd(p2, vscale(d2, t));
  const cands: Array<{ pointA: Vec3; pointB: Vec3 }> = [
    { pointA: pointA0, pointB: pointB0 },
    { pointA: { ...p1 }, pointB: closestPointOnSegment3D(p1, p2, q2) },
    { pointA: { ...q1 }, pointB: closestPointOnSegment3D(q1, p2, q2) },
    { pointA: closestPointOnSegment3D(p2, p1, q1), pointB: { ...p2 } },
    { pointA: closestPointOnSegment3D(q2, p1, q1), pointB: { ...q2 } },
  ];

  let best = cands[0];
  let bestDist = vdist(best.pointA, best.pointB);
  for (let i = 1; i < cands.length; i += 1) {
    const d = vdist(cands[i].pointA, cands[i].pointB);
    if (d < bestDist) {
      best = cands[i];
      bestDist = d;
    }
  }
  return { pointA: best.pointA, pointB: best.pointB, distance: bestDist };
}

/** Escolhe o item com menor `distanceM` (régua externa e qualquer lista homogénea). */
export function shortestByDistanceM<T extends { distanceM: number }>(items: readonly T[]): T | null {
  if (!items.length) return null;
  let best = items[0];
  for (let i = 1; i < items.length; i += 1) {
    if (items[i].distanceM < best.distanceM) best = items[i];
  }
  return best;
}

/** Arredonda metros para mm inteiros (rótulo de régua). */
export function worldMetersToLabelMm(distanceM: number): number {
  return Math.round(distanceM * 1000);
}
