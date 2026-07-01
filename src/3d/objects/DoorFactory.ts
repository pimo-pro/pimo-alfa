import * as THREE from "three";
import {
  isCornerV2DoorViewer,
  resolveCornerDoorTransformByOrientation,
} from "../../core/cornerCabinet/cornerDoorViewer";
import { getDefaultOfficialMaterial } from "../../core/materials/materials.api";
import type { DoorLayerItem } from "../../models/BoxLayers";
import type { TechnicalDrillHole } from "../../core/types";
import { devLogger } from "../../utils/devLogger";
import { PanelFactory } from "./PanelFactory";
import { resolvePanelMaterialOptions } from "./BoxMaterialApplier";
import { applyDrillHolesToPanelGeometry } from "./DrillGeometryBuilder";

const DOOR_ANIMATION_DURATION_MS = 2000;
const doorOpenState = new Map<string, boolean>();
const doorRotationState = new Map<string, { x: number; y: number }>();
const doorAnimationRaf = new Map<string, number>();
const panelFactory = new PanelFactory({ resolvePanelMaterialOptions });

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

export type DoorSpec = {
  id: string;
  type: "door";
  groupType?: "simples" | "dupla";
  widthM: number;
  heightM: number;
  thicknessM: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
  openDirection: DoorLayerItem["openDirection"];
  hingeSide: DoorLayerItem["hingeSide"];
  pivot: DoorLayerItem["pivot"];
  isOpen: boolean;
  cornerDireitaV2Viewer?: boolean;
  cornerOrientation?: "direita" | "esquerda";
  viewerHingePivotXMm?: number;
};

export function buildDoorSpecs(items: DoorLayerItem[]): DoorSpec[] {
  return items.map((item) => ({
    id: item.id,
    type: "door",
    groupType: item.groupType,
    widthM: Math.max(0.001, item.width / 1000),
    heightM: Math.max(0.001, item.height / 1000),
    thicknessM: Math.max(0.001, item.thickness / 1000),
    x: (item.posX ?? 0) / 1000,
    y: (item.posY ?? 0) / 1000,
    z: (item.posZ ?? 0) / 1000,
    rotY: Number.isFinite(item.rotY) ? item.rotY : 0,
    openDirection: item.openDirection,
    hingeSide: item.hingeSide,
    pivot: item.pivot,
    isOpen: Boolean(item.isOpen),
    cornerDireitaV2Viewer: item.cornerDireitaV2Viewer,
    cornerOrientation: item.cornerOrientation,
    viewerHingePivotXMm: item.viewerHingePivotXMm,
  }));
}

export function getDoorSpecFingerprint(spec: DoorSpec, materialName?: string): string {
  return JSON.stringify({
    id: spec.id,
    widthM: spec.widthM,
    heightM: spec.heightM,
    thicknessM: spec.thicknessM,
    x: spec.x,
    y: spec.y,
    z: spec.z,
    rotY: spec.rotY,
    openDirection: spec.openDirection,
    hingeSide: spec.hingeSide,
    pivot: spec.pivot,
    isOpen: spec.isOpen,
    groupType: spec.groupType,
    material: materialName ?? getDefaultOfficialMaterial().canonicalId,
  });
}

export function mapDoorHolesByHingeSide(
  holes: TechnicalDrillHole[] | undefined,
  doorWidthM: number,
  hingeSide: "left" | "right"
): TechnicalDrillHole[] {
  if (!holes?.length) return [];
  const doorWidthMm = Math.max(0, doorWidthM * 1000);
  if (hingeSide === "right") {
    return holes.map((hole) => ({ ...hole, face: "tras" }));
  }
  return holes.map((hole) => ({
    ...hole,
    x: doorWidthMm - hole.x,
    face: "tras",
  }));
}

export function createDoorObject(spec: DoorSpec, material: THREE.Material, doorHoles?: TechnicalDrillHole[]): THREE.Object3D {
  const resolvedOpenDirection =
    spec.openDirection === "left" ||
    spec.openDirection === "right" ||
    spec.openDirection === "up" ||
    spec.openDirection === "down"
      ? spec.openDirection
      : "left";
  const resolvedHingeSide =
    spec.hingeSide === "left" || spec.hingeSide === "right"
      ? spec.hingeSide
      : spec.openDirection === "right"
        ? "right"
        : "left";
  /** Canto v2: dobradiças na FF; posX = borda da folha junto às dobradiças. */
  const isCornerV2Door =
    Boolean(spec.cornerDireitaV2Viewer) &&
    isCornerV2DoorViewer(spec.pivot, resolvedHingeSide);
  const cornerOrientation = spec.cornerOrientation === "esquerda" ? "esquerda" : "direita";
  const cornerDoorViewer = isCornerV2Door
    ? resolveCornerDoorTransformByOrientation({
        orientation: cornerOrientation,
        storedPivotEdgeXM: spec.x,
        hingePivotXM:
          spec.viewerHingePivotXMm != null && Number.isFinite(spec.viewerHingePivotXMm)
            ? spec.viewerHingePivotXMm / 1000
            : cornerOrientation === "esquerda"
              ? spec.x
              : spec.x - spec.widthM,
        pivotYM: spec.y,
        pivotZM: spec.z,
        widthM: spec.widthM,
        baseRotationY: spec.rotY ?? 0,
        isOpen: spec.isOpen,
        hingeSide: resolvedHingeSide === "right" ? "right" : "left",
      })
    : null;
  const holeMapSide =
    isCornerV2Door && resolvedHingeSide === "left" ? "right" : resolvedHingeSide;
  const effectiveDoorHoles = mapDoorHolesByHingeSide(doorHoles, spec.widthM, holeMapSide);

  const mesh = panelFactory.createPanel(
    spec.widthM,
    spec.heightM,
    spec.thicknessM,
    `door-leaf-${spec.id}`,
    "front",
    { singleMaterial: material }
  );
  if (effectiveDoorHoles.length > 0) {
    applyDrillHolesToPanelGeometry(mesh, "front", effectiveDoorHoles);
  }

  mesh.userData.doorLayerId = spec.id;
  mesh.userData.doorPart = "panel";

  const pivot = new THREE.Group();
  pivot.name = `door-layer-${spec.id}`;
  pivot.userData.doorLayerId = spec.id;
  pivot.userData.openDirection = resolvedOpenDirection;
  pivot.userData.hingeSide = resolvedHingeSide;
  pivot.userData.pivot = spec.pivot;
  pivot.userData.isOpen = spec.isOpen;

  const isVerticalOpening = resolvedOpenDirection === "up" || resolvedOpenDirection === "down";
  if (spec.pivot === "top-edge" || resolvedOpenDirection === "up") {
    mesh.position.set(0, -spec.heightM / 2, 0);
  } else if (spec.pivot === "bottom-edge" || resolvedOpenDirection === "down") {
    mesh.position.set(0, spec.heightM / 2, 0);
  } else if (isCornerV2Door && cornerDoorViewer) {
    mesh.position.set(cornerDoorViewer.meshOffsetXM, 0, 0);
  } else if (!isVerticalOpening && resolvedHingeSide === "right") {
    mesh.position.set(-spec.widthM / 2, 0, 0);
  } else if (!isVerticalOpening && resolvedHingeSide === "left") {
    mesh.position.set(spec.widthM / 2, 0, 0);
  } else {
    mesh.position.set(spec.openDirection === "left" ? spec.widthM / 2 : -spec.widthM / 2, 0, 0);
  }
  if (cornerDoorViewer) {
    pivot.position.set(cornerDoorViewer.pivotXM, cornerDoorViewer.pivotYM, cornerDoorViewer.pivotZM);
  } else {
    pivot.position.set(spec.x, spec.y, spec.z);
  }
  if (spec.rotY !== 0) pivot.rotation.y = spec.rotY;
  const baseRotationY = pivot.rotation.y;
  const baseRotationX = pivot.rotation.x;
  const targetRotation = {
    x:
      resolvedOpenDirection === "up"
        ? (spec.isOpen ? baseRotationX - Math.PI / 2 : baseRotationX)
        : resolvedOpenDirection === "down"
          ? (spec.isOpen ? baseRotationX + Math.PI / 2 : baseRotationX)
          : baseRotationX,
    y:
      resolvedOpenDirection === "left" || resolvedOpenDirection === "right"
        ? (spec.isOpen
            ? cornerDoorViewer
              ? cornerDoorViewer.rotationY
              : baseRotationY +
                (resolvedHingeSide === "right" ? 1 : -1) * (Math.PI / 2)
            : baseRotationY)
        : baseRotationY,
  };
  const prevIsOpen = doorOpenState.get(spec.id);
  const prevRotation = doorRotationState.get(spec.id);
  const startRotation = prevRotation ?? { x: baseRotationX, y: baseRotationY };
  const shouldAnimate = prevIsOpen === undefined ? spec.isOpen : prevIsOpen !== spec.isOpen;

  if (prevRotation) {
    pivot.rotation.x = startRotation.x;
    pivot.rotation.y = startRotation.y;
  }

  if (shouldAnimate) {
    const existingRaf = doorAnimationRaf.get(spec.id);
    if (existingRaf != null) cancelAnimationFrame(existingRaf);
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / DOOR_ANIMATION_DURATION_MS);
      const eased = easeInOutCubic(t);
      pivot.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * eased;
      pivot.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * eased;
      if (t < 1) {
        doorAnimationRaf.set(spec.id, requestAnimationFrame(animate));
      } else {
        doorAnimationRaf.delete(spec.id);
      }
    };
    doorAnimationRaf.set(spec.id, requestAnimationFrame(animate));
  } else {
    pivot.rotation.x = targetRotation.x;
    pivot.rotation.y = targetRotation.y;
  }

  doorOpenState.set(spec.id, spec.isOpen);
  doorRotationState.set(spec.id, targetRotation);
  mesh.userData.openDirection = resolvedOpenDirection;
  mesh.userData.hingeSide = resolvedHingeSide;
  mesh.userData.doorHolesEffective = effectiveDoorHoles;
  pivot.add(mesh);
  if (import.meta.env.DEV) {
    devLogger.debug("[BoxLayers][DoorFactory.createDoorObject] final", { id: spec.id });
  }
  return pivot;
}

const _sizeForDoorSpec = new THREE.Vector3();

export function getDoorSpecFromGroup(group: THREE.Group): DoorSpec | null {
  const id = group.userData?.doorLayerId as string | undefined;
  if (!id || typeof id !== "string") return null;
  const mesh = group.children.find((c) => c instanceof THREE.Mesh && (c as THREE.Mesh).geometry) as THREE.Mesh | undefined;
  if (!mesh?.geometry?.boundingBox) return null;
  mesh.geometry.computeBoundingBox();
  mesh.geometry.boundingBox.getSize(_sizeForDoorSpec);
  const openDirection = (group.userData?.openDirection as DoorSpec["openDirection"]) ?? "left";
  const hingeSide = (group.userData?.hingeSide as DoorSpec["hingeSide"]) ?? "left";
  const pivot = (group.userData?.pivot as DoorSpec["pivot"]) ?? "left-edge";
  const isOpen = Boolean(group.userData?.isOpen);
  return {
    id,
    type: "door",
    widthM: Math.max(0.001, _sizeForDoorSpec.x),
    heightM: Math.max(0.001, _sizeForDoorSpec.y),
    thicknessM: Math.max(0.001, _sizeForDoorSpec.z),
    x: group.position.x,
    y: group.position.y,
    z: group.position.z,
    rotY: group.rotation.y,
    openDirection,
    hingeSide,
    pivot,
    isOpen,
  };
}
