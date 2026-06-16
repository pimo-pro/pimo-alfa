/**
 * Unified Box Dimensions Overlay — medidas essenciais do conjunto de caixas.
 * Somente leitura visual (THREE.Line + sprites billboard); não altera o projeto.
 */

import * as THREE from "three";
import { worldMetersToLabelMm } from "../measurement/parametricDimensions";

const LINE_COLOR = 0x94a3b8;
const GAP_MIN_M = 0.02;
const FLOOR_TOLERANCE_M = 0.05;
const UPPER_MIN_Y_M = 1.0;
const TALL_HEIGHT_M = 1.5;
const DEPTH_TOLERANCE_M = 0.001;
const DIM_OFFSET_M = 0.1;
const TICK_M = 0.025;

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

export type DimensionsOverlayHandle = {
  group: THREE.Group;
  lineSegments: THREE.LineSegments;
  sprites: THREE.Sprite[];
  textures: THREE.CanvasTexture[];
};

type BoxClass = "lower" | "upper" | "vertical";

type DimAnnotation = {
  a: THREE.Vector3;
  b: THREE.Vector3;
  label: string;
};

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

/** Agrupa caixas e calcula medidas principais do conjunto. */
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
  const frontZ = total.maxZ + 0.02;

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
    gaps.push(...horizontalGaps(lowerBoxes, "Intervalo inferior", lower.minY - 0.04, frontZ));
  }
  if (upper) {
    gaps.push(...horizontalGaps(upperBoxes, "Intervalo superior", upper.maxY + 0.04, frontZ));
  }

  return {
    total,
    lower,
    upper,
    vertical,
    dominantDepthM,
    gaps,
  };
}

function pushHorizontalDim(
  out: DimAnnotation[],
  x1: number,
  x2: number,
  y: number,
  z: number,
  label: string
): void {
  out.push({
    a: new THREE.Vector3(x1, y, z),
    b: new THREE.Vector3(x2, y, z),
    label,
  });
}

function pushVerticalDim(
  out: DimAnnotation[],
  x: number,
  y1: number,
  y2: number,
  z: number,
  label: string
): void {
  out.push({
    a: new THREE.Vector3(x, y1, z),
    b: new THREE.Vector3(x, y2, z),
    label,
  });
}

function buildAnnotations(dims: UnifiedBoxDimensions, floorY: number): DimAnnotation[] {
  const out: DimAnnotation[] = [];
  const { total, lower, upper, vertical, dominantDepthM, gaps } = dims;
  const z = total.maxZ + 0.02;
  const leftX = total.minX - DIM_OFFSET_M;

  pushHorizontalDim(out, total.minX, total.maxX, total.maxY + DIM_OFFSET_M, z, `L total ${formatMm(total.width)}`);
  pushVerticalDim(out, leftX, total.minY, total.maxY, z, `A total ${formatMm(total.height)}`);

  if (dominantDepthM != null) {
    pushHorizontalDim(
      out,
      total.minZ,
      total.maxZ,
      total.minY + total.height * 0.5,
      total.minX - DIM_OFFSET_M * 1.6,
      `P ${formatMm(dominantDepthM)}`
    );
  }

  if (lower) {
    pushVerticalDim(out, lower.minX - DIM_OFFSET_M * 0.65, lower.minY, lower.maxY, z, `A inf. ${formatMm(lower.height)}`);
    pushHorizontalDim(out, lower.minX, lower.maxX, lower.minY - DIM_OFFSET_M * 0.55, z, `L inf. ${formatMm(lower.width)}`);
  }

  if (upper) {
    pushVerticalDim(out, upper.minX - DIM_OFFSET_M * 0.85, upper.minY, upper.maxY, z, `A sup. ${formatMm(upper.height)}`);
    pushHorizontalDim(out, upper.minX, upper.maxX, upper.maxY + DIM_OFFSET_M * 0.55, z, `L sup. ${formatMm(upper.width)}`);
    if (upper.minY > floorY + GAP_MIN_M) {
      pushVerticalDim(
        out,
        upper.maxX + DIM_OFFSET_M * 0.55,
        floorY,
        upper.minY,
        z,
        `Sup. ao chão ${formatMm(upper.minY - floorY)}`
      );
    }
  }

  if (vertical) {
    pushVerticalDim(
      out,
      vertical.maxX + DIM_OFFSET_M * 0.75,
      vertical.minY,
      vertical.maxY,
      z,
      `A vertical ${formatMm(vertical.height)}`
    );
  }

  for (const gap of gaps) {
    if (gap.start.y !== gap.end.y) {
      pushVerticalDim(out, gap.start.x, gap.start.y, gap.end.y, z, gap.label);
    } else if (gap.start.x !== gap.end.x) {
      pushHorizontalDim(out, gap.start.x, gap.end.x, gap.start.y, z, gap.label);
    }
  }

  return out;
}

function lineVerticesForAnnotation(ann: DimAnnotation): number[] {
  const { a, b } = ann;
  const verts: number[] = [];
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  const dz = Math.abs(b.z - a.z);
  const horizontal = dx >= dy && dx >= dz;
  const vertical = dy > dx && dy >= dz;

  verts.push(a.x, a.y, a.z, b.x, b.y, b.z);

  if (horizontal) {
    const y = a.y;
    verts.push(a.x, y - TICK_M, a.z, a.x, y + TICK_M, a.z);
    verts.push(b.x, y - TICK_M, b.z, b.x, y + TICK_M, b.z);
  } else if (vertical) {
    const x = a.x;
    verts.push(x - TICK_M, a.y, a.z, x + TICK_M, a.y, a.z);
    verts.push(x - TICK_M, b.y, b.z, x + TICK_M, b.y, b.z);
  } else {
    const z = a.z;
    verts.push(a.x, a.y, z - TICK_M, a.x, a.y, z + TICK_M);
    verts.push(b.x, b.y, z - TICK_M, b.x, b.y, z + TICK_M);
  }
  return verts;
}

function createTextSprite(text: string): { sprite: THREE.Sprite; texture: THREE.CanvasTexture } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const texture = new THREE.CanvasTexture(canvas);
    return { sprite: new THREE.Sprite(new THREE.SpriteMaterial({ map: texture })), texture };
  }
  const fontSize = 26;
  const font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.font = font;
  const padX = 10;
  const padY = 6;
  const textW = ctx.measureText(text).width;
  canvas.width = Math.ceil(textW + padX * 2);
  canvas.height = fontSize + padY * 2;
  ctx.font = font;
  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  const r = 4;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(0, 0, canvas.width, canvas.height, r);
  } else {
    ctx.rect(0, 0, canvas.width, canvas.height);
  }
  ctx.fill();
  ctx.fillStyle = "#e2e8f0";
  ctx.textBaseline = "middle";
  ctx.fillText(text, padX, canvas.height * 0.5);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 1000;
  sprite.userData.textWidth = canvas.width;
  sprite.userData.textHeight = canvas.height;
  return { sprite, texture };
}

function clearSprites(handle: DimensionsOverlayHandle): void {
  for (const sprite of handle.sprites) {
    handle.group.remove(sprite);
    (sprite.material as THREE.SpriteMaterial).map?.dispose();
    (sprite.material as THREE.Material).dispose();
  }
  for (const tex of handle.textures) tex.dispose();
  handle.sprites.length = 0;
  handle.textures.length = 0;
}

function labelPosition(ann: DimAnnotation): THREE.Vector3 {
  const mid = new THREE.Vector3().addVectors(ann.a, ann.b).multiplyScalar(0.5);
  const dx = Math.abs(ann.b.x - ann.a.x);
  const dy = Math.abs(ann.b.y - ann.a.y);
  if (dx >= dy) mid.y += 0.035;
  else mid.x -= 0.035;
  return mid;
}

/** Cria o grupo 3D do overlay na cena. */
export function createDimensionsOverlay(scene: THREE.Scene): DimensionsOverlayHandle {
  const group = new THREE.Group();
  group.name = "unifiedDimensionsOverlay";
  const mat = new THREE.LineBasicMaterial({
    color: LINE_COLOR,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
    depthWrite: false,
  });
  const geo = new THREE.BufferGeometry();
  const lineSegments = new THREE.LineSegments(geo, mat);
  lineSegments.renderOrder = 999;
  group.add(lineSegments);
  scene.add(group);
  return { group, lineSegments, sprites: [], textures: [] };
}

/** Atualiza linhas e rótulos com base nas medidas calculadas. */
export function updateDimensionsOverlay(
  handle: DimensionsOverlayHandle,
  dimensions: UnifiedBoxDimensions | null,
  camera: THREE.Camera
): void {
  if (!dimensions) {
    handle.group.visible = false;
    handle.lineSegments.visible = false;
    clearSprites(handle);
    return;
  }

  handle.group.visible = true;
  handle.lineSegments.visible = true;

  const floorY = dimensions.total.minY;
  const annotations = buildAnnotations(dimensions, floorY);
  const allVerts: number[] = [];
  for (const ann of annotations) {
    allVerts.push(...lineVerticesForAnnotation(ann));
  }

  const posAttr = new THREE.BufferAttribute(new Float32Array(allVerts), 3);
  handle.lineSegments.geometry.dispose();
  handle.lineSegments.geometry = new THREE.BufferGeometry();
  handle.lineSegments.geometry.setAttribute("position", posAttr);

  clearSprites(handle);
  for (const ann of annotations) {
    const { sprite, texture } = createTextSprite(ann.label);
    const pos = labelPosition(ann);
    sprite.position.copy(pos);
    handle.group.add(sprite);
    handle.sprites.push(sprite);
    handle.textures.push(texture);
  }

  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);
  for (const sprite of handle.sprites) {
    const dist = camPos.distanceTo(sprite.position);
    const aspect = (sprite.userData.textWidth as number) / (sprite.userData.textHeight as number);
    const h = dist * 0.00011;
    sprite.scale.set(h * aspect, h, 1);
    sprite.quaternion.copy(camera.quaternion);
  }
}

/** Remove o overlay da cena e liberta recursos GPU. */
export function disposeDimensionsOverlay(handle: DimensionsOverlayHandle, scene: THREE.Scene): void {
  clearSprites(handle);
  handle.lineSegments.geometry.dispose();
  (handle.lineSegments.material as THREE.Material).dispose();
  scene.remove(handle.group);
}
