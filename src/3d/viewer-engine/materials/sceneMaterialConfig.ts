/**
 * MaterialEngine — Configuração unificada de materiais de cena (paredes, chão, room box).
 * Valores alinhados com o relatório: WallFactory, RoomManager, ViewerCore roomBox, SceneManager ground.
 */

import type { SceneMaterialConfig } from "./types";

/** Configuração padrão: paredes cinza claro, chão claro, room box semelhante às paredes. */
export function getSceneMaterialConfig(): SceneMaterialConfig {
  return {
    wall: {
      color: 0xd1d5db,
      roughness: 0.75,
      metalness: 0.05,
      transparent: true,
      opacity: 0.6,
    },
    wallExtra: {
      color: 0x9ca3af,
      roughness: 0.75,
      metalness: 0.05,
      transparent: true,
      opacity: 0.6,
    },
    floor: {
      color: 0xe5e7eb,
      roughness: 0.9,
      metalness: 0,
      sideDouble: true,
    },
    roomBox: {
      color: 0xd1d5db,
      roughness: 0.75,
      metalness: 0.05,
      transparent: true,
      opacity: 0.8,
    },
    ground: {
      color: "#d4dae2",
      roughness: 0.92,
      metalness: 0,
    },
  };
}
