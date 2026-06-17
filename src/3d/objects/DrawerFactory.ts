import * as THREE from "three";
import { getDefaultOfficialMaterial } from "../../core/materials/materials.api";
import type { DrawerLayerItem } from "../../models/BoxLayers";
import { devLogger } from "../../utils/devLogger";
import { PanelFactory } from "./PanelFactory";
import { resolvePanelMaterialOptions } from "./BoxMaterialApplier";
import {
  computeDrawerPieceCorredicaHoles,
  getDrawerSlideDrillingRules,
} from "../../core/drawers/drilling/DrawerDrillingRules";
import {
  resolveDrawerAnimationDurationMs,
  resolveDrawerMotionCurve,
} from "../../core/drawers/DrawerMotionCurves";

const drawerOpenState = new Map<string, boolean>();
const drawerPositionState = new Map<string, number>();
const drawerAnimationRaf = new Map<string, number>();
const panelFactory = new PanelFactory({ resolvePanelMaterialOptions });

export type BuildDrawerSpecsOptions = {
  showDrillingMarkers?: boolean;
};

function metalBoxColor(metalBoxType?: string): number {
  switch (metalBoxType) {
    case "Blum Legrabox":
      return 0xb8c2cc;
    case "Blum Antaro":
      return 0x9aa8b8;
    case "Hettich AvanTech":
      return 0xa3adb8;
    case "Hafele Alto":
      return 0x8f9baa;
    default:
      return 0x9ca3af;
  }
}

function shouldShowGenericSlideRails(slideType?: string): boolean {
  const hidden = new Set(["Blum Tandem", "Blum Movento", "Hettich InnoTech", "Hettich ArciTech"]);
  return !hidden.has(slideType ?? "Genérica");
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
  handleType?: DrawerLayerItem["handleType"];
  handlePosition?: DrawerLayerItem["handlePosition"];
  handleOffsetM?: number;
  slideType?: DrawerLayerItem["slideType"];
  metalBoxType?: DrawerLayerItem["metalBoxType"];
  softClose?: boolean;
  showDrillingMarkers?: boolean;
};

export function buildDrawerSpecs(
  items: DrawerLayerItem[],
  options: BuildDrawerSpecsOptions = {}
): DrawerSpec[] {
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
    handleType: item.handleType ?? "Nenhum",
    handlePosition: item.handlePosition ?? "Centro",
    handleOffsetM: (item.handleOffsetMm ?? 0) / 1000,
    slideType: item.slideType ?? "Genérica",
    metalBoxType: item.metalBoxType ?? "Nenhuma",
    softClose: Boolean(item.softClose),
    showDrillingMarkers: options.showDrillingMarkers === true,
  }));
}

export function getDrawerSpecFingerprint(spec: DrawerSpec, materialName?: string): string {
  return JSON.stringify({
    id: spec.id,
    widthM: spec.widthM,
    heightM: spec.heightM,
    depthM: spec.depthM,
    frontThicknessM: spec.frontThicknessM,
    bodyWidthM: spec.bodyWidthM,
    bodyHeightM: spec.bodyHeightM,
    bodyDepthM: spec.bodyDepthM,
    leftSideWidthM: spec.leftSideWidthM,
    leftSideHeightM: spec.leftSideHeightM,
    leftSideDepthM: spec.leftSideDepthM,
    rightSideWidthM: spec.rightSideWidthM,
    rightSideHeightM: spec.rightSideHeightM,
    rightSideDepthM: spec.rightSideDepthM,
    backWidthM: spec.backWidthM,
    backHeightM: spec.backHeightM,
    backThicknessM: spec.backThicknessM,
    bottomWidthM: spec.bottomWidthM,
    bottomDepthM: spec.bottomDepthM,
    bottomThicknessM: spec.bottomThicknessM,
    frontPosX: spec.frontPosX,
    frontPosY: spec.frontPosY,
    frontPosZ: spec.frontPosZ,
    leftSidePosX: spec.leftSidePosX,
    leftSidePosY: spec.leftSidePosY,
    leftSidePosZ: spec.leftSidePosZ,
    rightSidePosX: spec.rightSidePosX,
    rightSidePosY: spec.rightSidePosY,
    rightSidePosZ: spec.rightSidePosZ,
    bottomPosX: spec.bottomPosX,
    bottomPosY: spec.bottomPosY,
    bottomPosZ: spec.bottomPosZ,
    backPosX: spec.backPosX,
    backPosY: spec.backPosY,
    backPosZ: spec.backPosZ,
    x: spec.x,
    y: spec.y,
    z: spec.z,
    rotY: spec.rotY,
    isOpen: spec.isOpen,
    pullDistanceM: spec.pullDistanceM,
    handleType: spec.handleType,
    handlePosition: spec.handlePosition,
    handleOffsetM: spec.handleOffsetM,
    slideType: spec.slideType,
    metalBoxType: spec.metalBoxType,
    softClose: spec.softClose,
    showDrillingMarkers: spec.showDrillingMarkers,
    material: materialName ?? getDefaultOfficialMaterial().canonicalId,
  });
}

export function createDrawerObject(spec: DrawerSpec, material: THREE.Material): THREE.Object3D {
  const group = new THREE.Group();
  group.name = `drawer-layer-${spec.id}`;
  group.userData.drawerLayerId = spec.id;
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
    const durationMs = resolveDrawerAnimationDurationMs(spec.slideType, spec.softClose);
    const easing = resolveDrawerMotionCurve(spec.slideType, spec.softClose);
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easing(t);
      drawerGroup.position.z = startPosition + (targetPullOffset - startPosition) * eased;
      drawerPositionState.set(spec.id, drawerGroup.position.z);
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
    front.position.set(0, 0, 0);
  }
  front.userData.drawerLayerId = spec.id;
  front.userData.drawerPart = "front";
  drawerGroup.add(front);

  if (spec.handleType && spec.handleType !== "Nenhum") {
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: spec.handleType === "Cava" ? 0x111827 : 0xb6bcc6,
      roughness: 0.45,
      metalness: spec.handleType === "Perfil Alumínio" || spec.handleType === "Puxador" ? 0.6 : 0.1,
    });
    const handleWidth = Math.max(0.08, Math.min(spec.widthM * 0.55, 0.28));
    const handleHeight = spec.handleType === "Cava" ? 0.012 : 0.024;
    const handleDepth = spec.handleType === "Cava" ? 0.006 : 0.026;
    const handle = panelFactory.createPanel(
      handleWidth,
      handleHeight,
      handleDepth,
      `drawer-handle-${spec.id}`,
      "front",
      { singleMaterial: handleMaterial }
    );
    const yBase =
      spec.handlePosition === "Topo"
        ? spec.heightM / 2 - handleHeight * 1.5
        : spec.handlePosition === "Inferior"
          ? -spec.heightM / 2 + handleHeight * 1.5
          : 0;
    handle.position.set(0, yBase + (spec.handleOffsetM ?? 0), spec.frontThicknessM / 2 + handleDepth / 2);
    handle.userData.drawerLayerId = spec.id;
    handle.userData.drawerPart = "handle";
    drawerGroup.add(handle);
  }

  if (spec.bodyWidthM && spec.bodyHeightM && spec.bodyDepthM) {
    const bodyOffsetZ = -(spec.frontThicknessM / 2 + spec.bodyDepthM / 2);
    if (spec.metalBoxType && spec.metalBoxType !== "Nenhuma") {
      const metalMaterial = new THREE.MeshStandardMaterial({
        color: metalBoxColor(spec.metalBoxType),
        roughness: 0.28,
        metalness: 0.82,
      });
      const metalThicknessM = 0.012;
      const sideHeightM = Math.max(0.04, spec.bodyHeightM);
      const leftMetal = panelFactory.createPanel(metalThicknessM, sideHeightM, spec.bodyDepthM, `drawer-metal-left-${spec.id}`, "left", { singleMaterial: metalMaterial });
      leftMetal.position.set(-spec.bodyWidthM / 2 + metalThicknessM / 2, 0, bodyOffsetZ);
      leftMetal.userData.drawerPart = "metal-box";
      leftMetal.userData.drawerLayerId = spec.id;
      drawerGroup.add(leftMetal);
      const rightMetal = panelFactory.createPanel(metalThicknessM, sideHeightM, spec.bodyDepthM, `drawer-metal-right-${spec.id}`, "right", { singleMaterial: metalMaterial });
      rightMetal.position.set(spec.bodyWidthM / 2 - metalThicknessM / 2, 0, bodyOffsetZ);
      rightMetal.userData.drawerPart = "metal-box";
      rightMetal.userData.drawerLayerId = spec.id;
      drawerGroup.add(rightMetal);
      const backMetal = panelFactory.createPanel(spec.bodyWidthM, sideHeightM, metalThicknessM, `drawer-metal-back-${spec.id}`, "back", { singleMaterial: metalMaterial });
      backMetal.position.set(0, 0, -spec.frontThicknessM / 2 - spec.bodyDepthM + metalThicknessM / 2);
      backMetal.userData.drawerPart = "metal-box";
      backMetal.userData.drawerLayerId = spec.id;
      drawerGroup.add(backMetal);
      const bottomMetal = panelFactory.createPanel(spec.bodyWidthM, metalThicknessM, spec.bodyDepthM, `drawer-metal-bottom-${spec.id}`, "bottom", { singleMaterial: metalMaterial });
      bottomMetal.position.set(0, -sideHeightM / 2 + metalThicknessM / 2, bodyOffsetZ);
      bottomMetal.userData.drawerPart = "metal-box";
      bottomMetal.userData.drawerLayerId = spec.id;
      drawerGroup.add(bottomMetal);
    } else if (spec.leftSideWidthM && spec.leftSideHeightM && spec.leftSideDepthM) {
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

    if (shouldShowGenericSlideRails(spec.slideType) && spec.bodyWidthM && spec.bodyHeightM && spec.bodyDepthM) {
      const railMaterial = new THREE.MeshStandardMaterial({
        color: 0x6b7280,
        roughness: 0.5,
        metalness: 0.45,
      });
      const railW = 0.012;
      const railH = Math.max(0.03, spec.bodyHeightM * 0.85);
      const railD = spec.bodyDepthM;
      const bodyOffsetZ = -(spec.frontThicknessM / 2 + spec.bodyDepthM / 2);
      const leftRail = panelFactory.createPanel(railW, railH, railD, `drawer-rail-left-${spec.id}`, "left", {
        singleMaterial: railMaterial,
      });
      leftRail.position.set(-spec.bodyWidthM / 2 - railW / 2, 0, bodyOffsetZ);
      leftRail.userData.drawerPart = "slide-rail";
      drawerGroup.add(leftRail);
      const rightRail = panelFactory.createPanel(railW, railH, railD, `drawer-rail-right-${spec.id}`, "right", {
        singleMaterial: railMaterial,
      });
      rightRail.position.set(spec.bodyWidthM / 2 + railW / 2, 0, bodyOffsetZ);
      rightRail.userData.drawerPart = "slide-rail";
      drawerGroup.add(rightRail);
    }
  }

  if (spec.showDrillingMarkers && spec.bodyDepthM && spec.bodyHeightM) {
    const rules = getDrawerSlideDrillingRules(spec.slideType, spec.metalBoxType, {
      softClose: spec.softClose === true,
      mode: "drawer_piece",
    });
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x7f1d1d,
      roughness: 0.4,
      metalness: 0.1,
    });
    const pieceTypes = ["gaveta_lat_esq", "gaveta_frente", "gaveta_traseira"] as const;
    for (const pieceType of pieceTypes) {
      const larguraMm = pieceType === "gaveta_frente" ? spec.widthM * 1000 : (spec.bodyDepthM ?? spec.depthM) * 1000;
      const alturaMm = pieceType === "gaveta_frente" ? spec.heightM * 1000 : (spec.bodyHeightM ?? spec.heightM) * 1000;
      const holes = computeDrawerPieceCorredicaHoles({
        pieceType,
        largura: larguraMm,
        altura: alturaMm,
        rules,
      });
      for (const hole of holes) {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 8), markerMaterial);
        const x = (hole.x / 1000) - larguraMm / 2000;
        const y = alturaMm / 2000 - hole.y / 1000;
        const z =
          pieceType === "gaveta_frente"
            ? spec.frontThicknessM / 2
            : -(spec.frontThicknessM / 2 + (spec.bodyDepthM ?? spec.depthM) / 2) + hole.x / 1000;
        sphere.position.set(x, y, z);
        sphere.userData.drawerPart = "drill-marker";
        drawerGroup.add(sphere);
      }
    }
  }

  group.add(drawerGroup);
  if (import.meta.env.DEV) devLogger.debug("[BoxLayers][DrawerFactory.createDrawerObject] final", { id: spec.id });
  return group;
}
