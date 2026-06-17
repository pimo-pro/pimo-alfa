/**
 * Unified Box Dimensions Overlay — medidas essenciais do conjunto de caixas.
 * Linhas (THREE.LineSegments) + labels billboard (boxDimensionsText).
 */

import * as THREE from "three";
import { worldMetersToLabelMm } from "../measurement/parametricDimensions";
import {
  computePrintFriendlyLayout,
  type DimensionLayoutInput,
  type LabelLayoutItem,
  type PrintReadyDimensions,
  type ProjectWorldFn,
} from "./boxDimensionsLayout";
import {
  createDimensionLabel,
  disposeDimensionLabel,
  faceCamera,
  updateDimensionLabel,
  type DimensionLabel,
} from "./boxDimensionsText";

const LINE_COLOR = 0x94a3b8;
const LINE_RENDER_ORDER = 999;
const GAP_MIN_M = 0.02;
const FLOOR_TOLERANCE_M = 0.05;
const UPPER_MIN_Y_M = 1.0;
const TALL_HEIGHT_M = 1.5;
const DEPTH_TOLERANCE_M = 0.001;
const DIM_OFFSET_M = 0.1;

export type BoxBoundsInput = {
  id: string;
  min: THREE.Vector3;
  max: THREE.Vector3;
  cabinetType?: "lower" | "upper";
};

export type GroupBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  width: number;
  height: number;
  depth: number;
};

export type DimensionGap = {
  label: string;
  distanceM: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
};

export type UnifiedBoxDimensions = {
  total: GroupBounds;
  lower: GroupBounds | null;
  upper: GroupBounds | null;
  vertical: GroupBounds | null;
  dominantDepthM: number | null;
  gaps: DimensionGap[];
};

export type { PrintReadyDimensions, PrintReadyDimensionEntry } from "./boxDimensionsLayout";

export type DimensionOverlayDataEntry = {
  text: string;
  position: { x: number; y: number; z: number };
  valueMm: number;
  axis: "x" | "y" | "z";
};

export type DimensionsOverlayHandle = {
  group: THREE.Group;
  linesGroup: THREE.Group;
  labelsGroup: THREE.Group;
  lineSegments: THREE.LineSegments;
  labels: DimensionLabel[];
  overlayData: DimensionOverlayDataEntry[];
  printReady: PrintReadyDimensions | null;
  layoutItems: LabelLayoutItem[];
  lastSyncKey: string;
  lastStructureKey: string;
};

type BoxClass = "lower" | "upper" | "vertical";

const OFF_Y = new THREE.Vector3(0, 1, 0);
const OFF_Y_NEG = new THREE.Vector3(0, -1, 0);
const OFF_X_NEG = new THREE.Vector3(-1, 0, 0);
const OFF_X_POS = new THREE.Vector3(1, 0, 0);

function boundsFromBoxes(boxes: BoxBoundsInput[]): GroupBounds | null {
  if (!boxes.length) return null;
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const box of boxes) {
    min.min(box.min);
    max.max(box.max);
  }
  return {
    minX: min.x,
    maxX: max.x,
    minY: min.y,
    maxY: max.y,
    minZ: min.z,
    maxZ: max.z,
    width: max.x - min.x,
    height: max.y - min.y,
    depth: max.z - min.z,
  };
}

function classifyBox(box: BoxBoundsInput): BoxClass {
  const h = box.max.y - box.min.y;
  if (box.cabinetType === "upper") return "upper";
  if (box.cabinetType === "lower") return "lower";
  if (h >= TALL_HEIGHT_M && box.min.y <= FLOOR_TOLERANCE_M) return "vertical";
  if (box.min.y >= UPPER_MIN_Y_M) return "upper";
  if (box.max.y <= 1.05) return "lower";
  if (box.min.y <= FLOOR_TOLERANCE_M) return "lower";
  return "upper";
}

function horizontalGaps(boxes: BoxBoundsInput[], rowLabel: string, yMid: number, z: number): DimensionGap[] {
  if (boxes.length < 2) return [];
  const sorted = [...boxes].sort((a, b) => a.min.x - b.min.x);
  const gaps: DimensionGap[] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const left = sorted[i]!;
    const right = sorted[i + 1]!;
    const distanceM = right.min.x - left.max.x;
    if (distanceM < GAP_MIN_M) continue;
    gaps.push({
      label: `${rowLabel} ${formatMm(distanceM)}`,
      distanceM,
      start: new THREE.Vector3(left.max.x, yMid, z),
      end: new THREE.Vector3(right.min.x, yMid, z),
    });
  }
  return gaps;
}

function formatMm(m: number): string {
  return `${worldMetersToLabelMm(m)} mm`;
}

function pushLayoutDim(
  out: DimensionLayoutInput[],
  spec: Omit<DimensionLayoutInput, "featureStart" | "featureEnd"> & {
    fx1: number;
    fy1: number;
    fz1: number;
    fx2: number;
    fy2: number;
    fz2: number;
  }
): void {
  out.push({
    id: spec.id,
    featureStart: new THREE.Vector3(spec.fx1, spec.fy1, spec.fz1),
    featureEnd: new THREE.Vector3(spec.fx2, spec.fy2, spec.fz2),
    axis: spec.axis,
    text: spec.text,
    valueMm: spec.valueMm,
    dimLineOffsetM: spec.dimLineOffsetM,
    offsetDirection: spec.offsetDirection.clone(),
  });
}

function buildDimensionLayoutInputs(dims: UnifiedBoxDimensions, floorY: number): DimensionLayoutInput[] {
  const out: DimensionLayoutInput[] = [];
  const { total, lower, upper, vertical, dominantDepthM, gaps } = dims;
  const zFace = total.maxZ;
  const off = DIM_OFFSET_M;

  pushLayoutDim(out, {
    id: "total-width",
    fx1: total.minX,
    fy1: total.maxY,
    fz1: zFace,
    fx2: total.maxX,
    fy2: total.maxY,
    fz2: zFace,
    axis: "x",
    text: `L total ${formatMm(total.width)}`,
    valueMm: worldMetersToLabelMm(total.width),
    dimLineOffsetM: off,
    offsetDirection: OFF_Y,
  });

  pushLayoutDim(out, {
    id: "total-height",
    fx1: total.minX,
    fy1: total.minY,
    fz1: zFace,
    fx2: total.minX,
    fy2: total.maxY,
    fz2: zFace,
    axis: "y",
    text: `A total ${formatMm(total.height)}`,
    valueMm: worldMetersToLabelMm(total.height),
    dimLineOffsetM: off,
    offsetDirection: OFF_X_NEG,
  });

  if (dominantDepthM != null) {
    const yMid = total.minY + total.height * 0.5;
    pushLayoutDim(out, {
      id: "total-depth",
      fx1: total.minX,
      fy1: yMid,
      fz1: total.minZ,
      fx2: total.minX,
      fy2: yMid,
      fz2: total.maxZ,
      axis: "z",
      text: `P ${formatMm(dominantDepthM)}`,
      valueMm: worldMetersToLabelMm(dominantDepthM),
      dimLineOffsetM: off * 1.4,
      offsetDirection: OFF_X_NEG,
    });
  }

  if (lower) {
    pushLayoutDim(out, {
      id: "lower-height",
      fx1: lower.minX,
      fy1: lower.minY,
      fz1: zFace,
      fx2: lower.minX,
      fy2: lower.maxY,
      fz2: zFace,
      axis: "y",
      text: `A inf. ${formatMm(lower.height)}`,
      valueMm: worldMetersToLabelMm(lower.height),
      dimLineOffsetM: off * 0.75,
      offsetDirection: OFF_X_NEG,
    });
    pushLayoutDim(out, {
      id: "lower-width",
      fx1: lower.minX,
      fy1: lower.minY,
      fz1: zFace,
      fx2: lower.maxX,
      fy2: lower.minY,
      fz2: zFace,
      axis: "x",
      text: `L inf. ${formatMm(lower.width)}`,
      valueMm: worldMetersToLabelMm(lower.width),
      dimLineOffsetM: off * 0.65,
      offsetDirection: OFF_Y_NEG,
    });
  }

  if (upper) {
    pushLayoutDim(out, {
      id: "upper-height",
      fx1: upper.minX,
      fy1: upper.minY,
      fz1: zFace,
      fx2: upper.minX,
      fy2: upper.maxY,
      fz2: zFace,
      axis: "y",
      text: `A sup. ${formatMm(upper.height)}`,
      valueMm: worldMetersToLabelMm(upper.height),
      dimLineOffsetM: off * 0.85,
      offsetDirection: OFF_X_NEG,
    });
    pushLayoutDim(out, {
      id: "upper-width",
      fx1: upper.minX,
      fy1: upper.maxY,
      fz1: zFace,
      fx2: upper.maxX,
      fy2: upper.maxY,
      fz2: zFace,
      axis: "x",
      text: `L sup. ${formatMm(upper.width)}`,
      valueMm: worldMetersToLabelMm(upper.width),
      dimLineOffsetM: off * 0.65,
      offsetDirection: OFF_Y,
    });
    if (upper.minY > floorY + GAP_MIN_M) {
      pushLayoutDim(out, {
        id: "upper-floor",
        fx1: upper.maxX,
        fy1: floorY,
        fz1: zFace,
        fx2: upper.maxX,
        fy2: upper.minY,
        fz2: zFace,
        axis: "y",
        text: `Sup. ao chão ${formatMm(upper.minY - floorY)}`,
        valueMm: worldMetersToLabelMm(upper.minY - floorY),
        dimLineOffsetM: off * 0.65,
        offsetDirection: OFF_X_POS,
      });
    }
  }

  if (vertical) {
    pushLayoutDim(out, {
      id: "vertical-height",
      fx1: vertical.maxX,
      fy1: vertical.minY,
      fz1: zFace,
      fx2: vertical.maxX,
      fy2: vertical.maxY,
      fz2: zFace,
      axis: "y",
      text: `A vertical ${formatMm(vertical.height)}`,
      valueMm: worldMetersToLabelMm(vertical.height),
      dimLineOffsetM: off * 0.85,
      offsetDirection: OFF_X_POS,
    });
  }

  let gapIdx = 0;
  for (const gap of gaps) {
    if (gap.start.y !== gap.end.y) {
      pushLayoutDim(out, {
        id: `gap-v-${gapIdx}`,
        fx1: gap.start.x,
        fy1: gap.start.y,
        fz1: zFace,
        fx2: gap.end.x,
        fy2: gap.end.y,
        fz2: zFace,
        axis: "y",
        text: gap.label,
        valueMm: worldMetersToLabelMm(gap.distanceM),
        dimLineOffsetM: off * 0.5,
        offsetDirection: OFF_X_POS,
      });
    } else if (gap.start.x !== gap.end.x) {
      const y = gap.start.y;
      pushLayoutDim(out, {
        id: `gap-h-${gapIdx}`,
        fx1: gap.start.x,
        fy1: y,
        fz1: zFace,
        fx2: gap.end.x,
        fy2: y,
        fz2: zFace,
        axis: "x",
        text: gap.label,
        valueMm: worldMetersToLabelMm(gap.distanceM),
        dimLineOffsetM: off * 0.45,
        offsetDirection: y < total.minY + total.height * 0.5 ? OFF_Y_NEG : OFF_Y,
      });
    }
    gapIdx += 1;
  }

  return out;
}

function layoutSyncKey(inputs: DimensionLayoutInput[]): string {
  return inputs.map((i) => `${i.id}|${i.valueMm}|${i.featureStart.x.toFixed(3)}`).join(";");
}

function syncLabelsFromLayout(
  handle: DimensionsOverlayHandle,
  items: LabelLayoutItem[],
  structureKey: string,
  camera: THREE.Camera,
  viewportHeightPx: number
): void {
  const structureChanged = structureKey !== handle.lastStructureKey;

  if (structureChanged) {
    while (handle.labels.length > items.length) {
      const removed = handle.labels.pop();
      if (removed) disposeDimensionLabel(removed);
    }

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]!;
      const existing = handle.labels[i];
      if (existing) {
        updateDimensionLabel(
          existing,
          item.text,
          item.anchorWorld,
          camera,
          viewportHeightPx,
          item.screenOffsetPx
        );
      } else {
        const label = createDimensionLabel(item.text, item.anchorWorld, item.screenOffsetPx);
        handle.labelsGroup.add(label.sprite);
        handle.labels.push(label);
        faceCamera(label, camera, viewportHeightPx);
      }
    }
    handle.lastStructureKey = structureKey;
  }

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!;
    const label = handle.labels[i];
    if (!label) continue;
    label.basePosition.copy(item.anchorWorld);
    label.screenOffsetPx.copy(item.screenOffsetPx);
    faceCamera(label, camera, viewportHeightPx);
  }

  handle.layoutItems = items;
  handle.overlayData = items.map((item) => ({
    text: item.text,
    position: { x: item.anchorWorld.x, y: item.anchorWorld.y, z: item.anchorWorld.z },
    valueMm: item.valueMm,
    axis: item.axis,
  }));
}

export function computeUnifiedBoxDimensions(boxes: readonly BoxBoundsInput[]): UnifiedBoxDimensions | null {
  if (!boxes.length) return null;

  const lowerBoxes: BoxBoundsInput[] = [];
  const upperBoxes: BoxBoundsInput[] = [];
  const verticalBoxes: BoxBoundsInput[] = [];

  for (const box of boxes) {
    const kind = classifyBox(box);
    if (kind === "vertical") verticalBoxes.push(box);
    else if (kind === "upper") upperBoxes.push(box);
    else lowerBoxes.push(box);
  }

  const total = boundsFromBoxes([...boxes]);
  if (!total) return null;

  const lower = boundsFromBoxes(lowerBoxes);
  const upper = boundsFromBoxes(upperBoxes);
  const vertical = boundsFromBoxes(verticalBoxes);

  const depths = boxes.map((b) => b.max.z - b.min.z);
  const firstDepth = depths[0] ?? 0;
  const allSameDepth = depths.every((d) => Math.abs(d - firstDepth) <= DEPTH_TOLERANCE_M);
  const dominantDepthM = allSameDepth ? firstDepth : null;

  const gaps: DimensionGap[] = [];
  const frontZ = total.maxZ;

  if (lower && upper && upper.minY > lower.maxY) {
    const gapM = upper.minY - lower.maxY;
    if (gapM >= GAP_MIN_M) {
      const x = (Math.max(lower.minX, upper.minX) + Math.min(lower.maxX, upper.maxX)) * 0.5;
      gaps.push({
        label: `Intervalo inf./sup. ${formatMm(gapM)}`,
        distanceM: gapM,
        start: new THREE.Vector3(x, lower.maxY, frontZ),
        end: new THREE.Vector3(x, upper.minY, frontZ),
      });
    }
  }

  if (lower) {
    gaps.push(...horizontalGaps(lowerBoxes, "Intervalo inferior", lower.minY, frontZ));
  }
  if (upper) {
    gaps.push(...horizontalGaps(upperBoxes, "Intervalo superior", upper.maxY, frontZ));
  }

  return { total, lower, upper, vertical, dominantDepthM, gaps };
}

function clearLabels(handle: DimensionsOverlayHandle): void {
  for (const label of handle.labels) {
    disposeDimensionLabel(label);
  }
  handle.labels.length = 0;
  handle.overlayData = [];
  handle.layoutItems = [];
  handle.printReady = null;
  handle.lastSyncKey = "";
  handle.lastStructureKey = "";
}

export function getDimensionsOverlayData(handle: DimensionsOverlayHandle): DimensionOverlayDataEntry[] {
  return handle.overlayData.map((entry) => ({
    text: entry.text,
    position: { ...entry.position },
    valueMm: entry.valueMm,
    axis: entry.axis,
  }));
}

export function getPrintReadyDimensions(handle: DimensionsOverlayHandle): PrintReadyDimensions {
  return (
    handle.printReady ?? {
      entries: [],
      generatedAt: Date.now(),
    }
  );
}

export function createDimensionsOverlay(scene: THREE.Scene): DimensionsOverlayHandle {
  const group = new THREE.Group();
  group.name = "unifiedDimensionsOverlay";
  group.frustumCulled = false;

  const linesGroup = new THREE.Group();
  linesGroup.name = "unifiedDimensionsLines";
  const labelsGroup = new THREE.Group();
  labelsGroup.name = "unifiedDimensionsLabels";

  const mat = new THREE.LineBasicMaterial({
    color: LINE_COLOR,
    transparent: true,
    opacity: 0.92,
    depthTest: false,
    depthWrite: false,
  });
  const geo = new THREE.BufferGeometry();
  const lineSegments = new THREE.LineSegments(geo, mat);
  lineSegments.renderOrder = LINE_RENDER_ORDER;
  lineSegments.frustumCulled = false;
  linesGroup.add(lineSegments);

  group.add(linesGroup);
  group.add(labelsGroup);
  scene.add(group);

  return {
    group,
    linesGroup,
    labelsGroup,
    lineSegments,
    labels: [],
    overlayData: [],
    printReady: null,
    layoutItems: [],
    lastSyncKey: "",
    lastStructureKey: "",
  };
}

export function updateDimensionsOverlay(
  handle: DimensionsOverlayHandle,
  dimensions: UnifiedBoxDimensions | null,
  camera: THREE.Camera,
  viewportHeightPx = 720,
  viewportWidthPx = 1280,
  project?: ProjectWorldFn
): void {
  if (!dimensions) {
    handle.group.visible = false;
    handle.lineSegments.visible = false;
    clearLabels(handle);
    return;
  }

  handle.group.visible = true;
  handle.lineSegments.visible = true;

  const layoutInputs = buildDimensionLayoutInputs(dimensions, dimensions.total.minY);
  const projectFn: ProjectWorldFn =
    project ??
    ((world) => {
      const p = world.clone().project(camera);
      if (p.z > 1) return null;
      const x = (p.x + 1) * 0.5 * viewportWidthPx;
      const y = (1 - p.y) * 0.5 * viewportHeightPx;
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    });

  const layout = computePrintFriendlyLayout(
    layoutInputs,
    camera,
    viewportWidthPx,
    viewportHeightPx,
    projectFn
  );

  const posAttr = new THREE.BufferAttribute(new Float32Array(layout.lineVertices), 3);
  handle.lineSegments.geometry.dispose();
  handle.lineSegments.geometry = new THREE.BufferGeometry();
  handle.lineSegments.geometry.setAttribute("position", posAttr);

  handle.printReady = layout.printReady;
  syncLabelsFromLayout(handle, layout.items, layoutSyncKey(layoutInputs), camera, viewportHeightPx);
}

export function disposeDimensionsOverlay(handle: DimensionsOverlayHandle, scene: THREE.Scene): void {
  clearLabels(handle);
  handle.lineSegments.geometry.dispose();
  (handle.lineSegments.material as THREE.Material).dispose();
  scene.remove(handle.group);
}
