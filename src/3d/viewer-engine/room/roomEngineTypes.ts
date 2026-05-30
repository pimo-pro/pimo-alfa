/** Tipos Room 2.0 — fase básica pimo.pro */

export type RoomWallLabel = "norte" | "sul" | "este" | "oeste";

export type ProjectRoomWall = {
  id: string;
  label: RoomWallLabel;
  lengthMm: number;
  heightMm: number;
};

export type ProjectRoomOpening = {
  id: string;
  type: "door" | "window";
  wallId: string;
  xPosMm: number;
  widthMm: number;
  heightMm: number;
  floorOffsetMm: number;
};

export type ProjectRoomConfig = {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  wallThicknessMm: number;
  locked: boolean;
  visible: boolean;
  walls: ProjectRoomWall[];
  openings: ProjectRoomOpening[];
};

export const ROOM_20_DEFAULTS = {
  widthMm: 4000,
  depthMm: 2500,
  heightMm: 2600,
  wallThicknessMm: 200,
} as const;

export const WALL_LABELS: RoomWallLabel[] = ["sul", "este", "norte", "oeste"];

export const WALL_LABEL_TITLES: Record<RoomWallLabel, string> = {
  sul: "Sul (frente)",
  este: "Este (direita)",
  norte: "Norte (fundo)",
  oeste: "Oeste (esquerda)",
};

/** Índice da parede no layout conectado (wallStore / viewer). */
export const WALL_LABEL_TO_INDEX: Record<RoomWallLabel, number> = {
  sul: 0,
  este: 1,
  norte: 2,
  oeste: 3,
};

export const WALL_INDEX_TO_LABEL: Record<number, RoomWallLabel> = {
  0: "sul",
  1: "este",
  2: "norte",
  3: "oeste",
};
