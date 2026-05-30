import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type MouseButtonAction = "orbit" | "pan" | "zoom" | "select" | "contextMenu";

export type MouseInputMapping = {
  leftClickAction: MouseButtonAction;
  rightClickAction: MouseButtonAction;
  middleClickAction: MouseButtonAction;
  wheelAction: "zoom";
};

/** Presets suportados pelo motor (inclui legado "orbital" → classic). */
export type MouseInputPreset = "cad" | "classic" | "orbitFriendly" | "mouseCentric";

const DISABLED_MOUSE = -1 as THREE.MOUSE;

export function normalizeMouseInputPreset(preset: string): MouseInputPreset {
  if (preset === "orbitFriendly" || preset === "mouseCentric") return preset;
  if (preset === "classic" || preset === "orbital") return "classic";
  return "cad";
}

export function getMouseInputMapping(preset: MouseInputPreset): MouseInputMapping {
  switch (preset) {
    case "classic":
      return {
        leftClickAction: "orbit",
        rightClickAction: "pan",
        middleClickAction: "zoom",
        wheelAction: "zoom",
      };
    case "orbitFriendly":
      return {
        leftClickAction: "select",
        rightClickAction: "orbit",
        middleClickAction: "pan",
        wheelAction: "zoom",
      };
    case "mouseCentric":
      return {
        leftClickAction: "select",
        rightClickAction: "contextMenu",
        middleClickAction: "orbit",
        wheelAction: "zoom",
      };
    case "cad":
    default:
      return {
        leftClickAction: "pan",
        rightClickAction: "orbit",
        middleClickAction: "zoom",
        wheelAction: "zoom",
      };
  }
}

function actionToOrbitMouse(action: MouseButtonAction): THREE.MOUSE | typeof DISABLED_MOUSE {
  switch (action) {
    case "orbit":
      return THREE.MOUSE.ROTATE;
    case "pan":
      return THREE.MOUSE.PAN;
    case "zoom":
      return THREE.MOUSE.DOLLY;
    case "select":
    case "contextMenu":
      return DISABLED_MOUSE;
    default:
      return DISABLED_MOUSE;
  }
}

export function applyMouseInputMappingToOrbitControls(
  controls: OrbitControls,
  mapping: MouseInputMapping
): void {
  controls.mouseButtons.LEFT = actionToOrbitMouse(mapping.leftClickAction);
  controls.mouseButtons.MIDDLE = actionToOrbitMouse(mapping.middleClickAction);
  controls.mouseButtons.RIGHT = actionToOrbitMouse(mapping.rightClickAction);
}

export function getPointerActionForButton(
  mapping: MouseInputMapping,
  button: number
): MouseButtonAction | null {
  if (button === 0) return mapping.leftClickAction;
  if (button === 1) return mapping.middleClickAction;
  if (button === 2) return mapping.rightClickAction;
  return null;
}

/** true quando pointerdown deve bloquear OrbitControls (seleção no pointerdown). */
export function shouldBlockPointerDownForSelection(
  mapping: MouseInputMapping,
  button: number
): boolean {
  const action = getPointerActionForButton(mapping, button);
  return action === "select";
}
