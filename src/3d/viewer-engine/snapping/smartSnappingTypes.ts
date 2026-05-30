import * as THREE from "three";

export type SmartSnapMode = "basic" | "advanced";

export type ActiveAlignmentType =
  | "flush"
  | "center"
  | "corner"
  | "stack"
  | "depth"
  | "height"
  | "spacing"
  | null;

export type SmartSnapKind =
  | "vertex"
  | "edgeMid"
  | "edge"
  | "faceCenter"
  | "boxAxis"
  | "boxCenter"
  | "bboxProjection"
  | "face"
  | "autoFlush"
  | "autoStack"
  | "autoDepth"
  | "autoHeight"
  | "autoSpacing"
  | "roomCorner"
  | "roomWall"
  | "roomWallMid"
  | "roomFloor"
  | "roomCeiling"
  | "roomOpeningEdge"
  | "grid"
  | "axis"
  | "center";

export type SnapCandidate = {
  kind: SmartSnapKind;
  priority: number;
  delta: THREE.Vector3;
  snapPoint: THREE.Vector3;
  distanceM: number;
  alignmentType?: ActiveAlignmentType;
  distanceLabelMm?: number;
  guides?: Array<{ start: THREE.Vector3; end: THREE.Vector3 }>;
};

export type BoxAabb = {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
};

export type RoomBoundsLike = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerZ: number;
};

export type RoomOpeningLike = {
  elementId: string;
  type: "door" | "window";
  min: THREE.Vector3;
  max: THREE.Vector3;
};

export const SNAP_PRIORITY: Record<SmartSnapKind, number> = {
  roomCorner: 0,
  roomOpeningEdge: 1,
  roomWall: 2,
  roomWallMid: 3,
  roomFloor: 4,
  roomCeiling: 4,
  autoFlush: 5,
  autoStack: 6,
  autoDepth: 7,
  autoHeight: 8,
  autoSpacing: 9,
  vertex: 10,
  edgeMid: 11,
  edge: 12,
  faceCenter: 13,
  boxAxis: 14,
  boxCenter: 15,
  bboxProjection: 16,
  face: 17,
  grid: 18,
  axis: 19,
  center: 20,
};

export const SNAP_VISUAL: Record<
  SmartSnapKind,
  { color: string; dash: string; label: string; radius: number }
> = {
  vertex: { color: "#f97316", dash: "#fb923c", label: "Vértice", radius: 7 },
  edgeMid: { color: "#eab308", dash: "#facc15", label: "Meio aresta", radius: 6 },
  edge: { color: "#84cc16", dash: "#a3e635", label: "Aresta", radius: 6 },
  faceCenter: { color: "#06b6d4", dash: "#22d3ee", label: "Centro face", radius: 7 },
  boxAxis: { color: "#8b5cf6", dash: "#a78bfa", label: "Eixo", radius: 5 },
  boxCenter: { color: "#ec4899", dash: "#f472b6", label: "Centro caixa", radius: 7 },
  bboxProjection: { color: "#64748b", dash: "#94a3b8", label: "Projeção", radius: 5 },
  face: { color: "#0ea5e9", dash: "#38bdf8", label: "Face", radius: 6 },
  autoFlush: { color: "#0284c7", dash: "#38bdf8", label: "Flush", radius: 7 },
  autoStack: { color: "#7c3aed", dash: "#a78bfa", label: "Stack", radius: 7 },
  autoDepth: { color: "#059669", dash: "#34d399", label: "Profundidade", radius: 6 },
  autoHeight: { color: "#d97706", dash: "#fbbf24", label: "Altura", radius: 6 },
  autoSpacing: { color: "#6366f1", dash: "#818cf8", label: "Espaçamento", radius: 6 },
  roomCorner: { color: "#f59e0b", dash: "#fbbf24", label: "Canto", radius: 7 },
  roomWall: { color: "#14b8a6", dash: "#2dd4bf", label: "Parede", radius: 6 },
  roomWallMid: { color: "#10b981", dash: "#34d399", label: "Centro parede", radius: 6 },
  roomFloor: { color: "#78716c", dash: "#a8a29e", label: "Chão", radius: 6 },
  roomCeiling: { color: "#57534e", dash: "#78716c", label: "Teto", radius: 6 },
  roomOpeningEdge: { color: "#e11d48", dash: "#fb7185", label: "Abertura", radius: 6 },
  grid: { color: "#fde047", dash: "#fef08a", label: "Grade", radius: 5 },
  axis: { color: "#cbd5e1", dash: "#e2e8f0", label: "Eixo global", radius: 5 },
  center: { color: "#94a3b8", dash: "#cbd5e1", label: "Centro cena", radius: 6 },
};

export function pushCandidate(
  out: SnapCandidate[],
  candidate: Omit<SnapCandidate, "priority"> & { kind: SmartSnapKind }
): void {
  out.push({ ...candidate, priority: SNAP_PRIORITY[candidate.kind] });
}

export function kindToAlignment(kind: SmartSnapKind): ActiveAlignmentType {
  switch (kind) {
    case "roomWall":
    case "face":
    case "autoFlush":
      return "flush";
    case "roomWallMid":
    case "faceCenter":
    case "boxCenter":
      return "center";
    case "roomCorner":
      return "corner";
    case "autoStack":
      return "stack";
    case "autoDepth":
      return "depth";
    case "autoHeight":
      return "height";
    case "autoSpacing":
      return "spacing";
    default:
      return null;
  }
}

export function boxesOverlapOnAxis(a: BoxAabb, b: BoxAabb, axis: "x" | "z"): boolean {
  if (axis === "x") {
    return a.max.x > b.min.x && a.min.x < b.max.x;
  }
  return a.max.z > b.min.z && a.min.z < b.max.z;
}
