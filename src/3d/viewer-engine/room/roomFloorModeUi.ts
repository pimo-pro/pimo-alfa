import type { RoomFloorMode } from "./roomEngineTypes";

export type RoomFloorModeUiOption = {
  value: RoomFloorMode;
  label: string;
  description: string;
  /** Largura relativa da pré-visualização (0–1). */
  previewScale: number;
  previewColor: string;
};

export const ROOM_FLOOR_MODE_OPTIONS: RoomFloorModeUiOption[] = [
  {
    value: "room",
    label: "Piso apenas dentro da sala",
    description: "Overlay alinhado aos limites dinâmicos da sala (paredes principais e extras).",
    previewScale: 0.55,
    previewColor: "#c5cdd8",
  },
  {
    value: "hybrid",
    label: "Piso expandido ligeiramente",
    description: "Expande cerca de 35 cm para além dos limites da sala. O chão global permanece visível.",
    previewScale: 0.72,
    previewColor: "#b8c4d4",
  },
  {
    value: "full",
    label: "Piso expandido (modo estúdio)",
    description: "Expande 4 m para além da sala — ideal para apresentação. Não substitui o chão global.",
    previewScale: 0.95,
    previewColor: "#a8b8cc",
  },
];

export function getRoomFloorModeOption(mode: RoomFloorMode): RoomFloorModeUiOption {
  return ROOM_FLOOR_MODE_OPTIONS.find((o) => o.value === mode) ?? ROOM_FLOOR_MODE_OPTIONS[0];
}
