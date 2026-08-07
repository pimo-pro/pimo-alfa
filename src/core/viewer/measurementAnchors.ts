export type MeasurementAnchorPoint = {
  x: number;
  y: number;
  z: number;
};

export type MeasurementAnchorEntry = {
  id: string;
  position: MeasurementAnchorPoint;
  label?: string;
  createdAt: number;
};

export type MeasurementAnchorDistance = {
  anchorId: string;
  targetEncodedId: string;
  distanceMm: number;
};

export function createMeasurementAnchorId(): string {
  return `anchor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function addAnchor(
  anchors: MeasurementAnchorEntry[],
  position: MeasurementAnchorPoint,
  label?: string
): MeasurementAnchorEntry[] {
  const entry: MeasurementAnchorEntry = {
    id: createMeasurementAnchorId(),
    position: { ...position },
    label,
    createdAt: Date.now(),
  };
  return [...anchors, entry];
}

export function removeAnchor(anchors: MeasurementAnchorEntry[], id: string): MeasurementAnchorEntry[] {
  return anchors.filter((a) => a.id !== id);
}

export function getAnchors(anchors: MeasurementAnchorEntry[]): MeasurementAnchorEntry[] {
  return [...anchors];
}

function distanceMm(
  a: MeasurementAnchorPoint,
  b: MeasurementAnchorPoint
): number {
  const dx = (a.x - b.x) * 1000;
  const dy = (a.y - b.y) * 1000;
  const dz = (a.z - b.z) * 1000;
  // Precisão unificada de 0,1 mm (igual à régua unificada).
  return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz) * 10) / 10;
}

export function computeAnchorDistances(
  anchors: MeasurementAnchorEntry[],
  targetPosition: MeasurementAnchorPoint,
  targetEncodedId: string
): MeasurementAnchorDistance[] {
  return anchors.map((anchor) => ({
    anchorId: anchor.id,
    targetEncodedId,
    distanceMm: distanceMm(anchor.position, targetPosition),
  }));
}

export function computeAnchorToAnchorDistances(
  anchors: MeasurementAnchorEntry[]
): Array<{ fromId: string; toId: string; distanceMm: number }> {
  const out: Array<{ fromId: string; toId: string; distanceMm: number }> = [];
  for (let i = 0; i < anchors.length; i++) {
    for (let j = i + 1; j < anchors.length; j++) {
      const a = anchors[i]!;
      const b = anchors[j]!;
      out.push({
        fromId: a.id,
        toId: b.id,
        distanceMm: distanceMm(a.position, b.position),
      });
    }
  }
  return out;
}
