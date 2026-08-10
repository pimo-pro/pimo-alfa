/**
 * Geometria adaptada de SVGnest GeometryUtil (MIT — Jack Qiao).
 * Foco industrial: polígonos / rectângulos, NFP rectangular, colisão AABB.
 */

export type DnPoint = { x: number; y: number };

export type DnPolygon = DnPoint[] & {
  id?: string;
  width?: number;
  height?: number;
  rotation?: number;
  source?: number;
};

export function almostEqual(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) < tol;
}

export function polygonArea(poly: DnPoint[]): number {
  let area = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    area += (poly[j]!.x + poly[i]!.x) * (poly[j]!.y - poly[i]!.y);
  }
  return 0.5 * area;
}

export function getPolygonBounds(poly: DnPoint[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  let minX = poly[0]!.x;
  let minY = poly[0]!.y;
  let maxX = minX;
  let maxY = minY;
  for (let i = 1; i < poly.length; i++) {
    const p = poly[i]!;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Rotação em graus CCW em torno da origem do polígono (primeiro ponto). */
export function rotatePolygon(poly: DnPolygon, degrees: number): DnPolygon {
  const rad = ((degrees % 360) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const ox = poly[0]?.x ?? 0;
  const oy = poly[0]?.y ?? 0;
  const out: DnPolygon = [];
  for (const p of poly) {
    const dx = p.x - ox;
    const dy = p.y - oy;
    out.push({ x: ox + dx * cos - dy * sin, y: oy + dx * sin + dy * cos });
  }
  const b = getPolygonBounds(out);
  out.width = b.width;
  out.height = b.height;
  out.id = poly.id;
  out.source = poly.source;
  out.rotation = degrees;
  return out;
}

export function rectPolygon(x: number, y: number, w: number, h: number): DnPolygon {
  const poly: DnPolygon = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
  poly.width = w;
  poly.height = h;
  return poly;
}

/**
 * Interior NFP quando A é rectângulo (bin) e B é rectângulo/peça.
 * Port de GeometryUtil.noFitPolygonRectangle (SVGnest).
 */
export function noFitPolygonRectangle(A: DnPoint[], B: DnPoint[]): DnPoint[][] | null {
  let minAx = A[0]!.x;
  let minAy = A[0]!.y;
  let maxAx = A[0]!.x;
  let maxAy = A[0]!.y;
  for (let i = 1; i < A.length; i++) {
    const p = A[i]!;
    if (p.x < minAx) minAx = p.x;
    if (p.y < minAy) minAy = p.y;
    if (p.x > maxAx) maxAx = p.x;
    if (p.y > maxAy) maxAy = p.y;
  }

  let minBx = B[0]!.x;
  let minBy = B[0]!.y;
  let maxBx = B[0]!.x;
  let maxBy = B[0]!.y;
  for (let i = 1; i < B.length; i++) {
    const p = B[i]!;
    if (p.x < minBx) minBx = p.x;
    if (p.y < minBy) minBy = p.y;
    if (p.x > maxBx) maxBx = p.x;
    if (p.y > maxBy) maxBy = p.y;
  }

  if (maxBx - minBx > maxAx - minAx) return null;
  if (maxBy - minBy > maxAy - minAy) return null;

  return [
    [
      { x: minAx - minBx + B[0]!.x, y: minAy - minBy + B[0]!.y },
      { x: maxAx - maxBx + B[0]!.x, y: minAy - minBy + B[0]!.y },
      { x: maxAx - maxBx + B[0]!.x, y: maxAy - maxBy + B[0]!.y },
      { x: minAx - minBx + B[0]!.x, y: maxAy - maxBy + B[0]!.y },
    ],
  ];
}

/**
 * Outer NFP aproximado para dois rectângulos: região de referência (ponto 0 de B)
 * onde B toca A sem sobrepor (anel rectangular expandido).
 */
export function outerNfpRectangles(
  placed: { x: number; y: number; w: number; h: number },
  partW: number,
  partH: number
): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: placed.x - partW,
    minY: placed.y - partH,
    maxX: placed.x + placed.w,
    maxY: placed.y + placed.h,
  };
}

export function aabbOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  kerfMm = 0
): boolean {
  const k = kerfMm;
  return !(
    a.x + a.w + k <= b.x ||
    b.x + b.w + k <= a.x ||
    a.y + a.h + k <= b.y ||
    b.y + b.h + k <= a.y
  );
}

export function pointOnRectBoundary(
  rect: { minX: number; minY: number; maxX: number; maxY: number },
  samplesPerEdge = 8
): DnPoint[] {
  const pts: DnPoint[] = [];
  const n = Math.max(2, samplesPerEdge);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push({ x: rect.minX + (rect.maxX - rect.minX) * t, y: rect.minY });
    pts.push({ x: rect.minX + (rect.maxX - rect.minX) * t, y: rect.maxY });
    pts.push({ x: rect.minX, y: rect.minY + (rect.maxY - rect.minY) * t });
    pts.push({ x: rect.maxX, y: rect.minY + (rect.maxY - rect.minY) * t });
  }
  return pts;
}
