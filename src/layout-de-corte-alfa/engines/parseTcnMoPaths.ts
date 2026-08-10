/**
 * Parser de trajetórias TCN nesting_mo (W#2201 contorno, W#81 furo).
 * Apenas leitura — não altera o writer.
 */

export type TcnPathKind = "contour" | "drill" | "rapid" | "plunge" | "retract";

export type TcnPathPoint = {
  x: number;
  y: number;
  z: number;
  feed?: number;
  diameter?: number;
  kind: TcnPathKind;
};

export type ParsedTcnPanel = {
  filenameBase: string;
  panelIndex: number;
  thicknessMm: number;
  points: TcnPathPoint[];
  /** Contornos fechados (polilinhas). */
  contours: TcnPathPoint[][];
  drills: TcnPathPoint[];
  rawTcn: string;
};

function num(re: RegExp, text: string, fallback = 0): number {
  const m = text.match(re);
  if (!m?.[1]) return fallback;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Extrai pontos de blocos W#2201 e W#81 do texto TCN «mo».
 */
export function parseTcnMoPanel(
  tcn: string,
  meta: { filenameBase: string; panelIndex: number; thicknessMm: number }
): ParsedTcnPanel {
  const points: TcnPathPoint[] = [];
  const drills: TcnPathPoint[] = [];
  const contours: TcnPathPoint[][] = [];
  let currentContour: TcnPathPoint[] = [];
  let lastZ: number | null = null;

  const blocks = tcn.match(/W#(?:2201|81)\{[^}]*\}W/g) ?? [];

  for (const block of blocks) {
    const x = num(/#1=([-\d.]+)/, block);
    const y = num(/#2=([-\d.]+)/, block);
    const z = num(/#3=([-\d.]+)/, block);
    const feed = num(/#2008=([-\d.]+)/, block, NaN);
    const diameter = num(/#1002=([-\d.]+)/, block, NaN);

    if (block.startsWith("W#81")) {
      if (currentContour.length > 0) {
        contours.push(currentContour);
        currentContour = [];
      }
      const drill: TcnPathPoint = {
        x,
        y,
        z,
        diameter: Number.isFinite(diameter) ? diameter : undefined,
        feed: Number.isFinite(feed) ? feed : 1000,
        kind: "drill",
      };
      drills.push(drill);
      points.push(drill);
      lastZ = z;
      continue;
    }

    // W#2201
    let kind: TcnPathKind = "contour";
    if (lastZ != null && Math.abs(z - lastZ) > 0.05 && Math.abs(x - (points[points.length - 1]?.x ?? x)) < 0.05) {
      kind = z > (lastZ ?? 0) ? "retract" : "plunge";
    }
    if (Number.isFinite(feed) && feed >= 8) {
      kind = "contour";
    } else if (!Number.isFinite(feed) && lastZ != null && Math.abs(z - (lastZ ?? z)) < 0.02) {
      // ponto sem feed explícito após início — continua contorno
      kind = "contour";
    }

    const pt: TcnPathPoint = {
      x,
      y,
      z,
      feed: Number.isFinite(feed) ? feed : undefined,
      kind,
    };
    points.push(pt);
    currentContour.push(pt);
    lastZ = z;
  }

  if (currentContour.length > 0) contours.push(currentContour);

  return {
    filenameBase: meta.filenameBase,
    panelIndex: meta.panelIndex,
    thicknessMm: meta.thicknessMm,
    points,
    contours,
    drills,
    rawTcn: tcn,
  };
}

export function parseTcnExportFiles(
  files: Array<{ filenameBase: string; panelIndex: number; thicknessMm: number; tcn: string }>
): ParsedTcnPanel[] {
  return files.map((f) =>
    parseTcnMoPanel(f.tcn, {
      filenameBase: f.filenameBase,
      panelIndex: f.panelIndex,
      thicknessMm: f.thicknessMm,
    })
  );
}

/** Bounds XY dos pontos (referencial TCN / máquina). */
export function boundsOfPoints(points: TcnPathPoint[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  minZ: number;
  maxZ: number;
} {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, minZ: 0, maxZ: 0 };
  }
  let minX = points[0]!.x;
  let minY = points[0]!.y;
  let maxX = minX;
  let maxY = minY;
  let minZ = points[0]!.z;
  let maxZ = minZ;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  return { minX, minY, maxX, maxY, minZ, maxZ };
}
