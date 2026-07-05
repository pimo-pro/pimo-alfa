import * as THREE from "three";
import type { SmartAlignOverlayGuide } from "./smartAlignSnapOverlay";
import type { BoxAabb } from "./smartSnappingTypes";

const GUIDE_EXTEND_M = 0.12;

function spanMin(a: BoxAabb, b: BoxAabb, axis: "x" | "y" | "z"): number {
  return Math.min(a.min[axis], b.min[axis]) - GUIDE_EXTEND_M;
}

function spanMax(a: BoxAabb, b: BoxAabb, axis: "x" | "y" | "z"): number {
  return Math.max(a.max[axis], b.max[axis]) + GUIDE_EXTEND_M;
}

/** Linhas finas de referência para o overlay (X / Y / Z). */
export function buildDynamicAlignGuides(
  moving: BoxAabb,
  other: BoxAabb,
  kind: string
): SmartAlignOverlayGuide[] {
  const guides: SmartAlignOverlayGuide[] = [];

  if (kind.includes("left") || kind === "align_left") {
    const x = other.min.x;
    guides.push({
      start: new THREE.Vector3(x, spanMin(moving, other, "y"), spanMin(moving, other, "z")),
      end: new THREE.Vector3(x, spanMax(moving, other, "y"), spanMax(moving, other, "z")),
    });
  }
  if (kind.includes("right") || kind === "align_right") {
    const x = other.max.x;
    guides.push({
      start: new THREE.Vector3(x, spanMin(moving, other, "y"), spanMin(moving, other, "z")),
      end: new THREE.Vector3(x, spanMax(moving, other, "y"), spanMax(moving, other, "z")),
    });
  }
  if (kind.includes("front") || kind === "align_front") {
    const z = other.max.z;
    guides.push({
      start: new THREE.Vector3(spanMin(moving, other, "x"), spanMin(moving, other, "y"), z),
      end: new THREE.Vector3(spanMax(moving, other, "x"), spanMax(moving, other, "y"), z),
    });
  }
  if (kind.includes("back") || kind === "align_back") {
    const z = other.min.z;
    guides.push({
      start: new THREE.Vector3(spanMin(moving, other, "x"), spanMin(moving, other, "y"), z),
      end: new THREE.Vector3(spanMax(moving, other, "x"), spanMax(moving, other, "y"), z),
    });
  }
  if (kind === "align_top") {
    const y = other.max.y;
    guides.push({
      start: new THREE.Vector3(spanMin(moving, other, "x"), y, spanMin(moving, other, "z")),
      end: new THREE.Vector3(spanMax(moving, other, "x"), y, spanMax(moving, other, "z")),
    });
  }
  if (kind === "align_bottom") {
    const y = other.min.y;
    guides.push({
      start: new THREE.Vector3(spanMin(moving, other, "x"), y, spanMin(moving, other, "z")),
      end: new THREE.Vector3(spanMax(moving, other, "x"), y, spanMax(moving, other, "z")),
    });
  }

  return guides;
}

export function labelForDynamicAlignKind(kind: string): string {
  switch (kind) {
    case "align_left":
      return "Esquerda";
    case "align_right":
      return "Direita";
    case "align_front":
      return "Frente";
    case "align_back":
      return "Trás";
    case "align_top":
      return "Topo";
    case "align_bottom":
      return "Base";
    case "adjacent_left":
      return "Encostar esq.";
    case "adjacent_right":
      return "Encostar dir.";
    case "adjacent_front":
      return "Encostar frente";
    case "adjacent_back":
      return "Encostar trás";
    default:
      return kind.replace(/_/g, " ");
  }
}
