import type { AutoLayoutOpeningMm, AutoLayoutRoomBoundsMm } from "../autoLayout/autoLayoutTypes";
import type { WorkspaceBox } from "../../../core/types";
import { findNearestWallId } from "../autoLayout/autoLayoutRoomGeometry";
import type { RoomSemanticType, SemanticRoomContext, SemanticWallRole } from "./intelligentDesignerTypes";

export type SemanticRoomInput = {
  bounds: AutoLayoutRoomBoundsMm;
  openings: AutoLayoutOpeningMm[];
  boxes: WorkspaceBox[];
  wallOffsetMm: number;
  roomLabelHint?: string;
};

const WALL_LABELS = ["frente (sul)", "direita (este)", "fundo (norte)", "esquerda (oeste)"];

/**
 * Análise semântica da sala — classificação heurística e zonas funcionais.
 */
export function analyzeSemanticRoom(input: SemanticRoomInput): SemanticRoomContext {
  const { bounds, openings, boxes, wallOffsetMm, roomLabelHint } = input;
  const hints: string[] = [];

  const roomType = classifyRoomType(boxes, roomLabelHint, hints);
  const wallLoads = wallOccupancy(boxes, bounds, wallOffsetMm);
  const primaryWallId = wallLoads.indexOf(Math.max(...wallLoads));
  const secondaryWallId = wallLoads
    .map((v, i) => ({ v, i }))
    .filter((w) => w.i !== primaryWallId)
    .sort((a, b) => b.v - a.v)[0]?.i ?? (primaryWallId + 1) % 4;

  const circulationWallIds = wallLoads
    .map((load, i) => ({ load, i }))
    .filter((w) => w.load === 0)
    .map((w) => w.i);

  const workZoneWallId = roomType === "kitchen" ? primaryWallId : secondaryWallId;

  hints.push(`Parede principal: ${WALL_LABELS[primaryWallId] ?? primaryWallId}`);
  hints.push(`Tipo detectado: ${roomType}`);

  if (openings.length) {
    hints.push(`${openings.length} abertura(s) considerada(s) como obstáculo`);
  }

  return {
    roomType,
    confidence: roomType === "unknown" ? 0.4 : 0.75,
    primaryWallId,
    secondaryWallId,
    circulationWallIds,
    workZoneWallId,
    openingCount: openings.length,
    doorCount: 0,
    windowCount: openings.length,
    obstacleCount: openings.length,
    boxCount: boxes.length,
    avgModuleHeightMm: averageHeight(boxes),
    hints,
  };
}

function classifyRoomType(
  boxes: WorkspaceBox[],
  hint: string | undefined,
  hints: string[]
): RoomSemanticType {
  const label = (hint ?? "").toLowerCase();
  if (label.includes("cozinha") || label.includes("kitchen")) return "kitchen";
  if (label.includes("quarto") || label.includes("bedroom")) return "bedroom";
  if (label.includes("escrit") || label.includes("office")) return "office";
  if (label.includes("sala") || label.includes("living")) return "living";

  if (!boxes.length) {
    hints.push("Sem módulos — assumindo cozinha por defeito em sala vazia");
    return "kitchen";
  }

  const avgH = averageHeight(boxes);
  const alongWalls = boxes.filter((b) => isNearWall(b)).length / Math.max(1, boxes.length);
  const hasDrawers = boxes.some((b) => b.gavetas > 0);
  const baseLike = boxes.filter((b) => b.dimensoes.altura >= 650 && b.dimensoes.altura <= 900).length;

  if (alongWalls > 0.6 && baseLike / boxes.length > 0.5 && (hasDrawers || avgH < 950)) {
    hints.push("Módulos base ao longo das paredes → cozinha");
    return "kitchen";
  }
  if (avgH > 1400) {
    hints.push("Módulos altos → quarto/armário");
    return "bedroom";
  }
  if (boxes.length <= 4 && alongWalls < 0.5) {
    hints.push("Poucos módulos centrados → sala de estar");
    return "living";
  }
  if (boxes.length >= 3 && boxes.length <= 8) {
    hints.push("Densidade média → escritório");
    return "office";
  }
  return "unknown";
}

function wallOccupancy(
  boxes: WorkspaceBox[],
  bounds: AutoLayoutRoomBoundsMm,
  wallOffsetMm: number
): number[] {
  const counts = [0, 0, 0, 0];
  for (const box of boxes) {
    const wallId = findNearestWallId(box, bounds, wallOffsetMm);
    counts[wallId] = (counts[wallId] ?? 0) + 1;
  }
  return counts;
}

function isNearWall(box: WorkspaceBox): boolean {
  void box;
  return true;
}

function averageHeight(boxes: WorkspaceBox[]): number {
  if (!boxes.length) return 720;
  return boxes.reduce((s, b) => s + b.dimensoes.altura, 0) / boxes.length;
}

export function wallRoleLabel(role: SemanticWallRole): string {
  switch (role) {
    case "primary":
      return "principal";
    case "secondary":
      return "secundária";
    case "circulation":
      return "circulação";
    case "work":
      return "trabalho";
  }
}
