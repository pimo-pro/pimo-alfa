import * as THREE from "three";
import { getDefaultOfficialMaterial } from "../../core/materials/materials.api";
import type { DrawerLayerItem } from "../../models/BoxLayers";
import { devLogger } from "../../utils/devLogger";
import { PanelFactory } from "./PanelFactory";
import { resolvePanelMaterialOptions } from "./BoxMaterialApplier";

const DRAWER_ANIMATION_DURATION_MS = 1500;
const drawerOpenState = new Map<string, boolean>();
const drawerPositionState = new Map<string, number>();
const drawerAnimationRaf = new Map<string, number>();
const panelFactory = new PanelFactory({ resolvePanelMaterialOptions });

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

export type DrawerSpec = {
  id: string;
  type: "drawer";
  widthM: number;
  heightM: number;
  depthM: number;
  frontThicknessM: number;
  bodyWidthM?: number;
  bodyHeightM?: number;
  bodyDepthM?: number;
  leftSideWidthM?: number;
  leftSideHeightM?: number;
  leftSideDepthM?: number;
  rightSideWidthM?: number;
  rightSideHeightM?: number;
  rightSideDepthM?: number;
  backWidthM?: number;
  backHeightM?: number;
  backThicknessM?: number;
  bottomWidthM?: number;
  bottomDepthM?: number;
  bottomThicknessM?: number;
  sideThicknessM?: number;
  frontPosX?: number;
  frontPosY?: number;
  frontPosZ?: number;
  leftSidePosX?: number;
  leftSidePosY?: number;
  leftSidePosZ?: number;
  rightSidePosX?: number;
  rightSidePosY?: number;
  rightSidePosZ?: number;
  bottomPosX?: number;
  bottomPosY?: number;
  bottomPosZ?: number;
  backPosX?: number;
  backPosY?: number;
  backPosZ?: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
  isOpen: boolean;
  pullDistanceM: number;
};

export function buildDrawerSpecs(items: DrawerLayerItem[]): DrawerSpec[] {
  return items.map((item) => ({
    id: item.id,
    type: "drawer",
    widthM: Math.max(0.001, item.width / 1000),
    heightM: Math.max(0.001, item.height / 1000),
    depthM: Math.max(0.001, item.depth / 1000),
    frontThicknessM: Math.max(0.001, item.frontThickness / 1000),
    bodyWidthM: item.bodyWidth ? Math.max(0.001, item.bodyWidth / 1000) : undefined,
    bodyHeightM: item.bodyHeight ? Math.max(0.001, item.bodyHeight / 1000) : undefined,
    bodyDepthM: item.bodyDepth ? Math.max(0.001, item.bodyDepth / 1000) : undefined,
    leftSideWidthM: item.leftSideWidth ? Math.max(0.001, item.leftSideWidth / 1000) : undefined,
    leftSideHeightM: item.leftSideHeight ? Math.max(0.001, item.leftSideHeight / 1000) : undefined,
    leftSideDepthM: item.leftSideDepth ? Math.max(0.001, item.leftSideDepth / 1000) : undefined,
    rightSideWidthM: item.rightSideWidth ? Math.max(0.001, item.rightSideWidth / 1000) : undefined,
    rightSideHeightM: item.rightSideHeight ? Math.max(0.001, item.rightSideHeight / 1000) : undefined,
    rightSideDepthM: item.rightSideDepth ? Math.max(0.001, item.rightSideDepth / 1000) : undefined,
    backWidthM: item.backWidth ? Math.max(0.001, item.backWidth / 1000) : undefined,
    backHeightM: item.backHeight ? Math.max(0.001, item.backHeight / 1000) : undefined,
    backThicknessM: item.backThickness ? Math.max(0.001, item.backThickness / 1000) : undefined,
    bottomWidthM: item.bottomWidth ? Math.max(0.001, item.bottomWidth / 1000) : undefined,
    bottomDepthM: item.bottomDepth ? Math.max(0.001, item.bottomDepth / 1000) : undefined,
    bottomThicknessM: item.bottomThickness ? Math.max(0.001, item.bottomThickness / 1000) : undefined,
    frontPosX: Number.isFinite(item.frontPosX) ? (item.frontPosX as number) / 1000 : undefined,
    frontPosY: Number.isFinite(item.frontPosY) ? (item.frontPosY as number) / 1000 : undefined,
    frontPosZ: Number.isFinite(item.frontPosZ) ? (item.frontPosZ as number) / 1000 : undefined,
    leftSidePosX: Number.isFinite(item.leftSidePosX) ? (item.leftSidePosX as number) / 1000 : undefined,
    leftSidePosY: Number.isFinite(item.leftSidePosY) ? (item.leftSidePosY as number) / 1000 : undefined,
    leftSidePosZ: Number.isFinite(item.leftSidePosZ) ? (item.leftSidePosZ as number) / 1000 : undefined,
    rightSidePosX: Number.isFinite(item.rightSidePosX) ? (item.rightSidePosX as number) / 1000 : undefined,
    rightSidePosY: Number.isFinite(item.rightSidePosY) ? (item.rightSidePosY as number) / 1000 : undefined,
    rightSidePosZ: Number.isFinite(item.rightSidePosZ) ? (item.rightSidePosZ as number) / 1000 : undefined,
    bottomPosX: Number.isFinite(item.bottomPosX) ? (item.bottomPosX as number) / 1000 : undefined,
    bottomPosY: Number.isFinite(item.bottomPosY) ? (item.bottomPosY as number) / 1000 : undefined,
    bottomPosZ: Number.isFinite(item.bottomPosZ) ? (item.bottomPosZ as number) / 1000 : undefined,
    backPosX: Number.isFinite(item.backPosX) ? (item.backPosX as number) / 1000 : undefined,
    backPosY: Number.isFinite(item.backPosY) ? (item.backPosY as number) / 1000 : undefined,
    backPosZ: Number.isFinite(item.backPosZ) ? (item.backPosZ as number) / 1000 : undefined,
    sideThicknessM: item.sideThickness ? Math.max(0.001, item.sideThickness / 1000) : undefined,
    x: (item.posX ?? 0) / 1000,
    y: (item.posY ?? 0) / 1000,
    z: (item.posZ ?? 0) / 1000,
    rotY: Number.isFinite(item.rotY) ? item.rotY : 0,
    isOpen: Boolean(item.isOpen),
    pullDistanceM: Math.max(0, (item.pullDistanceMm ?? 0) / 1000),
  }));
}

export function getDrawerSpecFingerprint(spec: DrawerSpec, materialName?: string): string {
  return JSON.stringify({
    id: spec.id,
    widthM: spec.widthM,
    heightM: spec.heightM,
    depthM: spec.depthM,
    frontThicknessM: spec.frontThicknessM,
    x: spec.x,
    y: spec.y,
    z: spec.z,
    rotY: spec.rotY,
    isOpen: spec.isOpen,
    pullDistanceM: spec.pullDistanceM,
    material: materialName ?? getDefaultOfficialMaterial().canonicalId,
  });
}

export function createDrawerObject(spec: DrawerSpec, material: THREE.Material): THREE.Object3D {
  const group = new THREE.Group();
  group.name = `drawer-layer-${spec.id}`;
  group.position.set(spec.x, spec.y, spec.z);
  if (spec.rotY !== 0) group.rotation.y = spec.rotY;

  const drawerGroup = new THREE.Group();
  drawerGroup.name = `drawer-body-${spec.id}`;

  const targetPullOffset = spec.isOpen ? spec.pullDistanceM : 0;
  const prevIsOpen = drawerOpenState.get(spec.id);
  const prevPosition = drawerPositionState.get(spec.id);
  const startPosition = Number.isFinite(prevPosition) ? (prevPosition as number) : 0;
  const shouldAnimate = prevIsOpen === undefined ? spec.isOpen : prevIsOpen !== spec.isOpen;

  drawerGroup.position.set(0, 0, Number.isFinite(prevPosition) ? startPosition : targetPullOffset);
  if (shouldAnimate) {
    const existingRaf = drawerAnimationRaf.get(spec.id);
    if (existingRaf != null) cancelAnimationFrame(existingRaf);
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / DRAWER_ANIMATION_DURATION_MS);
      const eased = easeInOutCubic(t);
      drawerGroup.position.z = startPosition + (targetPullOffset - startPosition) * eased;
      if (t < 1) drawerAnimationRaf.set(spec.id, requestAnimationFrame(animate));
      else drawerAnimationRaf.delete(spec.id);
    };
    drawerAnimationRaf.set(spec.id, requestAnimationFrame(animate));
  }

  drawerOpenState.set(spec.id, spec.isOpen);
  drawerPositionState.set(spec.id, drawerGroup.position.z);
  drawerGroup.userData.drawerLayerId = spec.id;
  drawerGroup.userData.drawerPart = "body";

  const front = panelFactory.createPanel(
    spec.widthM,
    spec.heightM,
    spec.frontThicknessM,
    `drawer-front-${spec.id}`,
    "front",
    { singleMaterial: material }
  );
  if (Number.isFinite(spec.frontPosX) && Number.isFinite(spec.frontPosY) && Number.isFinite(spec.frontPosZ)) {
    front.position.set(spec.frontPosX as number, spec.frontPosY as number, spec.frontPosZ as number);
  } else {
    front.position.set(0, 0, spec.frontThicknessM / 2);
  }
  front.userData.drawerLayerId = spec.id;
  front.userData.drawerPart = "front";
  drawerGroup.add(front);

  if (spec.bodyWidthM && spec.bodyHeightM && spec.bodyDepthM) {
    const bodyOffsetZ = -(spec.bodyDepthM / 2 + spec.frontThicknessM);
    if (spec.leftSideWidthM && spec.leftSideHeightM && spec.leftSideDepthM) {
      const leftSide = panelFactory.createPanel(spec.leftSideWidthM, spec.leftSideHeightM, spec.leftSideDepthM, `drawer-left-${spec.id}`, "left", { singleMaterial: material });
      leftSide.position.set(
        Number.isFinite(spec.leftSidePosX) ? (spec.leftSidePosX as number) : -spec.bodyWidthM / 2 + spec.leftSideWidthM / 2,
        Number.isFinite(spec.leftSidePosY) ? (spec.leftSidePosY as number) : 0,
        Number.isFinite(spec.leftSidePosZ) ? (spec.leftSidePosZ as number) : bodyOffsetZ
      );
      leftSide.userData.drawerPart = "left-side";
      leftSide.userData.drawerLayerId = spec.id;
      drawerGroup.add(leftSide);
    }
    if (spec.rightSideWidthM && spec.rightSideHeightM && spec.rightSideDepthM) {
      const rightSide = panelFactory.createPanel(spec.rightSideWidthM, spec.rightSideHeightM, spec.rightSideDepthM, `drawer-right-${spec.id}`, "right", { singleMaterial: material });
      rightSide.position.set(
        Number.isFinite(spec.rightSidePosX) ? (spec.rightSidePosX as number) : spec.bodyWidthM / 2 - spec.rightSideWidthM / 2,
        Number.isFinite(spec.rightSidePosY) ? (spec.rightSidePosY as number) : 0,
        Number.isFinite(spec.rightSidePosZ) ? (spec.rightSidePosZ as number) : bodyOffsetZ
      );
      rightSide.userData.drawerPart = "right-side";
      rightSide.userData.drawerLayerId = spec.id;
      drawerGroup.add(rightSide);
    }
    if (spec.bottomWidthM && spec.bottomDepthM && spec.bottomThicknessM) {
      const bottom = panelFactory.createPanel(spec.bottomWidthM, spec.bottomThicknessM, spec.bottomDepthM, `drawer-bottom-${spec.id}`, "bottom", { singleMaterial: material });
      bottom.position.set(
        Number.isFinite(spec.bottomPosX) ? (spec.bottomPosX as number) : 0,
        Number.isFinite(spec.bottomPosY) ? (spec.bottomPosY as number) : -spec.bodyHeightM / 2 + spec.bottomThicknessM / 2,
        Number.isFinite(spec.bottomPosZ) ? (spec.bottomPosZ as number) : bodyOffsetZ
      );
      bottom.userData.drawerPart = "bottom";
      bottom.userData.drawerLayerId = spec.id;
      drawerGroup.add(bottom);
    }
    if (spec.backWidthM && spec.backHeightM && spec.backThicknessM) {
      const back = panelFactory.createPanel(spec.backWidthM, spec.backHeightM, spec.backThicknessM, `drawer-back-${spec.id}`, "back", { singleMaterial: material });
      back.position.set(
        Number.isFinite(spec.backPosX) ? (spec.backPosX as number) : 0,
        Number.isFinite(spec.backPosY) ? (spec.backPosY as number) : 0,
        Number.isFinite(spec.backPosZ) ? (spec.backPosZ as number) : bodyOffsetZ - spec.bodyDepthM / 2 + spec.backThicknessM / 2
      );
      back.userData.drawerPart = "back";
      back.userData.drawerLayerId = spec.id;
      drawerGroup.add(back);
    }
  }

  group.add(drawerGroup);
  if (import.meta.env.DEV) devLogger.debug("[BoxLayers][DrawerFactory.createDrawerObject] final", { id: spec.id });
  return group;
}
